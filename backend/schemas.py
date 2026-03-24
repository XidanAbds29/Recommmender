"""Pydantic request/response schemas for Recommender API."""

from pydantic import BaseModel, Field
from typing import Optional


# ──────────────────────────── Profile / Onboarding ────────────────────────────

class GenreIn(BaseModel):
    genre_name: str
    genre_id: Optional[int] = None
    media_type: str  # "movie", "tv", "anime"


class SeedTitleIn(BaseModel):
    title: str
    tmdb_id: Optional[int] = None
    mal_id: Optional[int] = None
    media_type: str


class ProfileCreate(BaseModel):
    genres: list[GenreIn]
    seed_titles: list[SeedTitleIn] = Field(..., min_length=3, max_length=5)
    rt_threshold: int = Field(default=75, ge=0, le=100)
    surprise_factor: float = Field(default=0.05, ge=0.01, le=0.20)


class ProfileOut(BaseModel):
    profile_id: int


# ──────────────────────────── Recommendation ──────────────────────────────────

class RecommendationOut(BaseModel):
    item_id: str
    title: str
    media_type: str
    year: Optional[str] = None
    poster_url: Optional[str] = None
    overview: Optional[str] = None
    genres: list[str] = []
    tmdb_score: Optional[float] = None
    mal_score: Optional[float] = None
    rt_score: Optional[int] = None
    is_chaos: bool = False  # True if this was a wild-card chaos pick


# ──────────────────────────── Feedback ────────────────────────────────────────

class FeedbackIn(BaseModel):
    profile_id: int
    item_id: str
    media_type: str
    action: str  # "seen_it" or "not_for_me"


class FeedbackOut(BaseModel):
    id: int
    item_id: str
    media_type: str
    action: str
