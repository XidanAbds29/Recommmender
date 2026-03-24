"""TMDB API integration service for Movies and TV Shows."""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_KEY = os.getenv("TMDB_API_KEY", "")
IMG_BASE = "https://image.tmdb.org/t/p/w500"


async def _get(path: str, params: dict | None = None) -> dict:
    """Make an authenticated GET request to TMDB."""
    params = params or {}
    params["api_key"] = TMDB_KEY
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{TMDB_BASE}{path}", params=params)
        resp.raise_for_status()
        return resp.json()


# ── Genres ────────────────────────────────────────────────────────────────────

async def get_movie_genres() -> list[dict]:
    data = await _get("/genre/movie/list")
    return data.get("genres", [])


async def get_tv_genres() -> list[dict]:
    data = await _get("/genre/tv/list")
    return data.get("genres", [])


# ── Discover ──────────────────────────────────────────────────────────────────

async def discover(
    media_type: str = "movie",
    genre_ids: list[int] | None = None,
    page: int = 1,
    vote_avg_gte: float = 0.0,
) -> list[dict]:
    """
    Discover movies or TV shows, optionally filtered by genre and minimum vote average.
    Returns a list of result dicts with id, title, poster_path, genre_ids, vote_average, etc.
    """
    path = f"/discover/{media_type}"
    params: dict = {
        "sort_by": "popularity.desc",
        "page": page,
        "vote_average.gte": vote_avg_gte,
        "vote_count.gte": 50,  # avoid obscure un-rated titles
    }
    if genre_ids:
        params["with_genres"] = ",".join(str(g) for g in genre_ids)

    data = await _get(path, params)
    results = data.get("results", [])

    # Normalise: TV uses "name" instead of "title"
    for item in results:
        if "title" not in item:
            item["title"] = item.get("name", "Unknown")
        if "release_date" not in item:
            item["release_date"] = item.get("first_air_date", "")

    return results


# ── Details ───────────────────────────────────────────────────────────────────

async def get_details(media_type: str, tmdb_id: int) -> dict:
    """Get full details for a movie or TV show."""
    data = await _get(f"/{media_type}/{tmdb_id}")
    title = data.get("title") or data.get("name", "Unknown")
    genres = [g["name"] for g in data.get("genres", [])]
    poster = f"{IMG_BASE}{data['poster_path']}" if data.get("poster_path") else None
    year = (data.get("release_date") or data.get("first_air_date") or "")[:4]

    return {
        "item_id": str(tmdb_id),
        "title": title,
        "media_type": media_type,
        "year": year,
        "poster_url": poster,
        "overview": data.get("overview", ""),
        "genres": genres,
        "tmdb_score": data.get("vote_average"),
    }


# ── Search (for onboarding seed title lookup) ────────────────────────────────

async def search(query: str, media_type: str = "movie") -> list[dict]:
    """Search TMDB for movies or TV shows by title."""
    data = await _get(f"/search/{media_type}", {"query": query})
    results = []
    for item in data.get("results", [])[:10]:
        title = item.get("title") or item.get("name", "Unknown")
        poster = f"{IMG_BASE}{item['poster_path']}" if item.get("poster_path") else None
        year = (item.get("release_date") or item.get("first_air_date") or "")[:4]
        results.append({
            "tmdb_id": item["id"],
            "title": title,
            "poster_url": poster,
            "year": year,
            "media_type": media_type,
        })
    return results
