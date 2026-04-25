from fastapi import APIRouter, Request, HTTPException
from config import get_settings
from loguru import logger

router = APIRouter()
settings = get_settings()


def _verify(request: Request):
    auth = request.headers.get("authorization", "")
    if auth != f"Bearer {settings.cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/refresh-jobs")
async def cron_refresh_jobs(request: Request):
    _verify(request)
    from scheduler import refresh_jobs
    await refresh_jobs()
    return {"ok": True, "job": "refresh_jobs"}


@router.get("/job-alerts")
async def cron_job_alerts(request: Request):
    _verify(request)
    from scheduler import send_job_alerts
    await send_job_alerts()
    return {"ok": True, "job": "job_alerts"}
