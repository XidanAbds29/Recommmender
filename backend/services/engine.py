"""
Recommender Engine — weighted random selection with Chaos Factor.

Algorithm:
1. Fetch user's genre prefs & feedback history
2. Build candidate pool from TMDB (movies/tv) + Jikan (anime) concurrently
3. Deduplicate franchises (group "Part 1/2", seasons, sequels)
4. Filter out already-feedbacked items
5. Score each candidate with weighted formula
6. Roll chaos factor — if triggered, pick from outside user genres
7. Weighted random selection from scored pool
"""

import re
import random
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import GenrePreference, SeedTitle, Preference, Feedback
from services import tmdb, jikan, rt_scraper
from schemas import RecommendationOut


# ── Franchise Deduplication ───────────────────────────────────────────────────

_SEQUEL_PATTERN = re.compile(
    r"""
    \s*[:\-–—]\s*(?:part|chapter|volume|book|act)\s*\d+.*$|  # ": Part 2"
    \s*\(?(?:part|chapter|volume)\s*\d+\)?.*$|               # "(Part 1)"
    \s*(?:season|series)\s*\d+.*$|                           # "Season 3"
    \s*\d+(?:st|nd|rd|th)\s+season.*$|                       # "2nd Season"
    \s*(?:II|III|IV|V|VI|VII|VIII|IX|X)(?:\s|$).*$|          # Roman numerals
    \s+\d{1,2}$                                               # trailing number "3"
    """,
    re.IGNORECASE | re.VERBOSE,
)


def _normalize_title(title: str) -> str:
    """Strip sequel/season/part suffixes to get the core franchise name."""
    cleaned = _SEQUEL_PATTERN.sub("", title).strip()
    # If stripping removed everything, keep original
    return cleaned if cleaned else title


def _deduplicate_candidates(candidates: list[dict]) -> list[dict]:
    """Group candidates by franchise name and keep the highest-scored entry."""
    groups: dict[str, dict] = {}
    for c in candidates:
        key = _normalize_title(c["title"]).lower()
        existing = groups.get(key)
        if existing is None:
            groups[key] = c
        else:
            # Keep the one with a higher score
            new_score = (c.get("tmdb_score") or 0) + (c.get("mal_score") or 0)
            old_score = (existing.get("tmdb_score") or 0) + (existing.get("mal_score") or 0)
            if new_score > old_score:
                groups[key] = c
    return list(groups.values())


async def _fetch_tmdb_candidates(mt: str, genre_ids: list[int], page: int, excluded_ids: set[str]) -> list[dict]:
    candidates = []
    try:
        items = await tmdb.discover(
            media_type=mt,
            genre_ids=genre_ids if genre_ids else None,
            page=page,
            vote_avg_gte=5.0,
        )
        for item in items:
            item_id = str(item["id"])
            if item_id in excluded_ids:
                continue
            poster = (
                f"https://image.tmdb.org/t/p/w500{item['poster_path']}"
                if item.get("poster_path") else None
            )
            candidates.append({
                "item_id": item_id,
                "title": item.get("title", "Unknown"),
                "media_type": mt,
                "year": (item.get("release_date") or "")[:4],
                "poster_url": poster,
                "overview": item.get("overview", ""),
                "genres": [],  # filled below if needed
                "tmdb_score": item.get("vote_average"),
                "mal_score": None,
                "popularity": item.get("popularity", 0),
            })
    except Exception:
        pass
    return candidates


async def _fetch_jikan_candidates(genre_ids: list[int], page: int, excluded_ids: set[str]) -> list[dict]:
    candidates = []
    try:
        items = await jikan.search_anime(
            genres=genre_ids if genre_ids else None,
            page=page,
            min_score=5.0,
        )
        for item in items:
            item_id = str(item["mal_id"])
            if item_id in excluded_ids:
                continue
            candidates.append({
                "item_id": item_id,
                "title": item.get("title_english") or item.get("title", "Unknown"),
                "media_type": "anime",
                "year": str(item.get("year", "")),
                "poster_url": item.get("poster_url"),
                "overview": item.get("synopsis", ""),
                "genres": item.get("genres", []),
                "tmdb_score": None,
                "mal_score": item.get("score"),
                "popularity": 0,
            })
    except Exception:
        pass
    return candidates


