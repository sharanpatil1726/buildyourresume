from fastapi import APIRouter, Depends, Query, HTTPException
from middleware import get_current_user
from database import supabase_admin
from services.jobs_service import (
    fetch_adzuna_jobs, upsert_jobs, has_fresh_cache,
)
import asyncio
from loguru import logger

router = APIRouter()


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

    # Always kick off a background refresh — never block the response on external APIs
    async def bg_refresh():
        if has_fresh_cache(search_role, location):
            return
        try:
            jobs = await fetch_adzuna_jobs(search_role, location)
            upsert_jobs(jobs)
        except Exception as e:
            logger.error(f"Background fetch error: {e}")

    refresh_task = asyncio.create_task(bg_refresh())

    def _run_query():
        q = (
            supabase_admin.table("jobs")
            .select("*", count="exact")
            .eq("is_active", True)
            .order("posted_at", desc=True)
            .range(offset, offset + page_size - 1)
        )
        if role:
            q = q.ilike("title", f"%{role}%")
        if location and location.lower() not in ("india", ""):
            q = q.ilike("location", f"%{location}%")
        if source != "all":
            q = q.eq("source", source)
        return q.execute()

    try:
        result = _run_query()
        # If DB is empty for this query, wait for the background fetch then retry once
        if (result.count or 0) == 0:
            await refresh_task
            result = _run_query()
    except Exception as e:
        logger.error(f"Jobs DB query failed: {e}")
        return {"jobs": [], "total": 0, "page": page, "pages": 0, "from_cache": False}

    return {
        "jobs":       result.data or [],
        "total":      result.count or 0,
        "page":       page,
        "pages":      -(-(result.count or 0) // page_size),
        "from_cache": True,
    }


@router.post("/{job_id}/save")
async def save_job(job_id: str, user=Depends(get_current_user)):
    # Toggle save
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