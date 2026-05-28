"""Tests for CustomPatientRequest and related Pydantic models."""
import pytest
from pydantic import ValidationError

from backend.models.schemas import CustomPatientRequest, MedicationInput


VALID_PAYLOAD = {
    "name": "Jane Doe",
    "age": 45,
    "gender": "Female",
    "diagnoses": ["Hypertension", "CKD stage 2"],
    "medications": [{"name": "Lisinopril", "dose": "10mg daily"}],
    "lab_values": {"blood_pressure": "140/90", "creatinine": 1.4},
    "risk_flags": ["Uncontrolled BP"],
}


def test_valid_full_payload():
    req = CustomPatientRequest(**VALID_PAYLOAD)
    assert req.name == "Jane Doe"
    assert req.age == 45


def test_minimal_payload():
    req = CustomPatientRequest(name="John Smith", age=30, gender="Male")
    assert req.diagnoses == []
    assert req.medications == []
    assert req.risk_flags == []


def test_missing_name_raises():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "name"}
    with pytest.raises(ValidationError):
        CustomPatientRequest(**payload)


def test_missing_age_raises():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "age"}
    with pytest.raises(ValidationError):
        CustomPatientRequest(**payload)


def test_missing_gender_raises():
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "gender"}
    with pytest.raises(ValidationError):
        CustomPatientRequest(**payload)


def test_age_below_zero_raises():
    with pytest.raises(ValidationError):
        CustomPatientRequest(name="X", age=-1, gender="Other")


def test_age_above_130_raises():
    with pytest.raises(ValidationError):
        CustomPatientRequest(name="X", age=131, gender="Other")


def test_age_boundary_zero_is_valid():
    req = CustomPatientRequest(name="Newborn", age=0, gender="Female")
    assert req.age == 0


def test_age_boundary_130_is_valid():
    req = CustomPatientRequest(name="Elder", age=130, gender="Male")
    assert req.age == 130


def test_lab_values_all_optional():
    req = CustomPatientRequest(name="X", age=50, gender="Male", lab_values={})
    assert req.lab_values.a1c is None
    assert req.lab_values.egfr is None
    assert req.lab_values.blood_pressure is None
    assert req.lab_values.creatinine is None
    assert req.lab_values.hemoglobin is None


def test_empty_diagnoses_and_risk_flags():
    req = CustomPatientRequest(name="X", age=50, gender="Male", diagnoses=[], risk_flags=[])
    assert req.diagnoses == []
    assert req.risk_flags == []


def test_medication_missing_dose_raises():
    with pytest.raises(ValidationError):
        MedicationInput(name="Metformin")


def test_medication_missing_name_raises():
    with pytest.raises(ValidationError):
        MedicationInput(dose="500mg daily")
