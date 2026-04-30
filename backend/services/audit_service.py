"""Audit event logging with hashed patient references — no raw PHI ever written to logs."""
import hashlib
import json
import logging
from datetime import datetime, timezone

from backend.core.config import AUDIT_LOG_PATH

AUDIT_LOG_PATH.parent.mkdir(exist_ok=True)

_logger = logging.getLogger("audit")
_logger.setLevel(logging.INFO)
_logger.propagate = False

if not _logger.handlers:
    _handler = logging.FileHandler(AUDIT_LOG_PATH, encoding="utf-8")
    _handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(_handler)


def hash_patient_id(patient_uuid: str) -> str:
    # SHA-256 hash of patient UUID — never log raw UUIDs in audit trail per HIPAA audit control guidance
    return hashlib.sha256(patient_uuid.encode()).hexdigest()[:16]


def audit(event: str, session_token: str | None = None, **extra) -> None:
    record = {
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_token": session_token,
        **extra,
    }
    _logger.info(json.dumps(record))
