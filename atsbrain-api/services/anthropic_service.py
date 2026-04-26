import json
import re
import anthropic
from config import get_settings
from loguru import logger

settings = get_settings()
_anthropic_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client

# ─────────────────────────────────────────
# COMPREHENSIVE ROLE-SPECIFIC KEYWORDS DATABASE
# ─────────────────────────────────────────
ROLE_KEYWORDS = {
    "Data Scientist": {
        "core": ["Python", "SQL", "Pandas", "NumPy", "Scikit-learn", "Statistics", "Machine Learning", "A/B Testing", "Data Analysis", "Tableau", "Power BI"],
        "advanced": ["TensorFlow", "PyTorch", "Deep Learning", "Feature Engineering", "MLflow", "Spark", "PySpark", "Computer Vision", "NLP", "Model Deployment", "Jupyter", "XGBoost", "Keras"],
        "tools": ["Excel", "Tableau", "Power BI", "Looker", "Metabase", "AWS SageMaker", "Google Cloud AI"],
        "soft": ["Communication", "Problem-solving", "Stakeholder Management", "Storytelling", "Critical Thinking"]
    },
    "Backend Engineer": {
        "core": ["Python", "Node.js", "Java", "FastAPI", "Django", "Flask", "REST API", "SQL", "PostgreSQL", "MongoDB"],
        "advanced": ["Docker", "Kubernetes", "Microservices", "AWS", "CI/CD", "Git", "System Design", "Message Queues", "Redis", "GraphQL", "gRPC"],
        "tools": ["Docker", "Kubernetes", "Jenkins", "GitHub Actions", "GitLab CI", "AWS Lambda", "Apache Kafka"],
        "soft": ["Code Review", "Documentation", "Debugging", "Mentoring", "Architectural Thinking"]
    },
    "Frontend Engineer": {
        "core": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "REST API", "Vue.js", "Angular"],
        "advanced": ["Next.js", "Redux", "Testing", "Performance Optimization", "Accessibility", "Webpack", "Babel", "Web Components"],
        "tools": ["Figma", "DevTools", "Postman", "Jest", "Cypress", "Webpack", "Vite"],
        "soft": ["UI/UX Design", "User Empathy", "Problem-solving", "Attention to Detail"]
    },
    "Full Stack Engineer": {
        "core": ["JavaScript", "React", "Node.js", "SQL", "REST API", "HTML", "CSS", "PostgreSQL", "MongoDB"],
        "advanced": ["Docker", "AWS", "CI/CD", "System Design", "Database Design", "Next.js", "Express.js"],
        "tools": ["Docker", "Git", "GitHub Actions", "AWS", "Firebase", "Heroku"],
        "soft": ["Full-stack thinking", "Communication", "Problem-solving", "Time Management"]
    },
    "DevOps Engineer": {
        "core": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Bash", "Git", "Jenkins"],
        "advanced": ["Terraform", "Ansible", "CloudFormation", "Prometheus", "ELK Stack", "Helm", "ArgoCD"],
        "tools": ["Docker", "Kubernetes", "Jenkins", "GitLab CI", "GitHub Actions", "Terraform", "Ansible"],
        "soft": ["Problem-solving", "Automation mindset", "Documentation", "System thinking"]
    },
    "Data Engineer": {
        "core": ["Python", "SQL", "Spark", "PySpark", "Hadoop", "ETL", "Data Warehouse", "Airflow"],
        "advanced": ["Scala", "Kafka", "Flink", "dbt", "Snowflake", "BigQuery", "Delta Lake"],
        "tools": ["Apache Spark", "Airflow", "Kafka", "dbt", "Snowflake", "BigQuery", "PostgreSQL"],
        "soft": ["Problem-solving", "Data thinking", "Communication", "Debugging"]
    },
    "Mobile Developer": {
        "core": ["React Native", "Flutter", "Swift", "Kotlin", "Java", "REST API", "Mobile UI/UX"],
        "advanced": ["Native Development", "Cross-platform", "App Optimization", "Firebase", "Push Notifications"],
        "tools": ["Xcode", "Android Studio", "Flutter", "React Native", "Firebase", "TestFlight"],
        "soft": ["Attention to Detail", "User Experience Focus", "Problem-solving"]
    },
    "Product Manager": {
        "core": ["Product Strategy", "User Research", "Roadmapping", "Market Analysis", "Stakeholder Management", "Metrics & Analytics"],
        "advanced": ["A/B Testing", "User Interviews", "Competitive Analysis", "OKRs", "Data-driven Decisions"],
        "tools": ["Jira", "Confluence", "Figma", "Amplitude", "Mixpanel", "Google Analytics"],
        "soft": ["Leadership", "Communication", "Problem-solving", "Negotiation", "Vision"]
    },
    "ML Engineer": {
        "core": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Model Training"],
        "advanced": ["MLOps", "Model Deployment", "Feature Engineering", "NLP", "Computer Vision", "Reinforcement Learning"],
        "tools": ["TensorFlow", "PyTorch", "MLflow", "Jupyter", "Weights & Biases", "Docker"],
        "soft": ["Research mindset", "Problem-solving", "Communication", "Experimentation"]
    },
    "QA Engineer": {
        "core": ["Testing", "Automation", "Selenium", "Test Cases", "Bug Tracking", "Quality Assurance"],
        "advanced": ["API Testing", "Performance Testing", "Load Testing", "Cypress", "TestNG", "CI/CD Integration"],
        "tools": ["Selenium", "Cypress", "JMeter", "Postman", "JIRA", "TestRail"],
        "soft": ["Attention to Detail", "Problem-solving", "Communication", "Patience"]
    }
}

