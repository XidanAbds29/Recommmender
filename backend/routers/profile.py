"""Profile / onboarding endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import UserProfile, GenrePreference, SeedTitle, Preference
from schemas import ProfileCreate, ProfileOut
from services import tmdb, jikan

router = APIRouter(prefix="/api", tags=["profile"])


@router.post("/profile", response_model=ProfileOut, status_code=201)
async def create_profile(body: ProfileCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user profile from the onboarding survey."""
    profile = UserProfile()
    db.add(profile)
    await db.flush()  # get the auto-generated id

    # Genre preferences
    for g in body.genres:
        db.add(GenrePreference(
            profile_id=profile.id,
            genre_name=g.genre_name,
            genre_id=g.genre_id,
            media_type=g.media_type,
        ))

    # Seed titles
    for s in body.seed_titles:
        db.add(SeedTitle(
            profile_id=profile.id,
            title=s.title,
            tmdb_id=s.tmdb_id,
            mal_id=s.mal_id,
            media_type=s.media_type,
        ))

    # Preferences
    db.add(Preference(
        profile_id=profile.id,
        rt_threshold=body.rt_threshold,
        surprise_factor=body.surprise_factor,
    ))

    await db.commit()
    return ProfileOut(profile_id=profile.id)


@router.get("/genres")
async def list_genres():
    """Return all genres for Movies, TV, and Anime for the onboarding UI."""
    movie_genres = await tmdb.get_movie_genres()
    tv_genres = await tmdb.get_tv_genres()
    anime_genres = await jikan.get_anime_genres()

    return {
        "movie": [{"id": g["id"], "name": g["name"]} for g in movie_genres],
        "tv": [{"id": g["id"], "name": g["name"]} for g in tv_genres],
        "anime": [{"id": g["mal_id"], "name": g["name"]} for g in anime_genres],
    }


@router.get("/search")
async def search_titles(q: str, media_type: str = "movie"):
    """Search TMDB or Jikan for seed title lookup during onboarding."""
    if media_type == "anime":
        results = await jikan.search_anime(query=q)
        return [
            {
                "mal_id": r["mal_id"],
                "title": r.get("title_english") or r["title"],
                "poster_url": r.get("poster_url"),
                "year": r.get("year", ""),
                "media_type": "anime",
            }
            for r in results[:10]
        ]
    else:
        return await tmdb.search(q, media_type)
