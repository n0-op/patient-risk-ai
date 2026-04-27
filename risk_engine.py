import json
import time
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic()

_SYSTEM_PROMPT = (
    "You are a clinical care coordinator reviewing patient records. "
    "For each patient, identify the top 2-3 risk factors, flag any "
    "medication or lab concerns, and recommend a follow-up priority "
    "(high, medium, or low). Keep your summary under 150 words."
)


def analyze_patient(patient: dict) -> str:
    meds = ", ".join(
        f"{m['name']} {m['dose']}" for m in patient.get("medications", [])
    )
    labs = patient.get("lab_values", {})
    lab_str = (
        f"A1C: {labs.get('A1C_percent', 'N/A')}%, "
        f"Creatinine: {labs.get('creatinine_mg_dL', 'N/A')} mg/dL, "
        f"BP: {labs.get('blood_pressure_mmHg', 'N/A')} mmHg, "
        f"eGFR: {labs.get('eGFR_mL_min_1_73m2', 'N/A')} mL/min/1.73m²"
    )
    visit = patient.get("recent_visit", {})
    flags = ", ".join(patient.get("risk_flags", [])) or "None"

    prompt = (
        f"Patient: {patient['name']}, Age {patient['age']}, {patient['gender']}\n"
        f"Diagnoses: {', '.join(patient['diagnoses'])}\n"
        f"Medications: {meds}\n"
        f"Lab values: {lab_str}\n"
        f"Risk flags: {flags}\n"
        f"Recent visit ({visit.get('date', 'N/A')}): {visit.get('reason', '')}. "
        f"{visit.get('notes', '')}"
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text


if __name__ == "__main__":
    with open("data/patients.json") as f:
        data = json.load(f)

    patients = data["patients"]
    for i, patient in enumerate(patients):
        print(f"=== {patient['name']} ===")
        print(analyze_patient(patient))
        print()
        if i < len(patients) - 1:
            time.sleep(1)
