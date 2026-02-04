
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Any
# Lazy import to avoid crashing if numpy/opencv is missing
# from app.services.extraction_service import ExtractionService

router = APIRouter(
    prefix="/tools",
    tags=["tools"]
)

@router.post("/extract")
async def extract_data(file: UploadFile = File(...), force_ai: bool = False) -> Any:
    """
    Extracts text and codes (QR/Barcode) from an uploaded image.
    force_ai: If True, uses Gemini (Costly). If False, uses OpenCV/ZBar (Free).
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    try:
        # Lazy import here
        from app.services.extraction_service import ExtractionService
        
        contents = await file.read()
        result = ExtractionService.extract_from_image(contents, force_ai=force_ai)
        return result
    except ImportError:
         raise HTTPException(status_code=501, detail="Extraction service unavailable (Missing dependencies: numpy/opencv)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{file_path:path}")
async def download_file(file_path: str) -> Any:
    """
    Proxy to download local assets with full CORS support.
    Safely serves files from the assets directory.
    """
    import os
    from pathlib import Path
    from fastapi.responses import FileResponse
    from urllib.parse import unquote
    
    # Debug Helper
    def debug_log(msg):
        print(f"DEBUG_PROXY: {msg}", flush=True)

    debug_log(f"Hit download_file with path: {file_path}")

    # Decode the path
    decoded_path = unquote(file_path)
    debug_log(f"Decoded: {decoded_path}")
    
    # 1. Resolve Base Dir (Absolute)
    # logic: backend/assets
    # We assume CWD is 'backend'
    base_dir = Path("assets").resolve()
    debug_log(f"Base Dir: {base_dir}")
    
    # 2. Resolve Target File
    # We join base + decoded path
    target_path = (base_dir / decoded_path).resolve()
    debug_log(f"Target Path: {target_path}")

    # 3. Security Check (Is target inside base?)
    # Pathlib 'is_relative_to' is perfect (Python 3.9+)
    try:
        if not target_path.is_relative_to(base_dir):
             debug_log("Access Denied: Path Traversal Attempt")
             raise HTTPException(status_code=403, detail="Access denied")
    except AttributeError:
        # Fallback for older python if needed (unlikely 3.14 context)
        if not str(target_path).startswith(str(base_dir)):
             debug_log("Access Denied: Path Traversal (Manual Check)")
             raise HTTPException(status_code=403, detail="Access denied")

    # 4. Existence Check
    if not target_path.exists():
        debug_log(f"File Missing: {target_path}")
        raise HTTPException(status_code=404, detail="File not found")
        
    if not target_path.is_file():
        debug_log(f"Not a File: {target_path}")
        raise HTTPException(status_code=404, detail="Not a file")

    debug_log("Serving File...")
    return FileResponse(target_path)
