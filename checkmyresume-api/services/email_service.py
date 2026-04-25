import resend
from config import get_settings
from loguru import logger

settings = get_settings()
resend.api_key = settings.resend_api_key


def send_welcome_email(to: str, name: str):
    try:
        resend.Emails.send({
            "from":    "AtsBrain <hello@atsbrain.in>",
            "to":      to,
            "subject": "Welcome to AtsBrain 🎉",
            "html":    f"""
                <h2>Hi {name}! Welcome to AtsBrain.</h2>
                <p>You're all set to start optimizing your resume and finding your next role.</p>
                <p>Start by uploading your resume and analyzing it for your target role.</p>
                <a href="https://atsbrain.in/dashboard/analyze"
                   style="background:#1a73e8;color:#fff;padding:12px 24px;
                          border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
                  Analyze My Resume
                </a>
            """,
        })
        logger.info(f"Welcome email sent to {to}")
    except Exception as e:
        logger.error(f"Email error: {e}")


def send_payment_confirmation(to: str, name: str, plan: str, amount: int):
    try:
        resend.Emails.send({
            "from":    "AtsBrain <hello@atsbrain.in>",
            "to":      to,
            "subject": f"Payment confirmed — {plan} plan activated ✓",
            "html":    f"""
                <h2>Payment Confirmed</h2>
                <p>Hi {name}, your <strong>{plan}</strong> plan is now active.</p>
                <p>Amount paid: ₹{amount // 100}</p>
                <p>You now have unlimited ATS scans, all job listings, and cover letter generation.</p>
                <a href="https://atsbrain.in/dashboard"
                   style="background:#1a73e8;color:#fff;padding:12px 24px;
                          border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
                  Go to Dashboard
                </a>
            """,
        })
    except Exception as e:
        logger.error(f"Payment email error: {e}")


def send_job_alert(to: str, name: str, role: str, jobs: list[dict]):
    job_html = "".join(
        f'<li><strong>{j["title"]}</strong> at {j["company"]} — {j.get("location","")}'
        f'<a href="{j["apply_url"]}"> Apply →</a></li>'
        for j in jobs[:5]
    )
    try:
        resend.Emails.send({
            "from":    "AtsBrain <alerts@atsbrain.in>",
            "to":      to,
            "subject": f"🔔 {len(jobs)} new {role} jobs in India",
            "html":    f"""
                <h2>New jobs matching your profile</h2>
                <p>Hi {name}, here are the latest <strong>{role}</strong> listings:</p>
                <ul>{job_html}</ul>
                <a href="https://atsbrain.in/dashboard/jobs"
                   style="background:#1a73e8;color:#fff;padding:12px 24px;
                          border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
                  View All Jobs
                </a>
            """,
        })
    except Exception as e:
        logger.error(f"Job alert email error: {e}")
