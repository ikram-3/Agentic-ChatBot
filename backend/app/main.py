import os
import sys
import asyncio

if sys.platform == 'win32':
    # Force ProactorEventLoop on Windows to support subprocesses
    if not isinstance(asyncio.get_event_loop_policy(), asyncio.WindowsProactorEventLoopPolicy):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("[System] Windows ProactorEventLoopPolicy enforced.")
    else:
        print("[System] Windows ProactorEventLoopPolicy already active.")

    # Extra safety: check current loop implementation if already created.
    try:
        loop = asyncio.get_event_loop()
        if not isinstance(loop, asyncio.WindowsProactorEventLoopPolicy().new_event_loop().__class__):
            print("[System] Current event loop may not support subprocesses. Deep scraping may be disabled.")
    except Exception:
        pass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.routes import router
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    from app.services.db_service import init_db
    from app.services.rag_service import init_rag
    
    # Initialize and seed database first
    await init_db()
    # Then initialize RAG pipeline
    await init_rag()

# Serve Frontend
frontend_path = os.path.join(os.getcwd(), "frontend", "dist")

if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        if full_path.startswith("api"):
            return None
        
        file_path = os.path.join(frontend_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Fallback to index.html for SPA routing
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": f"Welcome to the {settings.PROJECT_NAME} API. Frontend not found."}
