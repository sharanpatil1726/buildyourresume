from fastapi import APIRouter, HTTPException
from database import supabase_admin
from models import FeedbackRequest
from loguru import logger

router = APIRouter()


@router.get("/")
async def get_feedback():
    result = (
        supabase_admin.table("feedback")
        .select("user_name, user_role, message, rating, created_at")
        .eq("is_approved", True)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data or []


@router.post("/")
async def submit_feedback(body: FeedbackRequest):
    if len(body.message.strip()) < 10:
        raise HTTPException(status_code=400, detail="Message too short (min 10 characters)")
    if not body.user_name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    supabase_admin.table("feedback").insert({
        "user_name":  body.user_name.strip(),
        "user_role":  body.user_role.strip(),
        "message":    body.message.strip(),
        "rating":     min(5, max(1, body.rating)),
        "is_approved": True,
    }).execute()

    logger.info(f"Feedback submitted by {body.user_name}")
    return {"success": True}
