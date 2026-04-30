"""Pydantic request and response models for the patient risk API."""
from pydantic import BaseModel


class AnalysisResult(BaseModel):
    patient_id: str
    summary: str
    source: str
    generated_at: str
