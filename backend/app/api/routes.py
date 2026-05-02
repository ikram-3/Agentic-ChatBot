from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import os
import asyncio
from app.services.rag_service import query_rag, query_rag_stream

router = APIRouter()

from typing import Optional, List, Dict

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    reply: str

def get_data_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uos_data.json")

def get_verification_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "verification_data.json")

def load_data():
    try:
        with open(get_data_path(), "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def load_verification_data():
    try:
        with open(get_verification_path(), "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"bank_slips": [], "roll_number_slips": []}

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Non-streaming endpoint for compatibility."""
    try:
        reply = query_rag(request.message)
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """Streaming endpoint – sends tokens as they arrive."""
    async def event_generator():
        try:
            async for chunk in query_rag_stream(request.message, request.history):
                data = json.dumps({"token": chunk})
                yield f"data: {data}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

@router.get("/programs")
async def get_programs():
    data = load_data()
    return data.get("programs", [])

@router.get("/admissions")
async def get_admissions():
    data = load_data()
    return data.get("admissions", {})

@router.get("/fees")
async def get_fees():
    data = load_data()
    return data.get("fees", {})

# ─────────────────────────────────────────────
# Verification Endpoints
# ─────────────────────────────────────────────

@router.get("/verify/bank-slip/{reference_no}")
async def verify_bank_slip(reference_no: str):
    """Verify a bank slip by its reference number."""
    data = load_verification_data()
    slips = data.get("bank_slips", [])
    ref = reference_no.strip().upper()
    result = next((s for s in slips if s["reference_no"].upper() == ref), None)
    if not result:
        raise HTTPException(status_code=404, detail="No record found for this reference number.")
    return result

@router.get("/verify/roll-slip/{roll_no}")
async def verify_roll_slip(roll_no: str):
    """Verify a roll number slip."""
    data = load_verification_data()
    slips = data.get("roll_number_slips", [])
    rn = roll_no.strip().upper()
    result = next((s for s in slips if s["roll_no"].upper() == rn), None)
    if not result:
        raise HTTPException(status_code=404, detail="No roll number slip found for this roll number.")
    return result

@router.get("/verify/student/{query}")
async def verify_student(query: str):
    """Search across both bank slips and roll slips by student name (partial match)."""
    data = load_verification_data()
    q = query.strip().lower()
    results = {
        "bank_slips": [s for s in data.get("bank_slips", []) if q in s["student_name"].lower()],
        "roll_slips": [s for s in data.get("roll_number_slips", []) if q in s["student_name"].lower()]
    }
    if not results["bank_slips"] and not results["roll_slips"]:
        raise HTTPException(status_code=404, detail="No records found for this student name.")
    return results
