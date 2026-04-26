import httpx
import re
import json
from datetime import datetime, timezone
from loguru import logger
from config import get_settings
from database import supabase_admin
import anthropic

settings = get_settings()
_anthropic_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client

CACHE_TTL_HOURS = 2

# Core tech skills for fast matching (will be supplemented by AI)
TECH_SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "Next.js",
    "Django", "FastAPI", "Flask", "PostgreSQL", "MySQL", "MongoDB", "Redis",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "CI/CD", "Git",
    "REST API", "GraphQL", "Microservices", "Machine Learning", "Deep Learning",
    "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "SQL",
    "Java", "Spring Boot", "Go", "Rust", "Flutter", "React Native",
    "Kafka", "Elasticsearch", "Terraform", "Ansible", "Linux",
    "System Design", "Data Structures", "LLM", "RAG", "MLOps",
    "dbt", "Spark", "PySpark", "Airflow", "Tableau", "Power BI",
    "Agile", "Scrum", "Product Management", "A/B Testing", "Statistics",
    "NLP", "Computer Vision", "Feature Engineering", "MLflow", "XGBoost",
]


def extract_skills_static(text: str) -> list[str]:
    """Fast skill extraction using predefined TECH_SKILLS plus discovered skills."""
    if not text:
        return []
    discovered = get_discovered_skills()
    all_skills = []
    seen = set()
    for skill in TECH_SKILLS + discovered:
        normalized = skill.strip().lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        all_skills.append(skill)

    found = []
    for skill in all_skills:
        pattern = re.compile(rf"\b{re.escape(skill)}\b", re.IGNORECASE)
        if pattern.search(text):
            found.append(skill)
    return found


def extract_skills_ai(text: str, job_title: str = "") -> list[str]:
    """AI-powered skill extraction for comprehensive coverage."""
    if not text or len(text.strip()) < 10:
        return []
    
    try:
        prompt = f"""Extract all technical and professional skills from this job description.
Include programming languages, frameworks, tools, methodologies, soft skills, and domain expertise.

Job Title: {job_title}
Description: {text[:2000]}

Return ONLY a valid JSON array of skills (no markdown, no explanation):
["skill1", "skill2", "skill3", ...]

Be specific and include emerging technologies, frameworks, and tools."""
        
        message = _get_client().messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        raw = message.content[0].text.strip()
        # Clean up potential markdown
        raw = re.sub(r"```json|```", "", raw).strip()
        
        # Extract JSON array
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            skills = json.loads(raw[start:end])
            return [s.strip() for s in skills if isinstance(s, str) and len(s.strip()) > 1]
    except Exception as e:
        logger.warning(f"AI skill extraction failed: {e}")
    
    return []


def get_discovered_skills() -> list[str]:
    """Fetch previously discovered skills from database."""
    try:
        result = supabase_admin.table("discovered_skills").select("skill").execute()
        return [row["skill"] for row in (result.data or []) if row.get("skill")]
    except Exception as e:
        logger.warning(f"Failed to fetch discovered skills: {e}")
        return []


def store_discovered_skill(skill: str) -> bool:
    """Store a newly discovered skill in the database."""
    if not skill or len(skill.strip()) < 2:
        return False
    try:
        supabase_admin.table("discovered_skills").insert({
            "skill": skill.strip(),
        }).execute()
        return True
    except Exception as e:
        logger.warning(f"Failed to store discovered skill '{skill}': {e}")
        return False


def extract_skills_hybrid(text: str, job_title: str = "", use_ai: bool = True) -> list[str]:
    """
    Hybrid skill extraction: Fast static matching + AI for unknown skills.
    
    Args:
        text: Job description text
        job_title: Job title for AI context
        use_ai: Whether to use AI extraction (set False to skip if budget is tight)
    
    Returns:
        List of unique skills found
    """
    if not text:
        return []
    
    # Step 1: Fast static matching
    static_skills = extract_skills_static(text)
    all_skills = set(static_skills)
    
    # Step 2: AI extraction for comprehensive coverage
    if use_ai:
        ai_skills = extract_skills_ai(text, job_title)
        
        # Step 3: Identify new skills not in static list
        new_skills = [s for s in ai_skills if s not in all_skills and s.lower() not in [sk.lower() for sk in all_skills]]
        
        # Step 4: Store newly discovered skills
        for skill in new_skills:
            store_discovered_skill(skill)
        
        all_skills.update(ai_skills)
    
    return list(all_skills)


def extract_skills(text: str) -> list[str]:
    """Default skill extraction (hybrid approach with AI enabled)."""
    return extract_skills_hybrid(text, use_ai=True)


def score_job_match(job_skills: list[str], resume_skills: list[str]) -> int:
    """Returns 0–100 match score between job skills and resume skills."""
    if not job_skills or not resume_skills:
        return 50
    resume_lower = {s.lower() for s in resume_skills}
    matches = sum(1 for s in job_skills if s.lower() in resume_lower)
    return round((matches / len(job_skills)) * 100)


