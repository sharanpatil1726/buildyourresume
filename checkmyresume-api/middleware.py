from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_supabase
from loguru import logger

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Validates Supabase JWT token sent from frontend.
    Returns the user object if valid.
    Usage: add `user = Depends(get_current_user)` to any route.
    """
    token = credentials.credentials
    supabase = get_supabase()

    try:
        # Supabase verifies the JWT and returns user data
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return response.user
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_profile(user=Depends(get_current_user)):
    """Returns the user's profile from DB (includes plan, scan counts)."""
    from database import supabase_admin
    result = (
        supabase_admin.table("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data


async def require_pro(profile=Depends(get_current_profile)):
    """Gate routes behind Pro/Career plan."""
    if profile["plan"] not in ("pro", "career"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a Pro plan. Upgrade at /pricing.",
        )
    return profile