
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
    response = FileResponse(target_path)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

@router.post("/rotate")
async def rotate_image(payload: dict) -> Any:
    """
    Rotates an image file and its counterparts (optimized/original) permanently.
    Payload: { "file_path": "monday_files/...", "angle": 90 }
    """
    import os
    import glob
    from pathlib import Path
    from urllib.parse import unquote
    from PIL import Image, ImageOps

    file_path = payload.get("file_path")
    angle = payload.get("angle", 0)

    if not file_path:
        raise HTTPException(status_code=400, detail="Missing file_path")

    # 1. Resolve Paths
    decoded_path = unquote(file_path)
    base_dir = Path("assets").resolve()
    target_path = (base_dir / decoded_path).resolve()

    # 2. Security Check
    try:
        if not target_path.is_relative_to(base_dir):
             raise HTTPException(status_code=403, detail="Access denied")
    except AttributeError:
        if not str(target_path).startswith(str(base_dir)):
             raise HTTPException(status_code=403, detail="Access denied")
             
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # 3. Identify Sibling Files (Original <-> Optimized)
    # Naming convention:
    # Original:  {name}.{ext}
    # Optimized: opt_{name}.webp
    
    directory = target_path.parent
    filename = target_path.name
    files_to_rotate = {target_path} # Use set to avoid duplicates

    try:
        if filename.startswith("opt_") and filename.endswith(".webp"):
            # We have the Optimized file. Find the Original.
            # opt_NAME.webp -> NAME
            base_name = filename[4:-5] # Strip 'opt_' (4) and '.webp' (5)
            
            # Find any file in dir that matches base_name.* (excluding opt_)
            # We iterate manually to avoid shelling out
            for f in directory.iterdir():
                if f.is_file() and f.stem == base_name and not f.name.startswith("opt_"):
                    files_to_rotate.add(f)
                    
        else:
            # We have the Original (likely). Find the Optimized.
            base_name = target_path.stem
            opt_name = f"opt_{base_name}.webp"
            opt_path = directory / opt_name
            if opt_path.exists():
                files_to_rotate.add(opt_path)

        # 4. Perform Rotation on ALL found files
        rotated_count = 0
        for fpath in files_to_rotate:
            try:
                with Image.open(fpath) as img:
                    # Expand ensures true rotation without cropping
                    rotated = img.rotate(angle, expand=True)
                    rotated.save(fpath)
                    rotated_count += 1
            except Exception as e:
                print(f"Failed to rotate alias {fpath}: {e}")
                # We continue trying others even if one fails
                
        return {
            "status": "success", 
            "message": f"Rotated {rotated_count} file(s)", 
            "files": [f.name for f in files_to_rotate]
        }

    except Exception as e:
        print(f"Rotation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