ACTION_VERBS = [
    # Leadership & Management
    "led", "managed", "directed", "coordinated", "supervised", "mentored", "guided",
    # Development & Building
    "developed", "designed", "implemented", "built", "created", "engineered", "architected",
    # Optimization & Improvement
    "optimized", "improved", "enhanced", "refined", "streamlined", "accelerated", "expedited",
    # Growth & Achievement
    "increased", "boosted", "grew", "achieved", "delivered", "accomplished", "attained",
    # Technical Skills
    "deployed", "automated", "integrated", "configured", "migrated", "scaled", "refactored",
    # Problem Solving & Analysis
    "analyzed", "diagnosed", "solved", "resolved", "debugged", "investigated", "researched",
    # Communication & Collaboration
    "communicated", "collaborated", "liaised", "presented", "advocated", "negotiated",
    # Results-Oriented
    "reduced", "decreased", "cut", "minimized", "eliminated", "pioneered", "launched"
]

# Metrics patterns to detect achievements
METRICS_PATTERNS = [
    r'\d+%',  # percentages
    r'\$\d+[KMB]?',  # currency
    r'\d+[xX]',  # multiplication
    r'\d+\s*(hours?|days?|weeks?|months?|years?)',  # time
    r'\d+\s*(users?|customers?|clients?|projects?|features?|transactions?)',  # counts
    r'[\d.]+\s*seconds?|ms',  # speed metrics
    r'\d+\s*%\s*(increase|decrease|growth|improvement|reduction)',  # percent change
]


def get_keywords_for_role(target_role: str) -> dict:
    """Return keywords for a given role, default to generic tech if not found."""
    role_match = next((r for r in ROLE_KEYWORDS if r.lower() == target_role.lower()), None)
    if role_match:
        return ROLE_KEYWORDS[role_match]
    # Fallback for unknown roles
    return {
        "core": ["experience", "skills", "projects", "education", "knowledge"],
        "advanced": ["technical", "leadership", "results", "impact", "innovation"],
        "tools": ["tools", "software", "platforms"],
        "soft": ["communication", "teamwork", "collaboration", "problem-solving"]
    }