async def fetch_adzuna_jobs(role: str, location: str = "india", page: int = 1) -> list[dict]:
    """Fetch jobs from Adzuna API (free, India-focused)."""
    if not settings.adzuna_app_id:
        logger.warning("ADZUNA_APP_ID not set — skipping")
        return []

    url = f"https://api.adzuna.com/v1/api/jobs/in/search/{page}"
    params = {
        "app_id":           settings.adzuna_app_id,
        "app_key":          settings.adzuna_app_key,
        "results_per_page": 50,
        "what":             role,
        "where":            location,
        "sort_by":          "date",
        "content-type":     "application/json",
    }

    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Adzuna fetch error: {e}")
            return []

    jobs = []
    for j in data.get("results", []):
        text = f"{j.get('title', '')} {j.get('description', '')}"
        job_title = j.get("title", "")
        jobs.append({
            "external_id":     f"adzuna_{j['id']}",
            "source":          "adzuna",
            "title":           job_title.strip(),
            "company":         j.get("company", {}).get("display_name", "Unknown"),
            "location":        j.get("location", {}).get("display_name", location),
            "salary_min":      int(j["salary_min"]) if j.get("salary_min") else None,
            "salary_max":      int(j["salary_max"]) if j.get("salary_max") else None,
            "salary_currency": "INR",
            "description":     j.get("description", ""),
            "skills":          extract_skills_static(text),
            "apply_url":       j.get("redirect_url", ""),
            "job_type":        j.get("contract_time", "full-time"),
            "posted_at":       j.get("created"),
            "fetched_at":      datetime.now(timezone.utc).isoformat(),
            "is_active":       True,
        })

    logger.info(f"Adzuna: fetched {len(jobs)} jobs for '{role}'")
    return jobs


async def fetch_remotive_jobs(role: str = "") -> list[dict]:
    """Fetch remote tech jobs from Remotive (free, no credentials needed)."""
    categories = ["software-dev", "devops-sysadmin", "data", "backend"]
    all_jobs = []

    async with httpx.AsyncClient(timeout=6) as client:
        for category in categories:
            try:
                params: dict = {"category": category, "limit": 50}
                if role:
                    params["search"] = role
                resp = await client.get("https://remotive.com/api/remote-jobs", params=params)
                resp.raise_for_status()
                data = resp.json()

                for j in data.get("jobs", []):
                    desc_html = j.get("description", "")
                    desc = re.sub(r"<[^>]+>", " ", desc_html)[:2000].strip()
                    title = j.get("title", "").strip()
                    all_jobs.append({
                        "external_id":     f"remotive_{j['id']}",
                        "source":          "remotive",
                        "title":           title,
                        "company":         j.get("company_name", ""),
                        "location":        j.get("candidate_required_location") or "Remote",
                        "salary_min":      None,
                        "salary_max":      None,
                        "salary_currency": "USD",
                        "description":     desc,
                        "skills":          extract_skills_static(f"{title} {desc}"),
                        "apply_url":       j.get("url", ""),
                        "job_type":        j.get("job_type", "full_time").replace("_", " "),
                        "posted_at":       j.get("publication_date"),
                        "fetched_at":      datetime.now(timezone.utc).isoformat(),
                        "is_active":       True,
                    })
            except Exception as e:
                logger.warning(f"Remotive fetch error ({category}): {e}")

    logger.info(f"Remotive: fetched {len(all_jobs)} jobs for '{role}'")
    return all_jobs


