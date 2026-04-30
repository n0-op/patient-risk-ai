"""Patient data loading and summary cache read/write — all file I/O for patient state lives here."""
import json

from backend.core.config import CACHE_PATH, PATIENTS_PATH

_patients_list: list = []
_patients_by_id: dict = {}
_summary_cache: dict = {}


def load_patients() -> None:
    global _patients_list, _patients_by_id
    with open(PATIENTS_PATH) as f:
        data = json.load(f)
    _patients_list = data["patients"]
    _patients_by_id = {p["id"]: p for p in _patients_list}


def load_cache() -> int:
    """Load summary cache from disk. Returns the number of entries loaded."""
    global _summary_cache
    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            _summary_cache = json.load(f)
        return len(_summary_cache)
    return 0


def get_patients() -> list:
    return _patients_list


def get_patient(patient_id: str) -> dict | None:
    return _patients_by_id.get(patient_id)


def get_cached_summary(patient_id: str) -> dict | None:
    return _summary_cache.get(patient_id)


def store_summary(patient_id: str, entry: dict) -> None:
    """Update the in-memory cache only."""
    _summary_cache[patient_id] = entry


def persist_summary(patient_id: str, entry: dict) -> None:
    """Update the in-memory cache and write the entry through to disk."""
    store_summary(patient_id, entry)
    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            disk_cache = json.load(f)
    else:
        disk_cache = {}
    disk_cache[patient_id] = entry
    with open(CACHE_PATH, "w") as f:
        json.dump(disk_cache, f, indent=2)
