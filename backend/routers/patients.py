"""HTTP routing for all /patients endpoints — delegates business logic to services."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from backend.models.schemas import AnalysisResult, CustomPatientRequest
from backend.services import audit_service, cache_service
from risk_engine import analyze_patient

# Patient IDs are UUID v4 — unpredictable by design to prevent BOLA (OWASP API Security Top 10 #1).
# Sequential IDs (PT-001, PT-002, ...) allow enumeration attacks; UUIDs do not.
router = APIRouter()


def _session_token(request: Request) -> str | None:
    return request.headers.get("X-Session-Token")


@router.get("/patients")
def get_patients(request: Request):
    audit_service.audit("patient_list_accessed", _session_token(request))
    return cache_service.get_patients()


@router.post("/patients/{patient_id}/analyze", response_model=AnalysisResult)
def analyze(patient_id: str, request: Request):
    if cache_service.get_patient(patient_id) is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    cached = cache_service.get_cached_summary(patient_id)
    if cached:
        audit_service.audit(
            "patient_analyzed",
            _session_token(request),
            patient_ref=audit_service.hash_patient_id(patient_id),
            source="cache",
        )
        return AnalysisResult(patient_id=patient_id, **cached)

    patient = cache_service.get_patient(patient_id)
    summary = analyze_patient(patient)
    entry = {
        "summary": summary,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "live",
    }
    cache_service.store_summary(patient_id, entry)
    audit_service.audit(
        "patient_analyzed",
        _session_token(request),
        patient_ref=audit_service.hash_patient_id(patient_id),
        source="live",
    )
    return AnalysisResult(patient_id=patient_id, **entry)


@router.post("/analyze/custom", response_model=AnalysisResult)
def analyze_custom(body: CustomPatientRequest, request: Request):
    patient_id = str(uuid.uuid4())
    labs = body.lab_values
    patient = {
        "id": patient_id,
        "name": body.name,
        "age": body.age,
        "gender": body.gender,
        "diagnoses": body.diagnoses,
        "medications": [{"name": m.name, "dose": m.dose} for m in body.medications],
        "lab_values": {
            "A1C_percent": labs.a1c,
            "creatinine_mg_dL": labs.creatinine,
            "blood_pressure_mmHg": labs.blood_pressure,
            "eGFR_mL_min_1_73m2": labs.egfr,
        },
        "risk_flags": body.risk_flags,
        "recent_visit": {},
    }
    summary = analyze_patient(patient)
    entry = {
        "summary": summary,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "custom",
    }
    audit_service.audit(
        "custom_patient_analyzed",
        _session_token(request),
        patient_ref=audit_service.hash_patient_id(patient_id),
    )
    return AnalysisResult(patient_id=patient_id, **entry)


@router.post("/patients/{patient_id}/refresh", response_model=AnalysisResult)
def refresh(patient_id: str, request: Request):
    if cache_service.get_patient(patient_id) is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    patient = cache_service.get_patient(patient_id)
    summary = analyze_patient(patient)
    entry = {
        "summary": summary,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "live",
    }
    cache_service.persist_summary(patient_id, entry)
    audit_service.audit(
        "patient_refreshed",
        _session_token(request),
        patient_ref=audit_service.hash_patient_id(patient_id),
        source="live",
    )
    return AnalysisResult(patient_id=patient_id, **entry)
