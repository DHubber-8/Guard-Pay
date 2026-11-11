"""Optional OpenAI-compatible gateway; no assumed Astropods endpoint.
from __future__ import annotations

Set B_AI_BASE_URL, B_AI_API_KEY, B_AI_MODEL to enable. Never send secrets.
Disabled by default; do not send real customer data without authorization.
"""
import os

def enhance_explanation(facts: str) -> str | None:
    base = os.getenv("B_AI_BASE_URL", "").rstrip("/")
    key = os.getenv("B_AI_API_KEY", "")
    model = os.getenv("B_AI_MODEL", "")
    if not (base and key and model and os.getenv("B_AI_ENABLED") == "1"):
        return None
    import httpx
    try:
        response = httpx.post(base + "/chat/completions", headers={"Authorization": "Bearer " + key},
            json={"model": model, "temperature": 0, "max_tokens": 250,
                  "messages": [{"role": "system", "content": "Explain only supplied case facts in plain English. Do not invent evidence, claim fraud is confirmed, or recommend automatic financial actions."},
                               {"role": "user", "content": facts}]}, timeout=12)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        return None
