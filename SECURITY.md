# Security Design Notes

## Patient ID Format: UUID v4

Patient records are identified by randomly generated UUID v4 values (e.g., `32d994c4-a414-439a-a12e-7188a712e139`) rather than sequential integers or codes like `PT-001`.

### Why UUIDs Prevent BOLA

**Broken Object Level Authorization (BOLA)** is the #1 vulnerability in the [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/). It occurs when an API exposes resource identifiers that an attacker can manipulate to access records belonging to other users.

Sequential IDs make enumeration trivial:

```
GET /patients/PT-001/analyze   → patient record returned
GET /patients/PT-002/analyze   → patient record returned
GET /patients/PT-003/analyze   → patient record returned
...
```

An attacker can iterate through every patient in the system with a simple loop, regardless of whether they are authorized to view those records. This is especially dangerous in a healthcare context where records are Protected Health Information (PHI).

UUID v4 IDs are 122 bits of random entropy. The probability of guessing a valid UUID is astronomically small (~1 in 5.3 × 10³⁶), making enumeration attacks infeasible even if authorization checks are misconfigured or absent.

**UUID v4 is a defense-in-depth measure, not a substitute for authentication and authorization.** Every endpoint that returns patient data must still verify that the requesting user is permitted to access that specific record.

## Audit Logging

All patient data access events are logged: listing patients, analyzing a record, and refreshing a summary. Every log entry captures the event type, timestamp, and an opaque patient reference.

Raw patient UUIDs are never written to log files. Instead, each UUID is passed through SHA-256 and the first 16 hex characters are used as the patient reference:

```python
hashlib.sha256(patient_uuid.encode()).hexdigest()[:16]
```

The truncated hash is consistent — the same UUID always produces the same reference — so log entries for a given patient can be correlated across events without the log file itself containing any PHI. If the log file is exfiltrated, the hashes cannot be reversed to recover patient identifiers.

Logs are written to `logs/audit.log` in newline-delimited JSON. Each line has the shape:

```json
{"event": "patient_analyzed", "timestamp": "2026-04-30T19:00:00+00:00", "session_token": null, "patient_ref": "e7e62637edc867d7", "source": "cache"}
```

The `logs/` directory is excluded from version control via `.gitignore` so audit logs are never committed to the repository.

## HTTPS Requirement

Any deployment handling real PHI must terminate HTTPS at the load balancer or reverse proxy. Transmitting patient data over unencrypted HTTP violates HIPAA Security Rule requirements (45 CFR § 164.312(e)(1)) and exposes PHI to network-level interception.

Minimum TLS configuration:
- TLS 1.2 or higher
- Strong cipher suites (disable RC4, 3DES, export-grade ciphers)
- Valid certificate from a trusted CA (not self-signed in production)

## Synthetic Data Notice

All patient records in `data/patients.json` are entirely synthetic. Names, ages, diagnoses, lab values, and clinical notes are fabricated for demonstration purposes. No real patient data is present in this repository.
