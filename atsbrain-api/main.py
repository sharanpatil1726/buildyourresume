from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from config import get_settings
from routers import auth, analyze, jobs, payment, resume, tracker
from routers import cron

settings = get_settings()
IS_PROD = settings.environment == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not IS_PROD:
        from scheduler import start_scheduler, shutdown_scheduler
        start_scheduler()
        logger.info("Job scheduler started (dev mode)")
        yield
        shutdown_scheduler()
    else:
        logger.info("Starting AtsBrain API (production — using Vercel Cron)")
        yield


app = FastAPI(
    title="AtsBrain API",
    description="ATS scoring, live jobs, and career tools for Indian job seekers",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/auth",    tags=["Auth"])
app.include_router(resume.router,   prefix="/api/resume",  tags=["Resume"])
app.include_router(analyze.router,  prefix="/api/analyze", tags=["Analyze"])
app.include_router(jobs.router,     prefix="/api/jobs",    tags=["Jobs"])
app.include_router(payment.router,  prefix="/api/payment", tags=["Payment"])
app.include_router(tracker.router,  prefix="/api/tracker", tags=["Tracker"])
app.include_router(cron.router,     prefix="/api/cron",    tags=["Cron"])


@app.get("/")
async def root():
    return {"status": "ok", "service": "AtsBrain API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
