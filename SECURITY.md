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

## Audit Log Recommendations

If audit logging is added (e.g., recording which user accessed which patient record), patient IDs in log files should be hashed rather than logged in plaintext:

```python
import hashlib

def audit_id(patient_id: str) -> str:
    return hashlib.sha256(patient_id.encode()).hexdigest()[:16]
```

This allows correlation of log entries for a given patient without exposing the raw UUID, limiting the blast radius if log files are exfiltrated.

## HTTPS Requirement

Any deployment handling real PHI must terminate HTTPS at the load balancer or reverse proxy. Transmitting patient data over unencrypted HTTP violates HIPAA Security Rule requirements (45 CFR § 164.312(e)(1)) and exposes PHI to network-level interception.

Minimum TLS configuration:
- TLS 1.2 or higher
- Strong cipher suites (disable RC4, 3DES, export-grade ciphers)
- Valid certificate from a trusted CA (not self-signed in production)

## Synthetic Data Notice

All patient records in `data/patients.json` are entirely synthetic. Names, ages, diagnoses, lab values, and clinical notes are fabricated for demonstration purposes. No real patient data is present in this repository.
