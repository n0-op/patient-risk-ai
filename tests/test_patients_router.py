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
