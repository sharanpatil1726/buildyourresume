from fastapi import APIRouter, Depends, Query, HTTPException
from middleware import get_current_user
from database import supabase_admin
from services.jobs_service import (
    fetch_adzuna_jobs, upsert_jobs, has_fresh_cache,
)
import asyncio
from loguru import logger

router = APIRouter()


def _build_job_query(offset: int, page_size: int, role: str = "", location: str = "india",
                     source: str = "all", active_only: bool = False):
    q = (
        supabase_admin.table("jobs")
        .select("*", count="exact")
        .order("posted_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if active_only:
        q = q.neq("is_active", False)   # accepts True and NULL — never blocks newly fetched jobs
    if role:
        q = q.ilike("title", f"%{role}%")
    if location and location.lower() not in ("india", ""):
        q = q.ilike("location", f"%{location}%")
    if source != "all":
        q = q.eq("source", source)
    return q


@router.get("/")
async def search_jobs(
    role:      str = Query("", description="Job title or skill"),
    location:  str = Query("india", description="City or country"),
    source:    str = Query("all"),
    page:      int = Query(1, ge=1),
    page_size: int = Query(20, le=50),
    user=Depends(get_current_user),
):
    offset = (page - 1) * page_size
    search_role = role or "software engineer"

    async def bg_refresh():
        if has_fresh_cache(search_role, location):
            return
        try:
            jobs = await fetch_adzuna_jobs(search_role, location)
            upsert_jobs(jobs)
        except Exception as e:
            logger.error(f"Background fetch error: {e}")

    refresh_task = asyncio.create_task(bg_refresh())

    try:
        # Level 1: role + active filter
        result = _build_job_query(offset, page_size, role, location, source, active_only=True).execute()

        # Level 2: wait for fresh fetch, retry same query
        if (result.count or 0) == 0:
            await refresh_task
            result = _build_job_query(offset, page_size, role, location, source, active_only=True).execute()

        # Level 3: drop role filter, keep active filter
        if (result.count or 0) == 0:
            result = _build_job_query(offset, page_size, "", location, source, active_only=True).execute()

        # Level 4: drop is_active filter entirely — works even if column is NULL/false
        if (result.count or 0) == 0:
            result = _build_job_query(offset, page_size, "", location, source, active_only=False).execute()

        # Level 5: drop location filter too (bare: any job in DB)
        if (result.count or 0) == 0:
            result = _build_job_query(offset, page_size, "", "india", source, active_only=False).execute()

        role_matched = bool(role) and (result.count or 0) > 0 and role.lower() in str(result.data or "").lower()

        if (result.count or 0) == 0:
            logger.warning(f"Jobs DB returned 0 results even with no filters — DB may be empty")

    except Exception as e:
        logger.error(f"Jobs DB query failed: {e}")
        return {"jobs": [], "total": 0, "page": page, "pages": 0, "from_cache": False, "role_matched": False}

    total = result.count or 0
    return {
        "jobs":         result.data or [],
        "total":        total,
        "page":         page,
        "pages":        -(-(total) // page_size) if total else 0,
        "from_cache":   True,
        "role_matched": role_matched if role else True,
    }


@router.get("/debug")
async def jobs_debug(user=Depends(get_current_user)):
    """Returns counts at each filter level to diagnose why jobs aren't showing."""
    try:
        total       = supabase_admin.table("jobs").select("id", count="exact").execute().count or 0
        active_true = supabase_admin.table("jobs").select("id", count="exact").eq("is_active", True).execute().count or 0
        active_not_false = supabase_admin.table("jobs").select("id", count="exact").neq("is_active", False).execute().count or 0
        return {
            "total_jobs":          total,
            "is_active_true":      active_true,
            "is_active_not_false": active_not_false,
        }
    except Exception as e:
        return {"error": str(e)}


@router.post("/{job_id}/save")
async def save_job(job_id: str, user=Depends(get_current_user)):
    existing = (
        supabase_admin.table("saved_jobs")
        .select("id")
        .eq("user_id", user.id)
        .eq("job_id", job_id)
        .execute()
    )
    if existing.data:
        supabase_admin.table("saved_jobs").delete().eq("user_id", user.id).eq("job_id", job_id).execute()
        return {"saved": False}
    else:
        supabase_admin.table("saved_jobs").insert({"user_id": user.id, "job_id": job_id}).execute()
        return {"saved": True}


@router.get("/saved")
async def get_saved_jobs(user=Depends(get_current_user)):
    result = (
        supabase_admin.table("saved_jobs")
        .select("job_id, jobs(*)")
        .eq("user_id", user.id)
        .execute()
    )
    return [row["jobs"] for row in (result.data or []) if row.get("jobs")]


@router.post("/{job_id}/apply")
async def track_apply(job_id: str, user=Depends(get_current_user)):
    """Track that user clicked Apply on a job."""
    job = supabase_admin.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    supabase_admin.table("applications").insert({
        "user_id":    user.id,
        "job_id":     job_id,
        "company":    job.data["company"],
        "role":       job.data["title"],
        "apply_url":  job.data["apply_url"],
        "status":     "applied",
        "applied_at": "now()",
    }).execute()

    return {"apply_url": job.data["apply_url"], "tracked": True}
