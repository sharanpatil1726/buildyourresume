from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ── Auth ──────────────────────────────────
class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    plan: str


# ── Resume + Scan ─────────────────────────
class AnalyzeRequest(BaseModel):
    resume_text: str
    target_role: str
    experience_level: str = "Mid Level (2–5 yrs)"
    resume_id: Optional[str] = None

class ScanResult(BaseModel):
    scan_id: str
    ats_score: int
    keyword_score: int
    format_score: int
    content_score: int
    readability_score: int
    score_improvement_potential: int
    interview_likelihood: Dict[str, int]
    candidate_level: str
    primary_role: str
    years_experience: int
    top_skills: List[str]
    missing_keywords: List[str]
    strengths: List[str]
    weaknesses: List[str]
    quick_fixes: List[str]
    ats_breakdown: Dict[str, bool]
    market_demand: Dict[str, Any]
    role_tips: Dict[str, Any]
    verdict: str
    top_recommendation: str
    optimized_resume: str


# ── Jobs ──────────────────────────────────
class JobSource(str, Enum):
    adzuna = "adzuna"
    linkedin = "linkedin"
    google = "google"
    naukri = "naukri"

class Job(BaseModel):
    id: str
    external_id: str
    source: str
    title: str
    company: str
    location: Optional[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: str = "INR"
    description: Optional[str]
    skills: List[str] = []
    apply_url: str
    job_type: Optional[str]
    posted_at: Optional[datetime]
    is_active: bool = True

class JobSearchParams(BaseModel):
    role: str = ""
    location: str = "india"
    source: str = "all"
    page: int = 1
    page_size: int = 20

class JobsResponse(BaseModel):
    jobs: List[Job]
    total: int
    page: int
    pages: int
    from_cache: bool


# ── Applications ──────────────────────────
class ApplicationStatus(str, Enum):
    saved = "saved"
    applied = "applied"
    oa_test = "oa_test"
    interview = "interview"
    offer = "offer"
    rejected = "rejected"

class CreateApplicationRequest(BaseModel):
    job_id: Optional[str] = None
    company: str
    role: str
    apply_url: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.applied
    notes: Optional[str] = None

class UpdateApplicationRequest(BaseModel):
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    salary_offered: Optional[int] = None
    next_followup: Optional[datetime] = None


# ── Payment ───────────────────────────────
class CreateOrderRequest(BaseModel):
    plan: str  # "pro" or "career"

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    plan_name: str
    key_id: str


# ── Cover Letter ──────────────────────────
class CoverLetterRequest(BaseModel):
    resume_text: str
    target_role: str
    company: str = ""
