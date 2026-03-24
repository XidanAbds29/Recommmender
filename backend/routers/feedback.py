"""Feedback endpoints — Seen It / Not For Me."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Feedback
from schemas import FeedbackIn, FeedbackOut

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post("/feedback", status_code=201)
async def submit_feedback(body: FeedbackIn, db: AsyncSession = Depends(get_db)):
    """Record user feedback for a recommended item."""
    fb = Feedback(
        profile_id=body.profile_id,
        item_id=body.item_id,
        media_type=body.media_type,
        action=body.action,
    )
    db.add(fb)
    await db.commit()
    return {"status": "ok"}


@router.get("/feedback", response_model=list[FeedbackOut])
async def get_feedback(profile_id: int, db: AsyncSession = Depends(get_db)):
    """Get all feedback entries for a profile."""
    rows = (
        await db.execute(
            select(Feedback).where(Feedback.profile_id == profile_id)
        )
    ).scalars().all()
    return [
        FeedbackOut(id=r.id, item_id=r.item_id, media_type=r.media_type, action=r.action)
        for r in rows
    ]
