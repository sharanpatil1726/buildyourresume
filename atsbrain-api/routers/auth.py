from fastapi import APIRouter, HTTPException
from database import get_supabase, supabase_admin
from models import SignupRequest, LoginRequest
from services.email_service import send_welcome_email
from loguru import logger

router = APIRouter()


@router.post("/signup")
async def signup(body: SignupRequest):
    try:
        supabase = get_supabase()
        resp = supabase.auth.sign_up({
            "email":    body.email,
            "password": body.password,
            "options":  {"data": {"full_name": body.full_name}},
        })
        if resp.user:
            send_welcome_email(body.email, body.full_name)
        return {"message": "Account created. Check your email to verify.", "user_id": resp.user.id if resp.user else None}
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: LoginRequest):
    try:
        supabase = get_supabase()
        resp = supabase.auth.sign_in_with_password({
            "email":    body.email,
            "password": body.password,
        })
        profile = (
            supabase_admin.table("profiles")
            .select("plan, scans_used, scans_limit")
            .eq("id", resp.user.id)
            .single()
            .execute()
        )
        return {
            "access_token": resp.session.access_token,
            "user_id":      resp.user.id,
            "email":        resp.user.email,
            "plan":         profile.data.get("plan", "free") if profile.data else "free",
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.post("/logout")
async def logout():
    supabase = get_supabase()
    supabase.auth.sign_out()
    return {"message": "Logged out"}


@router.get("/me")
async def get_me(user=__import__("fastapi").Depends(__import__("middleware").get_current_user)):
    profile = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not profile.data:
        # Auto-create profile for first-time Google OAuth users
        try:
            new_profile = supabase_admin.table("profiles").upsert({
                "id": user.id,
                "email": getattr(user, "email", ""),
                "plan": "free",
                "scans_used": 0,
                "scans_limit": 3,
            }).execute()
            data = dict(new_profile.data[0]) if new_profile.data else {}
        except Exception:
            data = {}
    else:
        data = dict(profile.data)
    data["id"] = user.id
    data["email"] = getattr(user, "email", data.get("email", ""))
    return data