def calculate_keyword_score(resume_text: str, target_role: str) -> int:
    """Calculate keyword match score (0-100) with sophisticated pattern matching."""
    keywords = get_keywords_for_role(target_role)
    resume_lower = resume_text.lower()
    
    # Exact word boundary matching
    core_found = sum(1 for kw in keywords.get("core", []) if re.search(rf'\b{re.escape(kw.lower())}\b', resume_lower))
    core_score = (core_found / len(keywords.get("core", [1]))) * 100 if keywords.get("core") else 0
    
    adv_found = sum(1 for kw in keywords.get("advanced", []) if re.search(rf'\b{re.escape(kw.lower())}\b', resume_lower))
    adv_score = (adv_found / len(keywords.get("advanced", [1]))) * 100 if keywords.get("advanced") else 0
    
    tools_found = sum(1 for kw in keywords.get("tools", []) if re.search(rf'\b{re.escape(kw.lower())}\b', resume_lower))
    tools_score = (tools_found / len(keywords.get("tools", [1]))) * 100 if keywords.get("tools") else 0
    
    soft_found = sum(1 for kw in keywords.get("soft", []) if re.search(rf'\b{re.escape(kw.lower())}\b', resume_lower))
    soft_score = (soft_found / len(keywords.get("soft", [1]))) * 100 if keywords.get("soft") else 0
    
    # Weighted scoring: 40% core, 30% advanced, 20% tools, 10% soft
    keyword_score = (core_score * 0.40) + (adv_score * 0.30) + (tools_score * 0.20) + (soft_score * 0.10)
    return int(min(100, keyword_score))


def calculate_format_score(resume_text: str) -> int:
    """Evaluate resume formatting with comprehensive checks."""
    score = 100
    
    # Contact Information
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
    if not email_match:
        score -= 20
    
    phone_match = re.search(r'\+?[\d\s\-()]{10,}', resume_text)
    if not phone_match:
        score -= 15
    
    # LinkedIn/Portfolio presence
    if re.search(r'linkedin|github|portfolio|website', resume_text, re.IGNORECASE):
        score += 5
    
    # Professional Summary/Profile
    summary_keywords = ["summary", "professional", "objective", "profile", "about"]
    has_summary = any(re.search(rf'\b{kw}\b', resume_text, re.IGNORECASE) for kw in summary_keywords)
    if not has_summary:
        score -= 15
    else:
        score += 3
    
    # Required Sections
    required_sections = {
        "experience": -10,
        "education": -10,
        "skills": -10
    }
    for section, penalty in required_sections.items():
        if section not in resume_text.lower():
            score += penalty
    
    # ATS-unfriendly elements
    unfriendly_elements = ["table", "graph", "chart", "image", "photo", "picture"]
    for element in unfriendly_elements:
        if element in resume_text.lower():
            score -= 8
    
    # Proper date formatting (boost score if found)
    date_formats = [
        r'\d{1,2}/\d{4}',  # MM/YYYY
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b',  # Month YYYY
        r'\d{4}\s*-\s*\d{4}',  # YYYY-YYYY
        r'present|current|ongoing'  # Current role indicator
    ]
    date_matches = sum(1 for fmt in date_formats if re.search(fmt, resume_text, re.IGNORECASE))
    if date_matches > 0:
        score += 5
    
    # Consistent formatting check
    if re.search(r'[A-Z]{5,}', resume_text):  # Excessive caps
        score -= 5
    
    # Proper line breaks and spacing
    lines = resume_text.split('\n')
    non_empty_lines = [l for l in lines if l.strip()]
    if len(non_empty_lines) > 10:
        score += 3
    
    return max(0, min(100, score))


def calculate_content_score(resume_text: str) -> int:
    """Evaluate content quality with sophisticated metrics detection."""
    score = 60  # baseline
    
    lines = resume_text.split('\n')
    bullet_count = sum(1 for line in lines if re.match(r'^[\s]*[-•*→]', line))
    
    # Action Verbs Analysis
    action_verb_matches = sum(1 for verb in ACTION_VERBS if re.search(rf'\b{verb}\b', resume_text, re.IGNORECASE))
    action_verb_score = min(20, (action_verb_matches / 8) * 20)  # Expect at least 8 different verbs
    score += action_verb_score
    
    # Quantified Metrics (Multiple Pattern Detection)
    metric_matches = 0
    for pattern in METRICS_PATTERNS:
        matches = len(re.findall(pattern, resume_text, re.IGNORECASE))
        metric_matches += matches
    metric_score = min(20, metric_matches)  # Cap at 20 points
    score += metric_score
    
    # Bullet Point Quality
    if bullet_count >= 15:
        score += 8
    elif bullet_count >= 8:
        score += 5
    elif bullet_count > 0:
        score += 2
    else:
        score -= 10
    
    # Achievement/Impact Keywords
    impact_words = ["impact", "result", "achievement", "outcome", "delivered", "achieved", "created", "built", "transformed"]
    impact_count = sum(1 for word in impact_words if re.search(rf'\b{word}\b', resume_text, re.IGNORECASE))
    score += min(5, impact_count)
    
    # Check for specific achievements (numbers followed by impact)
    achievement_patterns = [
        r'\d+%\s*(increase|growth|improvement|reduction)',
        r'(increased|improved|reduced|boosted|doubled)\s+\w+\s+by\s+\d+',
        r'saved?\s+\$?\d+[KM]?'
    ]
    achievement_count = sum(len(re.findall(p, resume_text, re.IGNORECASE)) for p in achievement_patterns)
    score += min(10, achievement_count * 2)
    
    return int(max(0, min(100, score)))


