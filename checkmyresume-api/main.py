

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from config import get_settings
from scheduler import start_scheduler, shutdown_scheduler
from routers import auth, analyze, jobs, payment, resume, tracker

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting CheckMyResume API...")
    start_scheduler()
    logger.info("Job scheduler started — fetching every 2 hours")
    yield
    # Shutdown
    shutdown_scheduler()
    logger.info("Scheduler stopped")


app = FastAPI(
    title="CheckMyResume API",
    description="ATS scoring, live jobs, and career tools for Indian job seekers",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — allow your frontend domain ─────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers 
app.include_router(auth.router,     prefix="/api/auth",    tags=["Auth"])
app.include_router(resume.router,   prefix="/api/resume",  tags=["Resume"])
app.include_router(analyze.router,  prefix="/api/analyze", tags=["Analyze"])
app.include_router(jobs.router,     prefix="/api/jobs",    tags=["Jobs"])
app.include_router(payment.router,  prefix="/api/payment", tags=["Payment"])
app.include_router(tracker.router,  prefix="/api/tracker", tags=["Tracker"])


@app.get("/")
async def root():
    return {"status": "ok", "service": "CheckMyResume API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}


# ── Run locally ───────────────────────────
# uvicorn main:app --reload --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

