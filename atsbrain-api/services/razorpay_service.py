import razorpay
import hmac
import hashlib
from config import get_settings

settings = get_settings()


def _get_rz_client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def create_order(amount: int, receipt: str, notes: dict) -> dict:
    """Create a Razorpay order. Amount in paise."""
    return _get_rz_client().order.create({
        "amount":   amount,
        "currency": "INR",
        "receipt":  receipt,
        "notes":    notes,
    })


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature after checkout."""
    body = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Verify Razorpay webhook signature."""
    expected = hmac.new(
        settings.razorpay_webhook_secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