def calculate_readability_score(resume_text: str) -> int:
    """Evaluate readability with advanced clarity checks."""
    score = 100
    
    lines = resume_text.split('\n')
    word_count = len(resume_text.split())
    sentence_count = len(re.split(r'[.!?]', resume_text))
    
    # Optimal length: 400-700 words (1 page)
    if word_count < 300:
        score -= 15
    elif word_count > 900:
        score -= 10
    elif 400 <= word_count <= 700:
        score += 10
    
    # Average sentence length (too long = hard to read)
    if sentence_count > 0:
        avg_sentence_length = word_count / sentence_count
        if 10 <= avg_sentence_length <= 20:
            score += 5
        elif avg_sentence_length > 30:
            score -= 10
    
    # Paragraph structure
    empty_lines = sum(1 for line in lines if line.strip() == "")
    total_lines = len(lines)
    if total_lines > 0:
        whitespace_ratio = empty_lines / total_lines
        if 0.15 <= whitespace_ratio <= 0.35:
            score += 5
        elif whitespace_ratio > 0.5:
            score -= 10
    
    # Grammar and Spelling Checks
    typos = len(re.findall(
        r'\b(th[ae]ir|teh|recieve|accommodate|seperate|occured|definately|untill|occassion)\b',
        resume_text, re.IGNORECASE
    ))
    score -= min(25, typos * 3)
    
    # Consistency checks
    if re.search(r'[A-Z]{6,}', resume_text):  # Excessive ALL CAPS
        score -= 8
    
    # Punctuation quality
    if resume_text.count('!!!') > 0 or resume_text.count('???') > 0:
        score -= 5
    
    # Check for repetitive words
    words = resume_text.lower().split()
    if len(words) > 0:
        word_freq = {}
        for word in words:
            if len(word) > 4:  # Only count meaningful words
                word_freq[word] = word_freq.get(word, 0) + 1
        overly_repeated = sum(1 for count in word_freq.values() if count > len(words) * 0.08)
        score -= min(10, overly_repeated)
    
    # Consistency in tense (past tense preferred for past roles)
    past_tense_count = len(re.findall(r'\b(developed|managed|created|designed|built)\b', resume_text, re.IGNORECASE))
    present_tense_count = len(re.findall(r'\b(develop|manage|create|design|build)\b', resume_text, re.IGNORECASE))
    if present_tense_count > past_tense_count * 0.5:
        score -= 5
    
    return max(0, min(100, score))


def calculate_ats_score(keyword_score: int, format_score: int, content_score: int, readability_score: int) -> int:
    """Apply weighted formula: 35% keyword, 25% format, 25% content, 15% readability."""
    ats_score = (
        (keyword_score * 0.35) +
        (format_score * 0.25) +
        (content_score * 0.25) +
        (readability_score * 0.15)
    )
    return int(ats_score)


