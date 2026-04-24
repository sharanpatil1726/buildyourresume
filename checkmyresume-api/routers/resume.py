from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from middleware import get_current_user
from database import supabase_admin
from services.parser_service import extract_text
from loguru import logger

router = APIRouter()
MAX_FILE_SIZE = 10 * 1024 * 1024   # 10 MB
ALLOWED_EXTENSIONS = {"pdf", "docx"}


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 10 MB.")

    filename = file.filename or "resume"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF or DOCX resume."
        )

    # Extract text
    try:
        raw_text = extract_text(content, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if len(raw_text.strip()) < 100:
        raise HTTPException(status_code=400, detail="Could not extract text from file. Try copy-pasting instead.")

    # Upload to Supabase Storage
    file_path = f"{user.id}/{file.filename}"
    supabase_admin.storage.from_("resumes").upload(
        file_path, content,
        file_options={"content-type": file.content_type or "application/octet-stream"}
    )

    # Save resume record to DB
    result = supabase_admin.table("resumes").insert({
        "user_id":   user.id,
        "file_name": file.filename,
        "file_path": file_path,
        "raw_text":  raw_text,
    }).execute()

    logger.info(f"Resume uploaded: {file.filename} for user {user.id}")
    return {
        "resume_id": result.data[0]["id"],
        "raw_text":  raw_text,
        "char_count": len(raw_text),
    }


@router.get("/list")
async def list_resumes(user=Depends(get_current_user)):
    result = (
        supabase_admin.table("resumes")
        .select("id, file_name, created_at, is_primary")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user=Depends(get_current_user)):
    supabase_admin.table("resumes").delete().eq("id", resume_id).eq("user_id", user.id).execute()
    return {"message": "Resume deleted"}