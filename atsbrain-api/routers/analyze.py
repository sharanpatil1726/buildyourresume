from fastapi import APIRouter, Depends, HTTPException, status
from middleware import get_current_user, get_current_profile
from database import supabase_admin
from models import AnalyzeRequest, CoverLetterRequest, VerifyUnlockRequest
from services.anthropic_service import analyze_resume, generate_cover_letter, generate_optimized_resume
from services.razorpay_service import create_order, verify_payment_signature
from config import get_settings, SCAN_UNLOCK_AMOUNT
from loguru import logger

router = APIRouter()
settings = get_settings()

FREE_FIELDS = {"keyword_score", "format_score", "content_score", "readability_score",
               "top_skills", "strengths", "interview_likelihood", "ats_breakdown",
               "gap_analysis", "primary_role"}


def _free_result(result: dict) -> dict:
    return {k: result[k] for k in FREE_FIELDS if k in result}


@router.post("/")
async def run_analysis(
    body: AnalyzeRequest,
    user=Depends(get_current_user),
    profile=Depends(get_current_profile),
):
    if len(body.resume_text.strip()) < 100:
        raise HTTPException(status_code=400, detail="Resume text too short. Please upload your full resume.")

    try:
        result = analyze_resume(body.resume_text, body.target_role, body.experience_level)
    except Exception as e:
        logger.error(f"Claude analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")

    scan_id = None
    try:
        scan = supabase_admin.table("scans").insert({
            "user_id":          user.id,
            "resume_id":        body.resume_id,
            "target_role":      body.target_role,
            "experience_level": body.experience_level,
            "ats_score":        int(result["ats_score"]),
            "keyword_score":    int(result.get("keyword_score") or 0),
            "format_score":     int(result.get("format_score") or 0),
            "content_score":    int(result.get("content_score") or 0),
            "readability_score": int(result.get("readability_score") or 0),
            "result_json":      result,
            "is_unlocked":      False,
        }).execute()
        scan_id = scan.data[0]["id"]
        logger.info(f"Scan saved id={scan_id} score={result['ats_score']} role={body.target_role}")
    except Exception as db_err:
        logger.error(f"Failed to save scan: {db_err}")

    try:
        supabase_admin.table("profiles").update({
            "scans_used": profile["scans_used"] + 1
        }).eq("id", user.id).execute()
    except Exception as db_err:
        logger.warning(f"Failed to update scan count: {db_err}")

    return {"scan_id": scan_id, "is_unlocked": False, "result": _free_result(result)}


@router.get("/history")
async def scan_history(user=Depends(get_current_user)):
    result = (
        supabase_admin.table("scans")
        .select("id, target_role, ats_score, experience_level, created_at, is_unlocked")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data


@router.get("/{scan_id}")
async def get_scan(scan_id: str, user=Depends(get_current_user)):
    result = (
        supabase_admin.table("scans")
        .select("*")
        .eq("id", scan_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Scan not found")

    scan = result.data
    full = scan.get("result_json") or {}
    if scan.get("is_unlocked"):
        return {"scan_id": scan_id, "is_unlocked": True,
                "target_role": scan["target_role"], "experience_level": scan["experience_level"],
                "created_at": scan["created_at"], "result": full}

    return {"scan_id": scan_id, "is_unlocked": False,
            "target_role": scan["target_role"], "experience_level": scan["experience_level"],
            "created_at": scan["created_at"], "result": _free_result(full)}


@router.post("/{scan_id}/unlock")
async def create_unlock_order(scan_id: str, user=Depends(get_current_user)):
    scan = (
        supabase_admin.table("scans")
        .select("id, user_id, is_unlocked")
        .eq("id", scan_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not scan.data:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.data.get("is_unlocked"):
        raise HTTPException(status_code=400, detail="Already unlocked")

    order = create_order(
        amount=SCAN_UNLOCK_AMOUNT,
        receipt=f"unlock_{scan_id[:8]}",
        notes={"scan_id": scan_id, "user_id": user.id},
    )
    return {"order_id": order["id"], "amount": SCAN_UNLOCK_AMOUNT, "currency": "INR", "key_id": settings.razorpay_key_id}


@router.post("/{scan_id}/unlock-verify")
async def verify_unlock(scan_id: str, body: VerifyUnlockRequest, user=Depends(get_current_user)):
    is_valid = verify_payment_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    supabase_admin.table("scans").update({
        "is_unlocked": True,
        "unlock_payment_id": body.razorpay_payment_id,
    }).eq("id", scan_id).eq("user_id", user.id).execute()

    scan = supabase_admin.table("scans").select("result_json, target_role, experience_level").eq("id", scan_id).single().execute()
    logger.info(f"Scan {scan_id} unlocked by {user.id}")
    return {"is_unlocked": True, "result": scan.data.get("result_json", {})}


@router.get("/{scan_id}/optimized")
async def get_optimized_resume(scan_id: str, user=Depends(get_current_user)):
    scan = (
        supabase_admin.table("scans")
        .select("optimized_resume, result_json, target_role")
        .eq("id", scan_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not scan.data:
        raise HTTPException(status_code=404, detail="Scan not found")

    if scan.data.get("optimized_resume"):
        return {"text": scan.data["optimized_resume"]}

    full = scan.data.get("result_json") or {}
    missing = full.get("missing_keywords", [])
    resume_text = full.get("_resume_text", "")
    target_role = scan.data["target_role"]

    try:
        optimized = generate_optimized_resume(resume_text, target_role, missing)
    except Exception as e:
        logger.error(f"Optimized resume generation failed: {e}")
        raise HTTPException(status_code=500, detail="Could not generate optimized resume")

    try:
        supabase_admin.table("scans").update({"optimized_resume": optimized}).eq("id", scan_id).execute()
    except Exception:
        pass

    return {"text": optimized}


@router.post("/cover-letter")
async def cover_letter(
    body: CoverLetterRequest,
    user=Depends(get_current_user),
    profile=Depends(get_current_profile),
):
    if profile["plan"] == "free":
        raise HTTPException(status_code=403, detail="Cover letter generation requires Pro plan.")
    letter = generate_cover_letter(body.resume_text, body.target_role, body.company)
    return {"letter": letter}
