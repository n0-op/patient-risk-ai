"""Shared fixtures for the backend test suite."""
import os

# Must be set before any backend module is imported; risk_engine.py calls
# Anthropic() at module level, which raises AuthenticationError without a key.
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test-key-not-real")

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def sample_patient():
    return {
        "id": "32d994c4-a414-439a-a12e-7188a712e139",
        "name": "Test Patient",
        "age": 55,
        "gender": "Female",
        "diagnoses": ["Type 2 diabetes mellitus"],
        "medications": [{"name": "Metformin", "dose": "500mg daily"}],
        "lab_values": {
            "A1C_percent": 7.5,
            "creatinine_mg_dL": 1.0,
            "blood_pressure_mmHg": "130/80",
            "eGFR_mL_min_1_73m2": 75,
        },
        "risk_flags": ["A1C not at target"],
        "recent_visit": {
            "date": "2026-01-01",
            "reason": "Quarterly follow-up",
            "notes": "Stable. Continue current management.",
        },
    }


@pytest.fixture
def mock_cache(sample_patient):
    return {
        sample_patient["id"]: {
            "summary": "Cached summary for patient 1",
            "generated_at": "2026-04-30T00:00:00+00:00",
            "source": "pregenerated",
        },
        "cbafc952-e9d2-40cd-b0ab-fbc2f5a416b6": {
            "summary": "Cached summary for patient 2",
            "generated_at": "2026-04-30T00:00:00+00:00",
            "source": "pregenerated",
        },
        "021ded2a-a878-4fa8-bbd0-ca892d76ba37": {
            "summary": "Cached summary for patient 3",
            "generated_at": "2026-04-30T00:00:00+00:00",
            "source": "pregenerated",
        },
    }


@pytest.fixture
def mock_analyze():
    """Patches analyze_patient so tests never trigger real Anthropic API calls."""
    with patch(
        "backend.routers.patients.analyze_patient", return_value="Mock summary"
    ) as m:
        yield m


@pytest.fixture
def client(sample_patient, mock_cache):
    """TestClient with patched file I/O and pre-loaded in-memory state."""
    import backend.services.cache_service as cs

    cs._patients_list = [sample_patient]
    cs._patients_by_id = {sample_patient["id"]: sample_patient}
    cs._summary_cache = dict(mock_cache)

    with (
        patch("backend.services.cache_service.load_patients"),
        patch("backend.services.cache_service.load_cache"),
        patch("backend.services.audit_service.audit"),
    ):
        from backend.main import app

        with TestClient(app) as c:
            yield c
