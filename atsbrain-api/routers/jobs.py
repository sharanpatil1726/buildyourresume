from fastapi import APIRouter, Depends, Query, HTTPException
from middleware import get_current_user, get_current_profile
from database import supabase_admin
from services.jobs_service import (
    fetch_adzuna_jobs, fetch_remotive_jobs, fetch_arbeitnow_jobs,
    upsert_jobs, has_fresh_cache,
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

    # Fire-and-forget: never block the response on external API calls
    async def bg_refresh():
        if has_fresh_cache(search_role, location):
            return
        try:
            jobs = await fetch_adzuna_jobs(search_role, location)
            if not jobs:
                jobs = await fetch_remotive_jobs(search_role)
            upsert_jobs(jobs)
        except Exception as e:
            logger.error(f"Background fetch error: {e}")

    asyncio.create_task(bg_refresh())

    def run_query(r: str = "", loc: str = "india", active_only: bool = False):
        """Returns (data, count) or ([], None) on error."""
        try:
            q = supabase_admin.table("jobs").select("*", count="exact")
            if active_only:
                q = q.or_("is_active.eq.true,is_active.is.null")
            if r:
                q = q.ilike("title", f"%{r}%")
            if loc and loc.lower() not in ("india", ""):
                q = q.ilike("location", f"%{loc}%")
            if source != "all":
                q = q.eq("source", source)
            q = q.order("posted_at", desc=True).range(offset, offset + page_size - 1)
            res = q.execute()
            return res.data or [], res.count
        except Exception as e:
            logger.warning(f"Query failed r={r!r} loc={loc!r} active={active_only}: {e}")
            return [], None

    # Cascade fallback levels — all fast DB reads, no waiting on external APIs
    data, count = run_query(role, location, active_only=True)
    if not data:
        data, count = run_query("", location, active_only=True)
    if not data:
        data, count = run_query("", location, active_only=False)
    if not data:
        data, count = run_query("", "india", active_only=False)

    if not data:
        logger.warning("Jobs DB is empty — background fetch is running, try again in 30s")

    total = count or len(data)
    role_matched = bool(role) and bool(data) and role.lower() in str(data).lower()

    return {
        "jobs":         data,
        "total":        total,
        "page":         page,
        "pages":        -(-total // page_size) if total else 0,
        "from_cache":   True,
        "role_matched": role_matched if role else True,
        "seeding":      not bool(data),  # tells frontend DB is being populated
    }


# Roles fetched on every manual refresh (run in parallel — total time = slowest single call)
_REFRESH_ROLES = [
    "software engineer",
    "python developer",
    "react developer",
    "data scientist",
    "backend engineer",
    "devops engineer",
]


@router.post("/refresh")
async def refresh_jobs_now(user=Depends(get_current_user)):
    """Fetch jobs from all sources in parallel. Safe to call anytime."""
    tasks = [fetch_adzuna_jobs(role, "india") for role in _REFRESH_ROLES]
    tasks += [fetch_remotive_jobs(), fetch_arbeitnow_jobs()]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_jobs: list[dict] = []
    for r in results:
        if isinstance(r, list):
            all_jobs.extend(r)
        elif isinstance(r, Exception):
            logger.warning(f"Refresh source failed: {r}")

    inserted = upsert_jobs(all_jobs)
    logger.info(f"Manual refresh: fetched {len(all_jobs)}, inserted {inserted}")
    return {"fetched": len(all_jobs), "inserted": inserted}


@router.get("/status")
async def jobs_status():
    """Public endpoint — returns DB job counts to verify the backend can read the jobs table."""
    try:
        total = supabase_admin.table("jobs").select("id", count="exact").execute()
        active = supabase_admin.table("jobs").select("id", count="exact").eq("is_active", True).execute()
        sample = supabase_admin.table("jobs").select("id, title, source, is_active").limit(3).execute()
        return {
            "total_in_db":   total.count,
            "is_active_true": active.count,
            "sample":        sample.data,
        }
    except Exception as e:
        return {"error": str(e)}


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
async def track_apply(job_id: str, user=Depends(get_current_user), profile=Depends(get_current_profile)):
    """Track that user clicked Apply on a job (Pro plan required)."""
    if profile["plan"] != "pro":
        raise HTTPException(
            status_code=403,
            detail="Applying to jobs requires Pro plan (₹299/month). Upgrade at /pricing.",
        )
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
