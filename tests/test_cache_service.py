"""Tests for cache_service — patient data loading and summary cache read/write."""
import json
from unittest.mock import mock_open, patch

import pytest

import backend.services.cache_service as cs

PATIENT_UUID = "32d994c4-a414-439a-a12e-7188a712e139"
UNKNOWN_UUID = "00000000-0000-0000-0000-000000000000"


@pytest.fixture(autouse=True)
def reset_module_state():
    """Snapshot and restore cache_service module globals between tests."""
    orig_list = list(cs._patients_list)
    orig_by_id = dict(cs._patients_by_id)
    orig_cache = dict(cs._summary_cache)
    yield
    cs._patients_list = orig_list
    cs._patients_by_id = orig_by_id
    cs._summary_cache = orig_cache


def test_load_cache_loads_correctly():
    cache_data = {
        PATIENT_UUID: {
            "summary": "Test summary",
            "generated_at": "2026-04-30T00:00:00+00:00",
            "source": "pregenerated",
        }
    }
    with (
        patch("backend.services.cache_service.CACHE_PATH") as mock_path,
        patch("builtins.open", mock_open(read_data=json.dumps(cache_data))),
    ):
        mock_path.exists.return_value = True
        count = cs.load_cache()

    assert count == 1
    assert cs._summary_cache[PATIENT_UUID]["summary"] == "Test summary"


def test_get_cached_summary_returns_entry_for_known_uuid(mock_cache):
    cs._summary_cache = dict(mock_cache)
    result = cs.get_cached_summary(PATIENT_UUID)
    assert result is not None
    assert result["summary"] == mock_cache[PATIENT_UUID]["summary"]


def test_get_cached_summary_returns_none_for_unknown_uuid():
    cs._summary_cache = {}
    assert cs.get_cached_summary(UNKNOWN_UUID) is None


def test_store_summary_updates_in_memory_dict():
    cs._summary_cache = {}
    entry = {
        "summary": "New summary",
        "generated_at": "2026-04-30T00:00:00+00:00",
        "source": "live",
    }
    cs.store_summary(PATIENT_UUID, entry)
    assert cs._summary_cache[PATIENT_UUID] == entry


def test_persist_summary_writes_to_disk():
    cs._summary_cache = {}
    entry = {
        "summary": "Persisted summary",
        "generated_at": "2026-04-30T00:00:00+00:00",
        "source": "live",
    }
    with (
        patch("backend.services.cache_service.CACHE_PATH") as mock_path,
        patch("builtins.open", mock_open(read_data="{}")),
        patch("json.dump") as mock_dump,
    ):
        mock_path.exists.return_value = True
        cs.persist_summary(PATIENT_UUID, entry)

    # In-memory cache updated
    assert cs._summary_cache[PATIENT_UUID] == entry

    # json.dump called with the merged dict containing the new entry
    assert mock_dump.called
    written_data = mock_dump.call_args[0][0]
    assert PATIENT_UUID in written_data
    assert written_data[PATIENT_UUID] == entry
