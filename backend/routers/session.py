"""HTTP routing for /health and /session/status endpoints."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/session/status")
def session_status():
    return {"session": "active"}
