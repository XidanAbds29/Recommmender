"""SQLAlchemy async engine and session factory for Recommender database."""

import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

# Prioritise SUPABASE_URL if provided, else fallback to local SQLite for development
_db_url = os.getenv("SUPABASE_URL") or os.getenv("DATABASE_URL")

if _db_url:
    # Ensure it uses the psycopg driver for Supabase pooler compatibility
    if _db_url.startswith("postgresql://"):
        _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif _db_url.startswith("postgresql+asyncpg://"):
        _db_url = _db_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
else:
    _db_url = "sqlite+aiosqlite:///recommender.db"

# Engine configuration
connect_args = {}
# For psycopg, standard sslmode parameter is preferred if hitting external db
if "sqlite" not in _db_url:
    connect_args = {"sslmode": "require"}

engine = create_async_engine(
    _db_url, 
    echo=False, 
    connect_args=connect_args,
    pool_pre_ping=True  # Recommended for PgBouncer/Supabase
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a database session."""
    async with async_session() as session:
        yield session
