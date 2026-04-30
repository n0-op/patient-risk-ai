import json
from datetime import datetime, timezone

from risk_engine import analyze_patient


def main():
    with open("data/patients.json") as f:
        patients = json.load(f)["patients"]

    total = len(patients)
    cache = {}

    for i, patient in enumerate(patients, start=1):
        print(f"Analyzing {i}/{total}: {patient['name']}...")
        summary = analyze_patient(patient)
        cache[patient["id"]] = {
            "summary": summary,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "pregenerated",
        }

    with open("data/summary_cache.json", "w") as f:
        json.dump(cache, f, indent=2)

    print(f"\nDone. Saved {total} summaries to data/summary_cache.json")


if __name__ == "__main__":
    main()
