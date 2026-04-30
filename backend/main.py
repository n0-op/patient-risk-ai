import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from risk_engine import analyze_patient

CACHE_PATH = Path("data/summary_cache.json")

patients_list: list = []
patients_by_id: dict = {}
summary_cache: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global patients_list, patients_by_id, summary_cache
    with open("data/patients.json") as f:
        data = json.load(f)
    patients_list = data["patients"]
    patients_by_id = {p["id"]: p for p in patients_list}

    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            summary_cache = json.load(f)
        print(f"Loaded {len(summary_cache)} cached summaries from {CACHE_PATH}")
    else:
        print("No summary cache found — run generate_cache.py to pre-populate")

    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisResult(BaseModel):
    patient_id: str
    summary: str
    source: str
    generated_at: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/patients")
def get_patients():
    return patients_list


# Patient IDs are UUID v4 — unpredictable by design to prevent BOLA (OWASP API Security Top 10 #1).
# Sequential IDs (PT-001, PT-002, ...) allow enumeration attacks; UUIDs do not.
@app.post("/patients/{patient_id}/analyze", response_model=AnalysisResult)
def analyze(patient_id: str):
    if patient_id not in patients_by_id:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    cached = summary_cache.get(patient_id)
    if cached:
        return AnalysisResult(patient_id=patient_id, **cached)

    patient = patients_by_id[patient_id]
    summary = analyze_patient(patient)
    entry = {
        "summary": summary,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "live",
    }
    summary_cache[patient_id] = entry
    return AnalysisResult(patient_id=patient_id, **entry)


@app.post("/patients/{patient_id}/refresh", response_model=AnalysisResult)
def refresh(patient_id: str):
    if patient_id not in patients_by_id:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    patient = patients_by_id[patient_id]
    summary = analyze_patient(patient)
    entry = {
        "summary": summary,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "live",
    }
    summary_cache[patient_id] = entry

    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            disk_cache = json.load(f)
    else:
        disk_cache = {}
    disk_cache[patient_id] = entry
    with open(CACHE_PATH, "w") as f:
        json.dump(disk_cache, f, indent=2)

    return AnalysisResult(patient_id=patient_id, **entry)
