from fastapi import APIRouter, Depends, HTTPException
from middleware import get_current_user
from database import supabase_admin
from models import CreateApplicationRequest, UpdateApplicationRequest

router = APIRouter()


@router.get("/")
async def list_applications(user=Depends(get_current_user)):
    result = (
        supabase_admin.table("applications")
        .select("*, jobs(title, company, location)")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/")
async def create_application(body: CreateApplicationRequest, user=Depends(get_current_user)):
    result = supabase_admin.table("applications").insert({
        "user_id":  user.id,
        "job_id":   body.job_id,
        "company":  body.company,
        "role":     body.role,
        "apply_url": body.apply_url,
        "status":   body.status.value,
        "notes":    body.notes,
    }).execute()
    return result.data[0]


@router.patch("/{app_id}")
async def update_application(
    app_id: str,
    body: UpdateApplicationRequest,
    user=Depends(get_current_user),
):
    updates = body.model_dump(exclude_none=True)
    if "status" in updates:
        updates["status"] = updates["status"].value
    result = (
        supabase_admin.table("applications")
        .update(updates)
        .eq("id", app_id)
        .eq("user_id", user.id)
        .execute()
    )
    return result.data[0] if result.data else {}


@router.delete("/{app_id}")
async def delete_application(app_id: str, user=Depends(get_current_user)):
    supabase_admin.table("applications").delete().eq("id", app_id).eq("user_id", user.id).execute()
    return {"message": "Deleted"}


@router.get("/stats")
async def application_stats(user=Depends(get_current_user)):
    result = supabase_admin.table("applications").select("status").eq("user_id", user.id).execute()
    apps = result.data or []
    return {
        "total":     len(apps),
        "saved":     sum(1 for a in apps if a["status"] == "saved"),
        "applied":   sum(1 for a in apps if a["status"] == "applied"),
        "oa_test":   sum(1 for a in apps if a["status"] == "oa_test"),
        "interview": sum(1 for a in apps if a["status"] == "interview"),
        "offer":     sum(1 for a in apps if a["status"] == "offer"),
        "rejected":  sum(1 for a in apps if a["status"] == "rejected"),
    }