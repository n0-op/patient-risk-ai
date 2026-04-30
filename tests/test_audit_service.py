"""Tests for audit_service — patient ID hashing and structured audit log output."""
import json
from unittest.mock import patch

import backend.services.audit_service as audit_service

UUID_A = "32d994c4-a414-439a-a12e-7188a712e139"
UUID_B = "cbafc952-e9d2-40cd-b0ab-fbc2f5a416b6"


def test_hash_returns_16_char_string():
    result = audit_service.hash_patient_id(UUID_A)
    assert isinstance(result, str)
    assert len(result) == 16


def test_hash_is_deterministic():
    assert audit_service.hash_patient_id(UUID_A) == audit_service.hash_patient_id(UUID_A)


def test_hash_differs_for_different_uuids():
    assert audit_service.hash_patient_id(UUID_A) != audit_service.hash_patient_id(UUID_B)


def test_hash_does_not_return_original_uuid():
    result = audit_service.hash_patient_id(UUID_A)
    assert result != UUID_A


def test_audit_writes_valid_json_line():
    patient_ref = audit_service.hash_patient_id(UUID_A)

    with patch("backend.services.audit_service._logger") as mock_logger:
        audit_service.audit(
            "patient_analyzed",
            "session-token-abc",
            patient_ref=patient_ref,
            source="cache",
        )

    mock_logger.info.assert_called_once()
    log_line = mock_logger.info.call_args[0][0]
    record = json.loads(log_line)

    assert record["event"] == "patient_analyzed"
    assert record["session_token"] == "session-token-abc"
    assert record["patient_ref"] == patient_ref
    assert record["source"] == "cache"
    assert "timestamp" in record
