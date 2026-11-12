"""Personal payment advisor."""
# Task: B2 | Area: B | Owner: SJ | Status: DONE
# TODO: Provide fact-based guidance for user-supplied suspicious-payment information.

"""B2: Safety-first guidance for personal users."""
def personal_advice(scenario_id: str) -> list[str]:
    steps = ["Verify the request through the provider's official app or website.",
             "Do not share passwords, one-time codes, or recovery information.",
             "If money was sent or access was lost, contact the provider promptly through official support."]
    if scenario_id == "account_takeover":
        steps.insert(0, "Secure the account using the official website and review active sessions.")
    return steps
