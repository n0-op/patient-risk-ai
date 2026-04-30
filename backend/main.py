"""FastAPI application entry point — instantiates the app, registers middleware, and mounts routers."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import patients, session
from backend.services import cache_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    cache_service.load_patients()
    count = cache_service.load_cache()
    if count:
        print(f"Loaded {count} cached summaries from data/summary_cache.json")
    else:
        print("No summary cache found — run generate_cache.py to pre-populate")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1:8000",
        "http://127.0.0.1",
        "https://*.vercel.app",
        "https://web-production-9a2f8.up.railway.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(session.router)
