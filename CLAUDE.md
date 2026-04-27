# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

A `venv/` is already present. Activate it and install dependencies:

```bash
# Windows
venv\Scripts\activate
pip install -r requirements.txt
```

Set `ANTHROPIC_API_KEY` in `.env` before running anything.

## Running the backend

```bash
uvicorn backend.main:app --reload
```

## Architecture

This is a patient risk assessment AI with three layers:

- **[risk_engine.py](risk_engine.py)** — Core risk scoring logic using the Anthropic SDK (Claude). This is the domain heart of the project: it takes patient data and returns a structured risk assessment.
- **[backend/](backend/)** — FastAPI application that exposes HTTP endpoints. Calls into `risk_engine` and handles request/response validation via Pydantic models.
- **[frontend/](frontend/)** — Web UI that calls the backend API.
- **[data/](data/)** — Patient data files or datasets used by the risk engine.

Data flow: `frontend` → `backend` (FastAPI routes) → `risk_engine` (Anthropic API call) → structured risk result back up the chain.

## Key dependencies

| Package | Role |
|---|---|
| `anthropic` | Claude API client — use for all LLM calls in `risk_engine.py` |
| `fastapi` + `uvicorn` | HTTP API layer |
| `pydantic` v2 | Request/response models and data validation |
| `python-dotenv` | Loads `.env` into environment at startup |
