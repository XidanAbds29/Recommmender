"""SQLAlchemy async engine and session factory for Recommender database."""

import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

# Prioritise SUPABASE_URL if provided, else fallback to local SQLite for development
# Supabase URL format: postgresql+asyncpg://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

_db_url = os.getenv("SUPABASE_URL") or os.getenv("DATABASE_URL")
if not _db_url:
    _db_url = "sqlite+aiosqlite:///recommender.db"

# Engine configuration
# Supabase often requires SSL disable or specific pooling depending on the connection string
connect_args = {}
if "sqlite" not in _db_url:
    # Basic settings to help connect to external PostgreSQL smoothly
    # We disable prepared_statement_cache_size so Supabase Transaction Pooler works
    connect_args = {"ssl": "require", "prepared_statement_cache_size": 0}

engine = create_async_engine(_db_url, echo=False, connect_args=connect_args if "sqlite" not in _db_url else {})

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a database session."""
    async with async_session() as session:
        yield session