async def get_recommendation(
    db: AsyncSession,
    profile_id: int,
    media_type_filter: str = "any",
) -> RecommendationOut:
    """Generate a single weighted-random recommendation for a profile."""

    # ── 1. Load user prefs ────────────────────────────────────────────────
    genre_rows = (
        await db.execute(
            select(GenrePreference).where(GenrePreference.profile_id == profile_id)
        )
    ).scalars().all()

    seed_rows = (
        await db.execute(
            select(SeedTitle).where(SeedTitle.profile_id == profile_id)
        )
    ).scalars().all()

    pref_row = (
        await db.execute(
            select(Preference).where(Preference.profile_id == profile_id)
        )
    ).scalar_one_or_none()

    rt_threshold = pref_row.rt_threshold if pref_row else 75
    chaos_factor = pref_row.surprise_factor if pref_row else 0.05

    # ── 2. Load feedback history (to exclude) ─────────────────────────────
    fb_rows = (
        await db.execute(
            select(Feedback).where(Feedback.profile_id == profile_id)
        )
    ).scalars().all()
    excluded_ids = {f.item_id for f in fb_rows}

    # ── 3. Determine if chaos roll triggers ───────────────────────────────
    is_chaos = random.random() < chaos_factor

    # ── 4. Build candidate pool ───────────────────────────────────────────
    candidates: list[dict] = []

    # Decide which media types to fetch
    types_to_fetch = []
    if media_type_filter == "any":
        types_to_fetch = list({g.media_type for g in genre_rows}) or ["movie", "tv", "anime"]
    else:
        types_to_fetch = [media_type_filter]

    # Genre IDs per media type
    user_genre_map: dict[str, list[int]] = {}
    for g in genre_rows:
        user_genre_map.setdefault(g.media_type, [])
        if g.genre_id:
            user_genre_map[g.media_type].append(g.genre_id)

    # Concurrently fetch all necessary types
    fetch_tasks = []
    for mt in types_to_fetch:
        if mt in ("movie", "tv"):
            genre_ids = user_genre_map.get(mt, [])
            if is_chaos:
                genre_ids = []
            page = random.randint(1, 5)
            fetch_tasks.append(_fetch_tmdb_candidates(mt, genre_ids, page, excluded_ids))
        elif mt == "anime":
            genre_ids = user_genre_map.get("anime", [])
            if is_chaos:
                genre_ids = []
            page = random.randint(1, 3)
            fetch_tasks.append(_fetch_jikan_candidates(genre_ids, page, excluded_ids))

    results = await asyncio.gather(*fetch_tasks, return_exceptions=True)
    for res in results:
        if isinstance(res, list):
            candidates.extend(res)

    # ── 3b. Deduplicate franchises ────────────────────────────────────────
    candidates = _deduplicate_candidates(candidates)

    if not candidates:
        return RecommendationOut(
            item_id="0",
            title="No recommendations found",
            media_type="movie",
            overview="Try broadening your genre preferences or lowering your score threshold.",
        )

    # ── 5. Score candidates ───────────────────────────────────────────────
    scored: list[tuple[dict, float]] = []
    max_popularity = max((c.get("popularity", 1) for c in candidates), default=1) or 1

    for c in candidates:
        tmdb_part = ((c.get("tmdb_score") or 0) / 10.0) * 0.4
        mal_part = ((c.get("mal_score") or 0) / 10.0) * 0.4 if c["media_type"] == "anime" else 0
        score_part = max(tmdb_part, mal_part)

        pop_part = (c.get("popularity", 0) / max_popularity) * 0.2

        user_genre_names = {g.genre_name.lower() for g in genre_rows}
        candidate_genres = {g.lower() for g in c.get("genres", [])}
        overlap = len(user_genre_names & candidate_genres)
        seed_part = min(overlap / max(len(user_genre_names), 1), 1.0) * 0.1

        jitter = random.uniform(0, 0.1)
        total = score_part + pop_part + seed_part + jitter
        scored.append((c, max(total, 0.01)))

    # ── 6. Weighted random pick ───────────────────────────────────────────
    items = [s[0] for s in scored]
    weights = [s[1] for s in scored]
    pick = random.choices(items, weights=weights, k=1)[0]

    # Best-effort RT score fetch (fast)
    rt_score = None
    try:
        # Wrapped in asyncio.wait_for with aggressive timeout
        rt_score = await asyncio.wait_for(rt_scraper.get_tomatometer(pick["title"]), timeout=1.5)
    except Exception:
        pass

    return RecommendationOut(
        item_id=pick["item_id"],
        title=pick["title"],
        media_type=pick["media_type"],
        year=pick.get("year"),
        poster_url=pick.get("poster_url"),
        overview=pick.get("overview"),
        genres=pick.get("genres", []),
        tmdb_score=pick.get("tmdb_score"),
        mal_score=pick.get("mal_score"),
        rt_score=rt_score,
        is_chaos=is_chaos,
    )
