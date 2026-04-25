from fastapi import APIRouter, Depends, HTTPException, status
from middleware import get_current_user, get_current_profile
from database import supabase_admin
from models import AnalyzeRequest, CoverLetterRequest
from services.anthropic_service import analyze_resume, generate_cover_letter
from loguru import logger

router = APIRouter()


@router.post("/")
async def run_analysis(
    body: AnalyzeRequest,
    user=Depends(get_current_user),
    profile=Depends(get_current_profile),
):
    # Check scan limit
    if profile["scans_used"] >= profile["scans_limit"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Scan limit reached ({profile['scans_limit']}/month). Upgrade to Pro for unlimited scans.",
        )

    if len(body.resume_text.strip()) < 100:
        raise HTTPException(status_code=400, detail="Resume text too short. Please upload your full resume.")

    # Call Claude
    try:
        result = analyze_resume(body.resume_text, body.target_role, body.experience_level)
    except Exception as e:
        logger.error(f"Claude analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")

    # Save scan to DB
    scan = supabase_admin.table("scans").insert({
        "user_id":          user.id,
        "resume_id":        body.resume_id,
        "target_role":      body.target_role,
        "experience_level": body.experience_level,
        "ats_score":        result["ats_score"],
        "keyword_score":    result.get("keyword_score"),
        "format_score":     result.get("format_score"),
        "content_score":    result.get("content_score"),
        "readability_score": result.get("readability_score"),
        "result_json":      result,
        "optimized_resume": result.get("optimized_resume"),
    }).execute()

    # Increment scan count
    supabase_admin.table("profiles").update({
        "scans_used": profile["scans_used"] + 1
    }).eq("id", user.id).execute()

    logger.info(f"Scan saved. Score: {result['ats_score']} for {body.target_role}")
    return {"scan_id": scan.data[0]["id"], "result": result}


@router.get("/history")
async def scan_history(user=Depends(get_current_user)):
    result = (
        supabase_admin.table("scans")
        .select("id, target_role, ats_score, experience_level, created_at")
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
    return result.data


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
