
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger
from database import supabase_admin
from services.jobs_service import (
    fetch_adzuna_jobs, fetch_linkedin_jobs,
    fetch_google_jobs, fetch_remotive_jobs, upsert_jobs
)
from datetime import datetime, timedelta, timezone

scheduler = AsyncIOScheduler()

# Roles the cron pre-fetches every 2 hours
CRON_ROLES = [
    "python developer",
    "data scientist",
    "machine learning engineer",
    "data engineer",
    "backend engineer",
    "software engineer",
    "full stack developer",
    "react developer",
    "devops engineer",
    "product manager",
    "android developer",
    "frontend developer",
]

LOCATIONS = ["bangalore", "hyderabad", "mumbai", "delhi", "chennai", "pune"]


async def refresh_jobs():
    """Fetch fresh jobs from all APIs for all roles."""
    import asyncio
    logger.info("Cron: Starting job refresh...")
    total = 0

    for role in CRON_ROLES:
        for location in LOCATIONS[:2]:   # bangalore + hyderabad first
            try:
                jobs = await fetch_adzuna_jobs(role, location)
                saved = upsert_jobs(jobs)
                total += saved
                await asyncio.sleep(0.5)
            except Exception as e:
                logger.error(f"Cron error for {role}/{location}: {e}")

    # Remotive fallback if Adzuna produced nothing (e.g., credentials not set)
    if total == 0:
        try:
            for role in CRON_ROLES[:4]:
                jobs = await fetch_remotive_jobs(role)
                total += upsert_jobs(jobs)
        except Exception as e:
            logger.error(f"Remotive cron error: {e}")

    # Mark jobs older than 30 days as inactive
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    supabase_admin.table("jobs").update({"is_active": False}).lt("posted_at", cutoff).execute()

    logger.info(f"✅ Cron complete: {total} jobs upserted")


async def send_job_alerts():
    """Email users about new jobs matching their saved role preferences."""
    from services.email_service import send_job_alert
    from datetime import timedelta

    one_day_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    # Get users who have Pro/Career plans (only they get alerts)
    users = (
        supabase_admin.table("profiles")
        .select("id, email, full_name")
        .in_("plan", ["pro", "career"])
        .execute()
    )

    for user in (users.data or []):
        # Get their most recent scan to know their target role
        scan = (
            supabase_admin.table("scans")
            .select("target_role")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not scan.data:
            continue

        role = scan.data[0]["target_role"]

        # Find new jobs for their role in the last 24h
        new_jobs = (
            supabase_admin.table("jobs")
            .select("title, company, location, apply_url")
            .ilike("title", f"%{role}%")
            .gte("fetched_at", one_day_ago)
            .eq("is_active", True)
            .limit(10)
            .execute()
        )

        if new_jobs.data and len(new_jobs.data) >= 3:
            send_job_alert(user["email"], user.get("full_name", ""), role, new_jobs.data)
            logger.info(f"Job alert sent to {user['email']} for {role}")


def start_scheduler():
    # Refresh jobs every 2 hours
    scheduler.add_job(
        refresh_jobs,
        trigger=IntervalTrigger(hours=2),
        id="refresh_jobs",
        replace_existing=True,
        next_run_time=datetime.now(),   # run immediately on startup
    )

    # Send job alert emails once per day at 8 AM IST
    scheduler.add_job(
        send_job_alerts,
        trigger="cron",
        hour=8,
        minute=0,
        timezone="Asia/Kolkata",
        id="job_alerts",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started")


def shutdown_scheduler():
    scheduler.shutdown()
