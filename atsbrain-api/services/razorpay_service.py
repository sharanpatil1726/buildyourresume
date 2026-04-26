import hmac
import hashlib
import httpx
from config import get_settings

settings = get_settings()

RAZORPAY_BASE = "https://api.razorpay.com/v1"


def create_order(amount: int, receipt: str, notes: dict) -> dict:
    """Create a Razorpay order. Amount in paise."""
    s = get_settings()
    with httpx.Client(timeout=15) as client:
        resp = client.post(
            f"{RAZORPAY_BASE}/orders",
            auth=(s.razorpay_key_id, s.razorpay_key_secret),
            json={"amount": amount, "currency": "INR", "receipt": receipt, "notes": notes},
        )
        resp.raise_for_status()
        return resp.json()


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature after checkout."""
    body = f"{order_id}|{payment_id}"
    expected = hmac.new(
        get_settings().razorpay_key_secret.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify Razorpay webhook signature."""
    expected = hmac.new(
        get_settings().razorpay_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
