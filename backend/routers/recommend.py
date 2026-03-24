"""Recommendation endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import RecommendationOut
from services.engine import get_recommendation

router = APIRouter(prefix="/api", tags=["recommend"])


@router.get("/recommend", response_model=RecommendationOut)
async def recommend(
    profile_id: int,
    media_type: str = "any",
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single weighted-random recommendation.

    Query params:
      - profile_id: user profile ID from onboarding
      - media_type: "movie", "tv", "anime", or "any" (default)
    """
    return await get_recommendation(db, profile_id, media_type)
