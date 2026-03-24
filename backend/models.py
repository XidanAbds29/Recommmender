"""SQLAlchemy ORM models for Recommender."""

import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from database import Base
import enum


class MediaType(str, enum.Enum):
    MOVIE = "movie"
    TV = "tv"
    ANIME = "anime"


class FeedbackAction(str, enum.Enum):
    SEEN_IT = "seen_it"
    NOT_FOR_ME = "not_for_me"


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    genre_preferences = relationship("GenrePreference", back_populates="profile", cascade="all, delete-orphan")
    seed_titles = relationship("SeedTitle", back_populates="profile", cascade="all, delete-orphan")
    preferences = relationship("Preference", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="profile", cascade="all, delete-orphan")


class GenrePreference(Base):
    __tablename__ = "genre_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    genre_name = Column(String, nullable=False)
    genre_id = Column(Integer, nullable=True)  # TMDB/MAL genre ID
    media_type = Column(String, nullable=False)  # movie, tv, anime

    profile = relationship("UserProfile", back_populates="genre_preferences")


class SeedTitle(Base):
    __tablename__ = "seed_titles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    tmdb_id = Column(Integer, nullable=True)
    mal_id = Column(Integer, nullable=True)
    media_type = Column(String, nullable=False)

    profile = relationship("UserProfile", back_populates="seed_titles")


class Preference(Base):
    __tablename__ = "preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False, unique=True)
    rt_threshold = Column(Integer, default=75)
    surprise_factor = Column(Float, default=0.05)

    profile = relationship("UserProfile", back_populates="preferences")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    item_id = Column(String, nullable=False)  # tmdb_id or mal_id as string
    media_type = Column(String, nullable=False)
    action = Column(String, nullable=False)  # "seen_it" or "not_for_me"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("UserProfile", back_populates="feedbacks")
