"""Pydantic request and response models for the patient risk API."""
from pydantic import BaseModel


class AnalysisResult(BaseModel):
    patient_id: str
    summary: str
    source: str
    generated_at: str


class MedicationInput(BaseModel):
    name: str
    dose: str


class LabValuesInput(BaseModel):
    a1c: float | None = None
    egfr: float | None = None
    blood_pressure: str | None = None
    creatinine: float | None = None
    hemoglobin: float | None = None


class CustomPatientRequest(BaseModel):
    name: str
    age: int
    gender: str
    diagnoses: list[str] = []
    medications: list[MedicationInput] = []
    lab_values: LabValuesInput = LabValuesInput()
    risk_flags: list[str] = []
