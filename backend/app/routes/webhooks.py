"""PayPal webhook routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/paypal")
def paypal_webhook() -> dict[str, str]:
    # TODO: Verify and process PayPal webhook events.
    return {"status": "received"}