def extract_ai_insights(resume_text: str, target_role: str, experience_level: str, scores: dict) -> dict:
    """Use Claude to extract enriched insights with market context."""
    
    insight_prompt = f"""Analyze this resume for the {target_role} role (experience level: {experience_level}).
    
CURRENT SCORING:
- Keyword Match: {scores['keyword_score']}/100
- Format Quality: {scores['format_score']}/100  
- Content Quality: {scores['content_score']}/100
- Readability: {scores['readability_score']}/100

RESUME TEXT:
{resume_text[:3000]}

Extract and return ONLY valid JSON (no markdown, no explanation):
{{
  "candidate_level": "Entry-level/Junior/Mid-level/Senior/Lead/Principal",
  "years_experience": <exact number or best estimate>,
  "years_in_role": <years in target role specifically>,
  "top_skills": [<list of 5 actual skills found with proficiency level>],
  "missing_keywords": [<list of 4-5 important keywords NOT found>],
  "strengths": [<list of 3 concrete strengths with evidence>],
  "weaknesses": [<list of 3 concrete weaknesses>],
  "quick_fixes": [<list of 3 actionable, specific improvements>],
  "experience_highlights": [<2-3 most impressive achievements found>],
  "market_demand": {{
    "role_demand": "Very High/High/Medium/Low/Declining",
    "avg_salary_range": "₹X–Y LPA",
    "years_in_demand": "2-3 years",
    "hot_industries": [<top 3-4 industries>],
    "trending_skills": [<3-4 trending skills for this role>],
    "market_trend": "Growing/Stable/Declining/Shifting"
  }},
  "interview_likelihood": {{
    "overall": <0-100>,
    "tech_companies": <0-100>,
    "startups": <0-100>,
    "enterprise": <0-100>,
    "remote_roles": <0-100>
  }},
  "gap_analysis": {{
    "skill_gaps": [<skills to acquire for growth>],
    "experience_gaps": [<experience areas to build>],
    "estimated_learning_time": "<time to close gaps>"
  }},
  "career_path": "<2-3 sentence career progression recommendation>",
  "verdict": "<1-2 sentence resume quality summary>",
  "top_recommendation": "<single most important improvement>",
  "secondary_recommendations": [<2-3 other important improvements>]
}}"""
    
    try:
        message = _get_client().messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": insight_prompt}]
        )
        raw = message.content[0].text
        raw = re.sub(r"```json|```", "", raw).strip()
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except Exception as e:
        logger.error(f"AI insights extraction failed: {e}")
        return {
            "candidate_level": "Unknown",
            "years_experience": 0,
            "top_skills": [],
            "missing_keywords": [],
            "strengths": [],
            "weaknesses": [],
            "quick_fixes": [],
            "verdict": "Unable to extract insights",
            "top_recommendation": "Review resume for clarity and impact",
            "market_demand": {},
            "interview_likelihood": {},
            "gap_analysis": {},
            "experience_highlights": []
        }


