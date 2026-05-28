"""Tests for all /patients HTTP endpoints."""
from unittest.mock import patch

UNKNOWN_UUID = "00000000-0000-0000-0000-000000000000"


def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_patients_returns_200(client):
    response = client.get("/patients")
    assert response.status_code == 200


def test_get_patients_returns_correct_count(client, sample_patient):
    response = client.get("/patients")
    patients = response.json()
    # client fixture loads exactly the one sample_patient
    assert len(patients) == 1
    assert patients[0]["id"] == sample_patient["id"]


def test_analyze_returns_200_for_valid_uuid(client, sample_patient, mock_analyze):
    response = client.post(f"/patients/{sample_patient['id']}/analyze")
    assert response.status_code == 200


def test_analyze_returns_404_for_unknown_uuid(client, mock_analyze):
    response = client.post(f"/patients/{UNKNOWN_UUID}/analyze")
    assert response.status_code == 404


def test_analyze_returns_cached_result_without_calling_analyze(client, sample_patient, mock_analyze):
    # sample_patient is in the warm cache — analyze_patient must not be called
    response = client.post(f"/patients/{sample_patient['id']}/analyze")
    assert response.status_code == 200
    mock_analyze.assert_not_called()


def test_refresh_calls_analyze_even_with_warm_cache(client, sample_patient, mock_analyze):
    # refresh must bypass the cache and always call analyze_patient
    with patch("backend.services.cache_service.persist_summary"):
        response = client.post(f"/patients/{sample_patient['id']}/refresh")
    assert response.status_code == 200
    mock_analyze.assert_called_once()


def test_response_schema_includes_source_field(client, sample_patient, mock_analyze):
    response = client.post(f"/patients/{sample_patient['id']}/analyze")
    assert response.status_code == 200
    data = response.json()
    assert "source" in data
    assert data["source"] in ("pregenerated", "cache", "live")


VALID_CUSTOM_BODY = {
    "name": "Jane Doe",
    "age": 45,
    "gender": "Female",
    "diagnoses": ["Hypertension"],
    "medications": [{"name": "Lisinopril", "dose": "10mg daily"}],
    "lab_values": {"blood_pressure": "140/90"},
    "risk_flags": ["Uncontrolled BP"],
}


def test_custom_analyze_returns_200(client, mock_analyze):
    response = client.post("/analyze/custom", json=VALID_CUSTOM_BODY)
    assert response.status_code == 200


def test_custom_analyze_source_is_custom(client, mock_analyze):
    response = client.post("/analyze/custom", json=VALID_CUSTOM_BODY)
    assert response.json()["source"] == "custom"


def test_custom_analyze_returns_uuid_patient_id(client, mock_analyze):
    import uuid
    response = client.post("/analyze/custom", json=VALID_CUSTOM_BODY)
    data = response.json()
    assert "patient_id" in data
    # must be a valid UUID
    uuid.UUID(data["patient_id"])


def test_custom_analyze_missing_name_returns_422(client, mock_analyze):
    body = {k: v for k, v in VALID_CUSTOM_BODY.items() if k != "name"}
    response = client.post("/analyze/custom", json=body)
    assert response.status_code == 422


def test_custom_analyze_missing_age_returns_422(client, mock_analyze):
    body = {k: v for k, v in VALID_CUSTOM_BODY.items() if k != "age"}
    response = client.post("/analyze/custom", json=body)
    assert response.status_code == 422


def test_custom_analyze_does_not_store_in_cache(client, mock_analyze):
    import backend.services.cache_service as cs
    cache_before = dict(cs._summary_cache)
    client.post("/analyze/custom", json=VALID_CUSTOM_BODY)
    assert cs._summary_cache == cache_before


def test_custom_analyze_always_calls_analyze_patient(client, mock_analyze):
    client.post("/analyze/custom", json=VALID_CUSTOM_BODY)
    client.post("/analyze/custom", json=VALID_CUSTOM_BODY)
    assert mock_analyze.call_count == 2
