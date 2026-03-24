"""Rotten Tomatoes scraper — extracts Tomatometer score from search page HTML."""

import re
import httpx

RT_SEARCH = "https://www.rottentomatoes.com/search"


async def get_tomatometer(title: str) -> int | None:
    """
    Search Rotten Tomatoes for `title` and return the Tomatometer score
    of the first matching result, or None if not found / request fails.

    Uses plain httpx (no browser). For more robust extraction, the
    Browser Agent can be used during verification.
    """
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            )
        }
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
            resp = await client.get(RT_SEARCH, params={"search": title}, headers=headers)
            if resp.status_code != 200:
                return None
            html = resp.text

        # Try to find score in search-page-media-row or similar structures
        # Pattern: look for tomatometer / score percentage near the title
        # RT usually renders something like  data-tomatometerscore="87"
        match = re.search(r'data-tomatometerscore="(\d+)"', html)
        if match:
            return int(match.group(1))

        # Fallback pattern: percentage near "tomatometer" text
        match = re.search(r'(\d{1,3})%', html)
        if match:
            score = int(match.group(1))
            if 0 <= score <= 100:
                return score

        return None
    except Exception:
        return None
