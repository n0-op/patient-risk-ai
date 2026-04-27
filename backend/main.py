import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from risk_engine import analyze_patient

patients_list: list = []
patients_by_id: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global patients_list, patients_by_id
    with open("data/patients.json") as f:
        data = json.load(f)
    patients_list = data["patients"]
    patients_by_id = {p["id"]: p for p in patients_list}
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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/patients")
def get_patients():
    return patients_list


@app.post("/patients/{patient_id}/analyze", response_model=AnalysisResult)
def analyze(patient_id: str):
    patient = patients_by_id.get(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    summary = analyze_patient(patient)
    return AnalysisResult(patient_id=patient_id, summary=summary)
