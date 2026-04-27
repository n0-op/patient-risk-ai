# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

A `.venv/` is already present. Activate it and install dependencies:

```bash
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
```

Set `ANTHROPIC_API_KEY` in `.env` before running anything. Verify the environment with:

```bash
python test_setup.py
```

This confirms the API key is valid and `data/patients.json` loads correctly.

## Running the risk engine standalone

```bash
python risk_engine.py
```

Runs `analyze_patient()` on the first patient in `data/patients.json` and prints the result.

## Running the backend (once scaffolded)

```bash
uvicorn backend.main:app --reload
```

## Architecture

This is a patient risk assessment AI. The intended three-layer design:

- **[risk_engine.py](risk_engine.py)** — The only implemented layer so far. Exposes `analyze_patient(patient: dict) -> str`. Builds a clinical prompt from the patient's diagnoses, medications, lab values, risk flags, and recent visit, then calls `claude-sonnet-4-6` and returns a plain-text risk summary. The Anthropic client is initialized once at module level; the system prompt uses `cache_control: ephemeral` so repeated calls across a batch share a cached prefix.
- **[backend/](backend/)** — Not yet created. Planned: FastAPI app that imports `risk_engine.analyze_patient`, validates requests with Pydantic v2, and exposes HTTP endpoints.
- **[frontend/](frontend/)** — Not yet created. Planned: Web UI that calls the backend API.
- **[data/patients.json](data/patients.json)** — 12 sample patients. Each has `id`, `name`, `age`, `gender`, `diagnoses` (list), `medications` (list of `{name, dose}`), `lab_values` (`A1C_percent`, `creatinine_mg_dL`, `blood_pressure_mmHg`, `eGFR_mL_min_1_73m2`), `risk_flags` (list), and `recent_visit` (`date`, `reason`, `notes`).

Intended data flow: `frontend` → `backend` (FastAPI routes) → `risk_engine.analyze_patient()` → structured risk result back up the chain.

## Key dependencies

| Package | Role |
|---|---|
| `anthropic` | Claude API client — use for all LLM calls in `risk_engine.py` |
| `fastapi` + `uvicorn` | HTTP API layer (backend not yet scaffolded) |
| `pydantic` v2 | Request/response models and data validation |
| `python-dotenv` | Loads `.env` into environment at startup |
