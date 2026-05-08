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
    thinking_enabled: Optional[bool] = True

class ChatResponse(BaseModel):
    reply: str

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Non-streaming endpoint for compatibility."""
    try:
        reply = await query_rag(request.message)
        return ChatResponse(reply=str(reply) if reply else "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    Streaming endpoint — sends typed SSE events as they arrive.
    """
    async def event_generator():
        try:
            async for event in query_rag_stream(request.message, request.history, thinking_enabled=request.thinking_enabled):
                yield f"data: {json.dumps(event)}\n\n"
        except asyncio.CancelledError:
            return
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
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

@router.get("/verify/bank-slip/{ref_no}")
async def verify_bank_slip(ref_no: str):
    from app.services.db_service import get_fee_info
    data = await get_fee_info(ref_no)
    if not data:
        raise HTTPException(status_code=404, detail="Fee record not found")
    return data

@router.get("/verify/roll-slip/{roll_no}")
async def verify_roll_slip(roll_no: str):
    from app.services.db_service import get_student_info
    data = await get_student_info(roll_no)
    if not data:
        raise HTTPException(status_code=404, detail="Student record not found")
    return data
