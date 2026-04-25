from fastapi import APIRouter, Depends, HTTPException, Request
from middleware import get_current_user, get_current_profile
from database import supabase_admin
from models import CreateOrderRequest, VerifyPaymentRequest
from services.razorpay_service import create_order, verify_payment_signature, verify_webhook_signature
from services.email_service import send_payment_confirmation
from config import get_settings, PLANS
from datetime import datetime, timedelta, timezone
from loguru import logger

router = APIRouter()
settings = get_settings()


@router.post("/create-order")
async def create_payment_order(
    body: CreateOrderRequest,
    user=Depends(get_current_user),
    profile=Depends(get_current_profile),
):
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan_data = PLANS[body.plan]
    receipt = f"cmr_{user.id[:8]}_{int(datetime.now().timestamp())}"

    order = create_order(
        amount=plan_data["amount"],
        receipt=receipt,
        notes={"user_id": user.id, "plan": body.plan},
    )

    # Save pending payment
    supabase_admin.table("payments").insert({
        "user_id":           user.id,
        "razorpay_order_id": order["id"],
        "plan":              body.plan,
        "amount":            plan_data["amount"],
        "status":            "created",
    }).execute()

    return {
        "order_id":  order["id"],
        "amount":    plan_data["amount"],
        "currency":  "INR",
        "plan_name": plan_data["name"],
        "key_id":    settings.razorpay_key_id,
    }


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentRequest,
    user=Depends(get_current_user),
):
    is_valid = verify_payment_signature(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    plan_data = PLANS[body.plan]
    expires_at = datetime.now(timezone.utc) + timedelta(days=plan_data["duration_days"])

    # Mark payment as paid
    supabase_admin.table("payments").update({
        "razorpay_payment_id": body.razorpay_payment_id,
        "status":  "paid",
        "paid_at": datetime.now(timezone.utc).isoformat(),
    }).eq("razorpay_order_id", body.razorpay_order_id).execute()

    # Upgrade user plan
    supabase_admin.table("profiles").update({
        "plan":         body.plan,
        "plan_expires": expires_at.isoformat(),
        "scans_limit":  plan_data["scans_limit"],
        "scans_used":   0,
    }).eq("id", user.id).execute()

    # Send confirmation email
    profile = supabase_admin.table("profiles").select("email, full_name").eq("id", user.id).single().execute()
    if profile.data:
        send_payment_confirmation(
            profile.data["email"],
            profile.data.get("full_name", ""),
            plan_data["name"],
            plan_data["amount"],
        )

    logger.info(f"Payment verified. User {user.id} upgraded to {body.plan}")
    return {"success": True, "plan": body.plan, "expires_at": expires_at.isoformat()}


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Backup verification via Razorpay webhook (in case frontend fails)."""
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if not verify_webhook_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    event = json.loads(body)

    if event.get("event") == "payment.captured":
        payment = event["payload"]["payment"]["entity"]
        order_id = payment["order_id"]

        pending = (
            supabase_admin.table("payments")
            .select("user_id, plan, status")
            .eq("razorpay_order_id", order_id)
            .single()
            .execute()
        )
        if pending.data and pending.data["status"] != "paid":
            plan_data = PLANS.get(pending.data["plan"], PLANS["pro"])
            expires_at = datetime.now(timezone.utc) + timedelta(days=plan_data["duration_days"])
            supabase_admin.table("profiles").update({
                "plan":         pending.data["plan"],
                "plan_expires": expires_at.isoformat(),
                "scans_limit":  plan_data["scans_limit"],
            }).eq("id", pending.data["user_id"]).execute()
            supabase_admin.table("payments").update({"status": "paid"}).eq("razorpay_order_id", order_id).execute()

    return {"received": True}