def analyze_resume(resume_text: str, target_role: str, experience_level: str) -> dict:
    """
    Hybrid approach: Rule-based scoring + AI for rich insights.
    More consistent, faster, and deterministic than pure LLM scoring.
    """
    logger.info(f"Analyzing resume for role: {target_role}")
    
    # ── RULE-BASED SCORING (deterministic & consistent)
    keyword_score = calculate_keyword_score(resume_text, target_role)
    format_score = calculate_format_score(resume_text)
    content_score = calculate_content_score(resume_text)
    readability_score = calculate_readability_score(resume_text)
    ats_score = calculate_ats_score(keyword_score, format_score, content_score, readability_score)
    
    logger.info(f"Scores - ATS: {ats_score}, Keyword: {keyword_score}, Format: {format_score}, Content: {content_score}, Readability: {readability_score}")
    
    # ── AI-POWERED INSIGHTS (for context & recommendations)
    scores = {
        "keyword_score": keyword_score,
        "format_score": format_score,
        "content_score": content_score,
        "readability_score": readability_score
    }
    ai_insights = extract_ai_insights(resume_text, target_role, experience_level, scores)
    
    # ── DETAILED ATS BREAKDOWN
    ats_breakdown = {
        "has_contact_info": bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)),
        "has_phone": bool(re.search(r'\+?[\d\s\-()]{10,}', resume_text)),
        "has_summary": bool(re.search(r'(summary|professional|objective|profile|about)', resume_text, re.IGNORECASE)),
        "has_quantified_achievements": len(re.findall(r'\d+%|\$\d+K?|[\d.]+x', resume_text)) > 3,
        "uses_strong_action_verbs": len([v for v in ACTION_VERBS[:15] if re.search(rf'\b{v}\b', resume_text, re.IGNORECASE)]) >= 5,
        "proper_date_format": bool(re.search(r'\d{1,2}/\d{4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b', resume_text, re.IGNORECASE)),
        "ats_safe_format": format_score > 70,
        "has_skills_section": bool(re.search(r'skills?|technical|competencies?|technical_skills', resume_text, re.IGNORECASE)),
        "has_education": bool(re.search(r'education|degree|bachelor|master|b\.s|m\.s|university|college|b\.|m\.', resume_text, re.IGNORECASE)),
        "no_tables_graphics": 'table' not in resume_text.lower() and 'graphic' not in resume_text.lower(),
        "consistent_formatting": not re.search(r'[A-Z]{6,}', resume_text),
        "good_bullet_structure": len([l for l in resume_text.split('\n') if re.match(r'^[\s]*[-•*→]', l)]) >= 8,
    }
    
    # ── COMBINE RESULTS
    result = {
        "ats_score": ats_score,
        "keyword_score": keyword_score,
        "format_score": format_score,
        "content_score": content_score,
        "readability_score": readability_score,
        "score_improvement_potential": max(0, 95 - ats_score),
        "candidate_level": ai_insights.get("candidate_level", "Unknown"),
        "primary_role": target_role,
        "years_experience": ai_insights.get("years_experience", 0),
        "years_in_role": ai_insights.get("years_in_role", 0),
        "top_skills": ai_insights.get("top_skills", []),
        "missing_keywords": ai_insights.get("missing_keywords", []),
        "experience_highlights": ai_insights.get("experience_highlights", []),
        "strengths": ai_insights.get("strengths", []),
        "weaknesses": ai_insights.get("weaknesses", []),
        "quick_fixes": ai_insights.get("quick_fixes", []),
        "secondary_recommendations": ai_insights.get("secondary_recommendations", []),
        "market_demand": ai_insights.get("market_demand", {}),
        "interview_likelihood": ai_insights.get("interview_likelihood", {}),
        "gap_analysis": ai_insights.get("gap_analysis", {}),
        "career_path": ai_insights.get("career_path", ""),
        "ats_breakdown": ats_breakdown,
        "verdict": ai_insights.get("verdict", "Resume analysis complete"),
        "top_recommendation": ai_insights.get("top_recommendation", "Improve overall quality"),
    }
    
    logger.info(f"Analysis complete. ATS Score: {ats_score}, Candidate Level: {result['candidate_level']}")
    return result


def generate_cover_letter(resume_text: str, target_role: str, company: str = "") -> str:
    """Generates a personalized cover letter using real resume data."""
    message = _get_client().messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": (
                f'Write a professional cover letter for the role of "{target_role}"'
                f'{f" at {company}" if company else ""}. '
                f"Use ONLY real information from this resume — no placeholders. "
                f"3 paragraphs: opening (enthusiasm + fit), middle (2 specific achievements), "
                f"closing (call to action). Professional and direct.\n\n"
                f"Resume:\n{resume_text}"
            )
        }]
    )
    return message.content[0].text


def generate_optimized_resume(resume_text: str, target_role: str, missing_keywords: list = None) -> str:
    """Generate ATS-optimized resume using real candidate information."""
    keywords_str = f"\nPrioritize these keywords: {', '.join(missing_keywords)}" if missing_keywords else ""
    
    message = _get_client().messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": (
                f"Rewrite this resume for the {target_role} role for maximum ATS compatibility.{keywords_str}\n\n"
                f"RULES:\n"
                f"- Use ONLY real information from the original resume\n"
                f"- NO placeholders or generic text\n"
                f"- Start with a 3-4 line professional summary\n"
                f"- Rewrite every achievement with strong action verb + quantified metric\n"
                f"- Add keywords naturally throughout (especially in experience section)\n"
                f"- Use standard section headings: SUMMARY, EXPERIENCE, SKILLS, EDUCATION\n"
                f"- No tables, graphics, or special formatting\n"
                f"- Keep to 1 page\n\n"
                f"Original Resume:\n{resume_text}\n\n"
                f"Return ONLY the optimized resume text, no explanations."
            )
        }]
    )
    return message.content[0].text
