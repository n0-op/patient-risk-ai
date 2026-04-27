import json
import os

import anthropic
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("ANTHROPIC_API_KEY"):
    raise EnvironmentError("ANTHROPIC_API_KEY not set in .env")

client = anthropic.Anthropic()

with open("data/patients.json") as f:
    data = json.load(f)

patients = data["patients"]
print(f"Loaded {len(patients)} patients from data/patients.json.")

response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=64,
    system=[
        {
            "type": "text",
            "text": "You are a medical AI assistant for a patient risk assessment system.",
            "cache_control": {"type": "ephemeral"},
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "Reply with one sentence confirming the API connection is working.",
        }
    ],
)

print(f"API response: {response.content[0].text}")
print(f"Model: {response.model} | Tokens used: {response.usage.input_tokens} in / {response.usage.output_tokens} out")