async def fetch_arbeitnow_jobs() -> list[dict]:
    """Fetch remote tech jobs from Arbeitnow (free, no credentials needed)."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("https://www.arbeitnow.com/api/job-board-api")
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.warning(f"Arbeitnow fetch error: {e}")
        return []

    jobs = []
    for j in data.get("data", [])[:60]:
        title = j.get("title", "").strip()
        desc = re.sub(r"<[^>]+>", " ", j.get("description", ""))[:2000].strip()
        created = j.get("created_at")
        posted = (
            datetime.fromtimestamp(created, tz=timezone.utc).isoformat()
            if created else None
        )
        jobs.append({
            "external_id": f"arbeitnow_{j['slug']}",
            "source":      "arbeitnow",
            "title":       title,
            "company":     j.get("company_name", ""),
            "location":    j.get("location") or "Remote",
            "description": desc,
            "skills":      extract_skills_static(f"{title} {desc}"),
            "apply_url":   j.get("url", ""),
            "job_type":    "remote" if j.get("remote") else "full-time",
            "posted_at":   posted,
            "fetched_at":  datetime.now(timezone.utc).isoformat(),
            "is_active":   True,
        })

    logger.info(f"Arbeitnow: fetched {len(jobs)} jobs")
    return jobs


async def fetch_linkedin_jobs(role: str, location: str = "India") -> list[dict]:
    """Fetch LinkedIn jobs via RapidAPI."""
    if not settings.rapidapi_key:
        return []

    url = "https://linkedin-job-search-api.p.rapidapi.com/active-jb-7d"
    headers = {
        "X-RapidAPI-Key":  settings.rapidapi_key,
        "X-RapidAPI-Host": "linkedin-job-search-api.p.rapidapi.com",
    }
    params = {"title": role, "location": location, "page": "1"}

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"LinkedIn fetch error: {e}")
            return []

    jobs = []
    for j in (data if isinstance(data, list) else []):
        desc = j.get("job_description") or j.get("description") or ""
        title = j.get("job_title") or j.get("title") or ""
        jobs.append({
            "external_id":     f"linkedin_{j.get('job_id') or j.get('id', '')}",
            "source":          "linkedin",
            "title":           title.strip(),
            "company":         j.get("company_name") or j.get("company", ""),
            "location":        j.get("job_location") or j.get("location", ""),
            "salary_min":      None,
            "salary_max":      None,
            "salary_currency": "INR",
            "description":     desc,
            "skills":          j.get("job_skills") or extract_skills(f"{title} {desc}"),
            "apply_url":       j.get("linkedin_job_url") or j.get("url", ""),
            "job_type":        j.get("employment_type", "full-time"),
            "posted_at":       j.get("posted_date"),
            "fetched_at":      datetime.now(timezone.utc).isoformat(),
            "is_active":       True,
        })

    logger.info(f"LinkedIn: fetched {len(jobs)} jobs for '{role}'")
    return jobs


async def fetch_google_jobs(role: str, location: str = "India") -> list[dict]:
    """Fetch Google Jobs via SerpAPI."""
    if not settings.serpapi_key:
        return []

    import hashlib
    url = "https://serpapi.com/search.json"
    params = {
        "engine":  "google_jobs",
        "q":       f"{role} jobs in {location}",
        "api_key": settings.serpapi_key,
        "hl":      "en",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"SerpAPI fetch error: {e}")
            return []

    jobs = []
    for j in data.get("jobs_results", []):
        desc = j.get("description", "")
        title = j.get("title", "")
        uid = hashlib.md5(f"{title}{j.get('company_name','')}".encode()).hexdigest()[:16]
        jobs.append({
            "external_id":     f"google_{uid}",
            "source":          "google",
            "title":           title.strip(),
            "company":         j.get("company_name", ""),
            "location":        j.get("location", ""),
            "salary_min":      None,
            "salary_max":      None,
            "salary_currency": "INR",
            "description":     desc,
            "skills":          extract_skills(f"{title} {desc}"),
            "apply_url":       (j.get("related_links") or [{}])[0].get("link", ""),
            "job_type":        j.get("detected_extensions", {}).get("schedule_type", "full-time"),
            "posted_at":       j.get("detected_extensions", {}).get("posted_at"),
            "fetched_at":      datetime.now(timezone.utc).isoformat(),
            "is_active":       True,
        })

    logger.info(f"Google Jobs: fetched {len(jobs)} for '{role}'")
    return jobs


_JOB_COLUMNS = {
    "external_id", "source", "title", "company", "location",
    "description", "apply_url", "is_active", "fetched_at",
    "posted_at", "salary_min", "salary_max", "salary_currency",
    "skills", "job_type",
}


def _clean(job: dict) -> dict:
    """Strip any keys that aren't real columns to avoid 'column does not exist' errors."""
    return {k: v for k, v in job.items() if k in _JOB_COLUMNS}


def upsert_jobs(jobs: list[dict]) -> int:
    """Save jobs to Supabase. Updates if external_id already exists."""
    if not jobs:
        return 0
    valid = [_clean(j) for j in jobs if j.get("external_id")]
    if not valid:
        return 0
    try:
        supabase_admin.table("jobs").upsert(valid, on_conflict="external_id").execute()
        logger.info(f"Upserted {len(valid)} jobs")
        return len(valid)
    except Exception as e:
        logger.error(f"Upsert failed: {e}")
        # Retry with only the columns confirmed to exist from the manual insert
        core_cols = {"external_id", "source", "title", "company", "location",
                     "description", "apply_url", "is_active", "fetched_at", "posted_at"}
        minimal = [{k: v for k, v in j.items() if k in core_cols} for j in valid]
        try:
            supabase_admin.table("jobs").upsert(minimal, on_conflict="external_id").execute()
            logger.info(f"Upserted {len(minimal)} jobs (minimal columns)")
            return len(minimal)
        except Exception as e2:
            logger.error(f"Minimal upsert also failed: {e2}")
            return 0


def has_fresh_cache(role: str, location: str) -> bool:
    """Check if we already have fresh results for this query (< 2 hours old)."""
    from datetime import timedelta
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)).isoformat()
        result = (
            supabase_admin.table("jobs")
            .select("id", count="exact")
            .ilike("title", f"%{role}%")
            .gte("fetched_at", cutoff)
            .or_("is_active.eq.true,is_active.is.null")
            .execute()
        )
        return (result.count or 0) >= 5
    except Exception as e:
        logger.warning(f"has_fresh_cache failed: {e}")
        return False  # treat as stale so a fresh fetch is attempted