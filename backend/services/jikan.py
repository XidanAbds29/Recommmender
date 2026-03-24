"""Jikan (MyAnimeList) API integration service for Anime."""

import time
import httpx

JIKAN_BASE = "https://api.jikan.moe/v4"

# Simple in-memory cache: key -> (timestamp, data)
_cache: dict[str, tuple[float, any]] = {}
_CACHE_TTL = 600  # 10 minutes


async def _get(path: str, params: dict | None = None) -> dict:
    """Make a GET request to Jikan with caching and rate-limit awareness."""
    cache_key = f"{path}|{params}"
    now = time.time()

    if cache_key in _cache:
        ts, data = _cache[cache_key]
        if now - ts < _CACHE_TTL:
            return data

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{JIKAN_BASE}{path}", params=params or {})
        if resp.status_code == 429:
            # Rate limited — wait and retry once
            await _sleep(1.5)
            resp = await client.get(f"{JIKAN_BASE}{path}", params=params or {})
        resp.raise_for_status()
        data = resp.json()

    _cache[cache_key] = (now, data)
    return data


async def _sleep(seconds: float):
    import asyncio
    await asyncio.sleep(seconds)


# ── Genres ────────────────────────────────────────────────────────────────────

async def get_anime_genres() -> list[dict]:
    """Returns list of {mal_id, name, count}."""
    data = await _get("/genres/anime")
    return data.get("data", [])


# ── Search / Discover ─────────────────────────────────────────────────────────

async def search_anime(
    genres: list[int] | None = None,
    page: int = 1,
    min_score: float = 0.0,
    query: str | None = None,
) -> list[dict]:
    """
    Search for anime.
    - If query is provided, search by title.
    - Otherwise, browse by genre filters.
    """
    params: dict = {"page": page, "order_by": "score", "sort": "desc", "sfw": "true"}

    if query:
        params["q"] = query
    if genres:
        params["genres"] = ",".join(str(g) for g in genres)
    if min_score > 0:
        params["min_score"] = min_score

    data = await _get("/anime", params)
    results = []
    for item in data.get("data", []):
        images = item.get("images", {}).get("jpg", {})
        results.append({
            "mal_id": item["mal_id"],
            "title": item.get("title", "Unknown"),
            "title_english": item.get("title_english"),
            "poster_url": images.get("large_image_url") or images.get("image_url"),
            "year": str(item.get("year", "")) if item.get("year") else "",
            "score": item.get("score"),
            "genres": [g["name"] for g in item.get("genres", [])],
            "synopsis": item.get("synopsis", ""),
        })
    return results


# ── Details ───────────────────────────────────────────────────────────────────

async def get_anime_details(mal_id: int) -> dict:
    """Get full details for a single anime."""
    data = await _get(f"/anime/{mal_id}")
    item = data.get("data", {})
    images = item.get("images", {}).get("jpg", {})

    return {
        "item_id": str(mal_id),
        "title": item.get("title", "Unknown"),
        "media_type": "anime",
        "year": str(item.get("year", "")) if item.get("year") else "",
        "poster_url": images.get("large_image_url") or images.get("image_url"),
        "overview": item.get("synopsis", ""),
        "genres": [g["name"] for g in item.get("genres", [])],
        "mal_score": item.get("score"),
    }
