"""Recommender — FastAPI entrypoint."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import profile, recommend, feedback


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database is initialized via manual scripts directly to the Session Pooler.
    # We do not run create_all here to prevent deadlocks on PgBouncer Transaction Poolers.
    yield


app = FastAPI(
    title="Recommender",
    description="Random Recommendation Engine for Movies, TV Shows & Anime",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(profile.router)
app.include_router(recommend.router)
app.include_router(feedback.router)


@app.get("/")
async def root():
    return {"app": "Recommender", "status": "running"}
