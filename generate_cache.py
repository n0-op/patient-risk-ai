"""Pre-generate risk summaries for all patients and write them to data/summary_cache.json.

Run this manually whenever the patient data or prompt changes and you want to refresh
the baseline summaries that the API serves on first load (source: "pregenerated").
The resulting summary_cache.json is committed to the repo so the live app never has
to make an API call for the initial page load.

Makes one Anthropic API call per patient (12 calls for the default dataset).
"""
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
        # Store by patient UUID so the API can look up by id in O(1)
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
