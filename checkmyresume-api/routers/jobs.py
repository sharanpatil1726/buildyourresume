from fastapi import APIRouter, Depends, Query, HTTPException
from middleware import get_current_user
from database import supabase_admin
from services.jobs_service import (
    fetch_adzuna_jobs, fetch_linkedin_jobs, fetch_google_jobs,
    upsert_jobs, has_fresh_cache, score_job_match
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

    # Check if we have fresh cache for this query
    cache_hit = has_fresh_cache(role, location) if role else False

    if not cache_hit:
        # Fetch live from Adzuna (blocking — user waits ~1-2s)
        try:
            adzuna_jobs = await fetch_adzuna_jobs(role or "software engineer", location)
            upsert_jobs(adzuna_jobs)
        except Exception as e:
            logger.error(f"Adzuna fetch failed: {e}")

        # LinkedIn + Google fetch in background (non-blocking)
        async def bg_fetch():
            try:
                li_jobs = await fetch_linkedin_jobs(role or "software engineer", location)
                upsert_jobs(li_jobs)
                g_jobs = await fetch_google_jobs(role or "software engineer", location)
                upsert_jobs(g_jobs)
            except Exception as e:
                logger.error(f"Background fetch error: {e}")

        asyncio.create_task(bg_fetch())

    # Query Supabase
    query = (
        supabase_admin.table("jobs")
        .select("*", count="exact")
        .eq("is_active", True)
        .order("posted_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if role:     query = query.ilike("title", f"%{role}%")
    if location and location.lower() != "india":
        query = query.ilike("location", f"%{location}%")
    if source != "all":
        query = query.eq("source", source)

    result = query.execute()

    return {
        "jobs":       result.data or [],
        "total":      result.count or 0,
        "page":       page,
        "pages":      -(-( result.count or 0) // page_size),  # ceiling division
        "from_cache": cache_hit,
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