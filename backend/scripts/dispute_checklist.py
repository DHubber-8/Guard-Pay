"""Print manual steps for opening a synthetic sandbox dispute.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import json
from pathlib import Path

FIXTURE = Path(__file__).resolve().parents[1] / "app" / "fixtures" / "damaged_hand_cream.json"


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    print("PayPal sandbox dispute checklist (manual buyer action; no API creates disputes):")
    print("1. Sign in to the PayPal Sandbox buyer account used for the sandbox order.")
    print("2. Open the transaction in the Resolution Center.")
    print("3. Choose the option to report a problem and open a dispute.")
    print("4. Select an item-not-as-described/damaged-item reason.")
    print("5. Paste this synthetic scenario text:")
    print(
        f"Seller: {fixture['seller']}\n"
        f"Item: {fixture['item']}\n"
        f"Amount: {fixture['amount']} {fixture['currency']}\n"
        "The item arrived damaged three hours after delivery on Day 4. "
        "The pump is cracked and leaking."
    )
    print("6. Submit the dispute and use the dispute ID from the resulting sandbox event.")


if __name__ == "__main__":
    main()
