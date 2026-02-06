from typing import Any, Dict, List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, delete
from pydantic import BaseModel
from app.database import get_session

from app.api import deps
from app.models.marketplace import InstalledApp
from app.models.user import User

# Changed imports to relative
from .services import MondayService
from .models import MondayBoard, MondayItem, MondaySyncJob, MondayBarcodeConfig
import uuid
import os # Added for env var fallback
from datetime import datetime

router = APIRouter()

class BarcodeConfigDTO(BaseModel):
    board_id: int
    barcode_column_id: str
    search_column_id: Optional[str] = None
    sort_column_id: Optional[str] = "name"
    sort_direction: Optional[str] = "asc"
    display_column_ids: List[str]
    is_mobile_active: bool = True

def get_monday_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
) -> MondayService:
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
        
    # Find the installed Monday.com app for the user's company
    # Improved lookup: Join with MarketplaceApp to find by name "Monday.com Connector"
    # or fallback to ID 1
    # This prevents issues where seed ID != 1 in production
    
    from app.models.marketplace import MarketplaceApp
    
    installed_app = session.exec(
        select(InstalledApp)
        .join(MarketplaceApp)
        .where(InstalledApp.company_id == current_user.company_id)
        .where(MarketplaceApp.name == "Monday.com Connector")
        .where(InstalledApp.is_active == True)
    ).first()
    

    
    if not installed_app:
        # Fallback to ID 1 just in case name changed
        installed_app = session.exec(
            select(InstalledApp)
            .where(InstalledApp.company_id == current_user.company_id)
            .where(InstalledApp.app_id == 1)
            .where(InstalledApp.is_active == True)
        ).first()
    
    api_key = None
    if installed_app and installed_app.settings:
        api_key = installed_app.settings.get("api_key")

    # Fallback to Environment Variable
    if not api_key:
        api_key = os.getenv("MONDAY_API_KEY")
        if api_key:
             print(f"[API_KEY] Using Fallback Environment Variable", flush=True)

    if not api_key:
        print(f"[API_KEY] WARNING: Database API key not found and MONDAY_API_KEY env var not set.", flush=True)

    print(f"[API_KEY] FINAL KEY TO USE: {api_key[:50] if api_key else 'None'}...", flush=True)
    return MondayService(api_key=api_key)

from pydantic import BaseModel
class TestConnectionRequest(BaseModel):
    api_key: str | None = None

@router.post("/test-connection")
async def test_monday_connection(
    payload: TestConnectionRequest | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Test the connection to Monday.com.
    Prioritizes key provided in body. If missing, attempts to use stored key.
    """
    api_key = payload.api_key if payload else None
    
    if not api_key:
        # Fallback to DB
        if not current_user.company_id:
             raise HTTPException(status_code=400, detail="User must belong to a company")
             
        from app.models.marketplace import MarketplaceApp

        installed_app = session.exec(
            select(InstalledApp)
            .join(MarketplaceApp)
            .where(InstalledApp.company_id == current_user.company_id)
            .where(MarketplaceApp.name == "Monday.com Connector")
            .where(InstalledApp.is_active == True)
        ).first()

        if not installed_app:
            installed_app = session.exec(
                select(InstalledApp)
                .where(InstalledApp.company_id == current_user.company_id)
                .where(InstalledApp.app_id == 1)
                .where(InstalledApp.is_active == True)
            ).first()
        
        if installed_app and installed_app.settings:
             api_key = installed_app.settings.get("api_key")
             
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key is required (either in body or configured)")

    service = MondayService(api_key=api_key)
    success = await service.test_connection()
    if not success:
        raise HTTPException(status_code=400, detail="Failed to connect to Monday.com. Check API Key.")
    return {"status": "connected", "message": "Successfully connected to Monday.com"}

@router.get("/boards")
async def get_boards(
    limit: int = 100,
    api_key: str | None = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Fetch boards from Monday.com.
    Prioritizes api_key from query param, otherwise falls back to saved configuration.
    """
    try:
        service_api_key = api_key
        
        if not service_api_key:
             # Fallback to DB
            if not current_user.company_id:
                raise HTTPException(status_code=400, detail="User must belong to a company")
                
            from app.models.marketplace import MarketplaceApp

            installed_app = session.exec(
                select(InstalledApp)
                .join(MarketplaceApp)
                .where(InstalledApp.company_id == current_user.company_id)
                .where(MarketplaceApp.name == "Monday.com Connector")
                .where(InstalledApp.is_active == True)
            ).first()

            if not installed_app:
                installed_app = session.exec(
                    select(InstalledApp)
                    .where(InstalledApp.company_id == current_user.company_id)
                    .where(InstalledApp.app_id == 1)
                    .where(InstalledApp.is_active == True)
                ).first()
            
            if installed_app and installed_app.settings:
                service_api_key = installed_app.settings.get("api_key")
                print(f"[GET_BOARDS] Found InstalledApp ID: {installed_app.id}", flush=True)
                print(f"[GET_BOARDS] Settings type: {type(installed_app.settings)}", flush=True)
                print(f"[GET_BOARDS] API Key (first 60): {service_api_key[:60] if service_api_key else 'None'}", flush=True)

        # Fallback to Environment Variable
        if not service_api_key:
            service_api_key = os.getenv("MONDAY_API_KEY")
            if service_api_key:
                 print(f"[GET_BOARDS] Using Fallback Environment Variable", flush=True)


        


        if not service_api_key:
             raise HTTPException(status_code=400, detail="Monday.com API Key is not configured")

        print(f"[GET_BOARDS] Creating MondayService with key: {service_api_key[:60]}", flush=True)
        service = MondayService(api_key=service_api_key)
        boards = await service.get_boards(limit=limit, session=session, user=current_user)
        
        if not boards:
            return []

        # Enrich with local metadata (last_synced_at)
        board_ids = []
        for b in boards:
            try:
                if b.get('id'):
                    board_ids.append(int(b['id']))
            except (ValueError, TypeError):
                print(f"Warning: Skipping invalid board ID: {b.get('id')}")
                continue
                
        local_boards = []
        if board_ids:
            local_boards = session.exec(select(MondayBoard).where(MondayBoard.id.in_(board_ids))).all()
            
        local_map = {str(b.id): b for b in local_boards}
        
        for b in boards:
            if not b.get('id'): continue
            local = local_map.get(str(b['id']))
            if local:
                b['last_synced_at'] = local.last_synced_at
                b['last_sync_item_count'] = local.last_sync_item_count
                b['last_sync_size_bytes'] = local.last_sync_size_bytes
                b['last_sync_original_size_bytes'] = local.last_sync_original_size_bytes
                b['last_sync_optimized_size_bytes'] = local.last_sync_optimized_size_bytes
            else:
                 b['last_synced_at'] = None
            
        return boards
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR in get_boards: {e}")
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")

@router.delete("/boards/{board_id}")
async def delete_board_data(
    board_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """
    Delete a board and all its local data (items, assets, config).
    """
    # Only admins can delete? Or anyone with access? Let's restrict to admins for safety for now, 
    # OR those who have explicit access (but deleting for EVERYONE is dangerous).
    # Let's enforce Admin only for data deletion.
    if str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) not in ["super_admin", "admin"]:
         raise HTTPException(status_code=403, detail="Only admins can delete board data")
         
    try:
        service.delete_board(session, board_id)
        return {"status": "success", "message": f"Board {board_id} deleted"}
    except Exception as e:
        print(f"Delete Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/boards/{board_id}/sync")
async def sync_board(
    board_id: int,
    background_tasks: BackgroundTasks,
    payload: Dict[str, Any] = {},
    download_images: bool = Query(False),
    optimize_images: bool = Query(False),
    force_sync_images: bool = Query(False),
    keep_original_images: bool = Query(True),
    session: Session = Depends(get_session),
    service: MondayService = Depends(get_monday_service),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Trigger a manual sync for a board via BACKGROUND JOB.
    Returns a Job ID immediately.
    """
    try:
        print(f"DEBUG_CUSTOM_SYNC: sync_board request received. Board: {board_id}")
        if payload:
            print(f"DEBUG_CUSTOM_SYNC: Payload keys: {list(payload.keys())}")
        else:
            print("DEBUG_CUSTOM_SYNC: Payload is empty/None")
        
        # Extract Params
        filters = payload.get("filters", [])
        filtered_item_ids = payload.get("filtered_item_ids", None)
        
        # Extract Params - Prioritize Payload (Body) over Query Params
        # Frontend sends: { download_assets, optimize_images, force_sync_images, keep_original_images }
        
        should_download = payload.get("download_assets", download_images)
        should_optimize = payload.get("optimize_images", optimize_images)
        should_force = payload.get("force_sync_images", force_sync_images)
        should_keep_orig = payload.get("keep_original_images", keep_original_images)

        sync_kwargs = {
            "download_assets": should_download,
            "optimize_images": should_optimize,
            "force_sync_images": should_force,
            "keep_original_images": should_keep_orig,
            "filters": filters,
            "filtered_item_ids": filtered_item_ids
        }
        
        # 1. Create Job Record (With Params)
        job = await service.create_sync_job(session, board_id, current_user.id, params=sync_kwargs)
        
        # 2. Trigger Queue Processor in Background
        async def background_wrapper():
             from app.database import engine
             from sqlmodel import Session
             with Session(engine) as task_session:
                 srv = MondayService(api_key=service.api_key)
                 await srv.process_queue(task_session)

        background_tasks.add_task(background_wrapper)
        
        return {"status": "accepted", "job_id": str(job.id), "message": "Sync Queued"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"DEBUG_CUSTOM_SYNC: Exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync/jobs/{job_id}")
async def get_sync_job_status(
    job_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """Gets the status of a sync job."""
    print(f"DEBUG_JOB: Looking for Job ID: {job_id} (Type: {type(job_id)})")
    job = await service.get_sync_job(session, job_id)
    if not job:
        # DEBUG: List all jobs to see what's there
        all_jobs = session.exec(select(MondaySyncJob)).all()
        print(f"DEBUG_JOB: Job not found! Available Jobs: {[str(j.id) for j in all_jobs]}")
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/sync/jobs")
async def list_sync_jobs(
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """List recent sync jobs (Admin only?). For now open to users but filtered?"""
    # Simple list for now
    jobs = session.exec(select(MondaySyncJob).order_by(MondaySyncJob.created_at.desc()).limit(limit)).all()
    return jobs

@router.post("/sync/jobs/reset")
async def reset_sync_queue(
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """
    Resets all pending/running jobs to failed.
    """
    if str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can reset queue")

    count = service.reset_queue_jobs(session)
    return {"status": "success", "reset_count": count}

@router.get("/boards/{board_id}/items")
async def get_board_items(
    board_id: int,
    limit: int = 50,
    cursor: str = None,
    session: Session = Depends(get_session),
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """
    Fetch items for a specific board from LOCAL DATABASE.
    """
    try:
        # TODO: Implement pagination for local DB
        # For now, return all items as the user requested "fetch all"
        items = service.get_local_board_items(session=session, board_id=board_id)
        return {
            "items": items,
            "cursor": None # No cursor for local DB yet
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/items/{item_id}/assets/{asset_id}")
async def update_item_asset(
    item_id: int,
    asset_id: str,
    payload: Dict[str, Any], 
    session: Session = Depends(get_session)
):
    """
    Update local metadata for a specific asset (e.g. rotation).
    Does NOT sync to Monday.
    """
    item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if asset_id not in item.assets:
        raise HTTPException(status_code=404, detail="Asset not found on item")
        
    # JSON update dance for SQLModel/SQLAlchemy
    # Create a deep copy of the assets dict
    new_assets = dict(item.assets)
    asset_data = dict(new_assets[asset_id])
    
    # Update allowed fields
    if "rotation" in payload:
        asset_data["rotation"] = payload["rotation"]
        
    new_assets[asset_id] = asset_data
    
    # Reassign to trigger tracking
    item.assets = new_assets
    
    try:
        session.add(item)
        session.commit()
    except Exception as e:
        print(f"Error updating asset: {e}")
        raise HTTPException(status_code=500, detail="Failed to save asset metadata")

    return {"status": "success", "asset": asset_data}

@router.post("/items/{item_id}/assets/{asset_id}/rotate")
async def rotate_item_asset(
    item_id: int,
    asset_id: str,
    payload: Dict[str, Any], 
    session: Session = Depends(get_session)
):
    """
    Physically rotate an asset file (and its optimized version) on server.
    Payload: { "angle": 90 }  (Positive = Clockwise, Negative = Counter-Clockwise)
    """
    import os
    try:
        from PIL import Image
    except ImportError:
        raise HTTPException(status_code=500, detail="Pillow not installed on backend")

    # 1. Fetch Item & Asset
    item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if asset_id not in item.assets:
        raise HTTPException(status_code=404, detail="Asset not found on item")
    
    asset = item.assets[asset_id]
    angle = payload.get("angle", 0)
    
    if angle == 0:
        return {"status": "success", "message": "No rotation needed"}

    # Helper to rotate a single file
    def rotate_file(path_str):
        if not path_str: return False
        
        # Clean path logic similar to extraction
        clean_p = path_str.lstrip("/\\")
        abs_p = os.path.abspath(clean_p)
        
        if not os.path.exists(abs_p):
            print(f"Rotate: File not found {abs_p}")
            return False
            
        try:
            with Image.open(abs_p) as img:
                # Pillow rotate is CCW. UI sends "90" for CW.
                # If we want 90deg CW, we rotate -90.
                rotated = img.rotate(-angle, expand=True)
                rotated.save(abs_p)
                print(f"Rotated {abs_p} by {-angle}")
                return True
        except Exception as e:
            print(f"Rotate Error for {abs_p}: {e}")
            return False

    # 2. Rotate Original
    did_rotate_orig = rotate_file(asset.get("local_path"))
    
    # 3. Rotate Optimized (if exists)
    did_rotate_opt = rotate_file(asset.get("optimized_path"))
    
    if not did_rotate_orig and not did_rotate_opt:
         raise HTTPException(status_code=404, detail="Local asset files not found to rotate")

    # 4. RESET Metadata Rotation to 0
    # Since we physically rotated the file, we don't want the frontend to apply CSS rotation anymore.
    new_assets = dict(item.assets)
    asset_data = dict(new_assets[asset_id])
    asset_data["rotation"] = 0
    new_assets[asset_id] = asset_data
    
    item.assets = new_assets
    session.add(item)
    session.commit()
    
    return {"status": "success", "asset": asset_data}


@router.post("/items/{item_id}/assets/{asset_id}/extract")
async def extract_asset_data(
    item_id: int,
    asset_id: str,
    payload: Dict[str, Any], 
    session: Session = Depends(get_session)
):
    """
    Server-side extraction fallback.
    Payload: { crop: {x, y, w, h}, rotation: 0 }
    Uses Pillow to avoid OpenCV dependencies.
    """
    import os
    import io
    # Lazy import Service
    try:
        from app.services.extraction_service import ExtractionService
        from PIL import Image
    except ImportError as e:
        print(f"Extraction Dependencies Missing: {e}")
        raise HTTPException(status_code=500, detail="Backend is missing Pillow or Extraction Service.")

    item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
    if not item:
        print(f"DEBUG_EXTRACT: Item {item_id} NOT FOUND in DB", flush=True)
        raise HTTPException(status_code=404, detail="Item not found")
        
    if asset_id not in item.assets:
        print(f"DEBUG_EXTRACT: Asset {asset_id} NOT FOUND in item.assets keys: {list(item.assets.keys())}", flush=True)
        raise HTTPException(status_code=404, detail="Asset not found on item")
    
    asset = item.assets[asset_id]
    
    # Prioritize local original, then local optimized
    # Logic: Database might store paths with leading slash "/assets/..." or "assets/..."
    # We must treat them as relative to backend CWD.
    
    def resolve_path(p: str | None) -> str | None:
        if not p: return None
        # Strip leading slashes to make it truly relative
        clean_p = p.lstrip("/\\")
        # Construct absolute path from CWD
        abs_p = os.path.abspath(clean_p)
        return abs_p

    file_path = resolve_path(asset.get("local_path"))
    print(f"DEBUG_EXTRACT: Checking local_path: {file_path}", flush=True)
    
    if not file_path or not os.path.exists(file_path):
        print(f"DEBUG_EXTRACT: local_path missing. Checking optimized...", flush=True)
        file_path = resolve_path(asset.get("optimized_path"))
        print(f"DEBUG_EXTRACT: Checking optimized_path: {file_path}", flush=True)
        
    if not file_path or not os.path.exists(file_path):
         print(f"DEBUG_EXTRACT: Both paths failed. CWD: {os.getcwd()}", flush=True)
         raise HTTPException(status_code=404, detail=f"Local image file not found: {file_path}")

    try:
        # Read Image with Pillow
        try:
            img = Image.open(file_path)
            # Fix orientation from EXIF if needed? 
            # Usually Image.open doesn't auto-rotate until ExifTags logic is applied, 
            # but frontend probably sends rotation relative to what it sees.
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Failed to load image: {e}")
        
        rotation = payload.get("rotation", 0)
        # Rotate image to match user view
        # PIL rotate is Counter-Clockwise. UI usually sends degrees (90 = CW).
        # So we rotate by -rotation.
        # expand=True ensures the canvas grows to fit the new orientation.
        if rotation != 0:
            img = img.rotate(-rotation, expand=True)

        # Handle Crop
        crop = payload.get("crop")
        if crop:
            # Crop coords are {x, y, w, h}
            x, y, w, h = int(crop["x"]), int(crop["y"]), int(crop["w"]), int(crop["h"])
            
            # Clamp to bounds
            max_w, max_h = img.size
            x = max(0, min(x, max_w))
            y = max(0, min(y, max_h))
            w = min(w, max_w - x)
            h = min(h, max_h - y)
            
            if w > 0 and h > 0:
                # PIL crop expects (left, top, right, bottom)
                img = img.crop((x, y, x + w, y + h))

        # Encode to bytes (PNG)
        output_io = io.BytesIO()
        img.save(output_io, format="PNG")
        image_bytes = output_io.getvalue()
        
        force_ai = payload.get("force_ai", False)
        print(f"DEBUG_EXTRACT: Processing image size: {len(image_bytes)} bytes. ForceAI: {force_ai}", flush=True)
        
        return ExtractionService.extract_from_image(image_bytes, force_ai=force_ai)

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Server Extraction Error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items/{item_id}/barcode")
async def update_item_barcode(
    item_id: int,
    payload: dict, # { "barcode": "123" }
    session: Session = Depends(get_session),
    service: MondayService = Depends(get_monday_service)
):
    """
    Update the barcode column for an item. The column is determined by the Board's BarcodeConfig.
    """
    try:
        barcode_val = payload.get("barcode")
        if not barcode_val:
             raise HTTPException(status_code=400, detail="Barcode is required")

        # 1. Find the Item and its Board to get Config
        item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in local DB. Please sync board first.")

        # 2. Get Barcode Config
        config = session.exec(select(MondayBarcodeConfig).where(MondayBarcodeConfig.board_id == item.board_id)).first()
        if not config or not config.barcode_column_id:
            raise HTTPException(status_code=400, detail="Barcode column not configured for this board")

        # 3. Update Monday
        # TODO: Handle string vs JSON value for Monday? Text columns take simple strings.
        col_vals = { config.barcode_column_id: barcode_val }
        updated = await service.update_item_column_value(item.board_id, item_id, col_vals)
        
        # 4. Update Local
        if updated:
             new_values = item.column_values.copy() if item.column_values else []
             if not isinstance(new_values, list): new_values = []
             
             found = False
             for cv in new_values:
                 if cv.get("id") == config.barcode_column_id:
                     cv["text"] = str(barcode_val)
                     cv["value"] = str(barcode_val)
                     found = True
                     break
            
             if not found:
                 new_values.append({"id": config.barcode_column_id, "text": str(barcode_val), "value": str(barcode_val), "type": "text"})
             
             item.column_values = new_values
             session.add(item)
             session.commit()
             session.refresh(item)
             return {"status": "success", "message": "Barcode updated"}
        else:
             raise HTTPException(status_code=500, detail="Failed to update Monday.com")

    except Exception as e:
        print(f"Barcode Update Error: {e}")
        # traceback 
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{item_id}")
async def update_item_value(
    item_id: int,
    payload: dict, # Expects { "board_id": 123, "column_values": { "col_id": "value" } }
    session: Session = Depends(get_session),
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """
    Update item column values on Monday.com and locally.
    """
    try:
        board_id = payload.get("board_id")
        column_values = payload.get("column_values", {})
        
        if not board_id or not column_values:
            raise HTTPException(status_code=400, detail="board_id and column_values are required")

        # 1. Update on Monday.com
        updated = await service.update_item_column_value(board_id, item_id, column_values)
        
        if updated:
             # 2. Update Local DB (Optimistic)
             # Changed import to relative
             from .models import MondayItem
             item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
             if item:
                 # Deep copy existing values to modify
                 new_values = item.column_values.copy() if item.column_values else {}
                 
                 # Ensure we are working with a list
                 if not isinstance(new_values, list):
                     new_values = [] 
                 
                 for col_id, val in column_values.items():
                     if col_id == 'name':
                         item.name = str(val)
                     else:
                         # We assume 'val' is the simple text/value from frontend input
                         # Find the matching column object in the list
                         found = False
                         for cv in new_values:
                             if cv.get("id") == col_id:
                                 cv["text"] = str(val)
                                 cv["value"] = str(val)
                                 found = True
                                 break
                        
                         if not found:
                             new_values.append({"id": col_id, "text": str(val), "value": str(val), "type": "text"})
                 
                 # Force update
                 item.column_values = new_values
                 session.add(item)
                 session.commit()
                 session.refresh(item)
                 
        return {"status": "success", "updated": updated}

    except Exception as e:
        print(f"Update Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/proxy")
async def proxy_monday_asset(
    url: str,
    skip_auth: bool = False,
    width: int = Query(None, description="Target width for optimization"),
    optimize: bool = False,
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """
    Proxy request to Monday.com to fetch assets (images/files) that require authentication.
    """
    import httpx
    from fastapi.responses import StreamingResponse
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    try:
        # Create a client with the same headers as the service
        # Determine functionality based on URL domain
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        
        headers = {}
        
        # Determine if we should send Auth
        # 1. User flagged skip_auth (for public_urls)
        # 2. Domain is NOT monday.com
        should_send_auth = not skip_auth and "monday.com" in domain
        
        if should_send_auth:
             headers["Authorization"] = service.api_key
             headers["API-Version"] = "2023-10"
        else:
             # Clean headers for public/S3 links
             pass
        
        # Manual redirect handling to prevent header leakage to S3
        # We handle up to 3 redirects to be safe
        client = httpx.AsyncClient(follow_redirects=False)
        
        current_url = url
        current_headers = headers
        
        for _ in range(3):
            req = client.build_request("GET", current_url, headers=current_headers)
            r = await client.send(req, stream=True)
            
            if r.status_code in (301, 302, 303, 307, 308):
                redirect_url = r.headers.get("location")
            if r.status_code in (301, 302, 303, 307, 308):
                redirect_url = r.headers.get("location")
                if redirect_url:
                    await r.aclose()
                    print(f"Redirecting to: {redirect_url}")
                    current_url = redirect_url
                    
                    # Check if we are still on Monday.com
                    next_domain = urlparse(redirect_url).netloc
                    if "monday.com" not in next_domain:
                         # Redirecting to S3/External -> DROP HEADERS
                        print("External Redirect -> Dropping ALL Headers")
                        current_headers = {}
                    else:
                        print("Internal Redirect -> Keeping Auth Headers")
                        # Keep current_headers (Auth + API-Version)
                        pass
                    
                    continue
            
            # If not a redirect, break the loop and return this response
            break
        
        if r.status_code != 200:
            await client.aclose()
            # Log the error for debugging (print to console for now)
            print(f"Monday Proxy Error: {r.status_code} - {url}")
            try:
                error_body = await r.aread()
                print(f"Error Body: {error_body}")
            except: 
                pass
            raise HTTPException(status_code=r.status_code, detail="Failed to fetch asset from Monday")

        if optimize or width:
            print(f"--- PROXY OPTIMIZATION REQUEST ---")
            print(f"URL: {url}")
            print(f"Params: optimize={optimize}, width={width}")
            
            # OPTIMIZATION PATH: Buffer -> Resize -> Serve
            content = b""
            async for chunk in r.aiter_bytes():
                content += chunk
            
            await r.aclose()
            await client.aclose()

            try:
                try:
                    from PIL import Image
                    import io
                    print("PIL Imported Successfully")
                except ImportError:
                    print("CRITICAL: PIL (Pillow) not found in backend environment!")
                    raise

                # Check if it's actually an image
                content_type = r.headers.get("content-type", "")
                print(f"Content-Type: {content_type}")
                
                # RELAXED CHECK: Just try to open it. 
                # S3 sometimes returns weird types.
                
                img_io = io.BytesIO(content)
                img = Image.open(img_io)
                print(f"Original Size: {img.size} ({len(content)} bytes)")
                
                target_width = width or 400  # Default to 400px (good for grid thumbnails)
                
                # Only resize if the image is actually larger
                if img.width > target_width:
                    w_percent = (target_width / float(img.width))
                    h_size = int((float(img.height) * float(w_percent)))
                    img = img.resize((target_width, h_size), Image.Resampling.LANCZOS)
                    print(f"Resized to: {img.size}")
                else:
                    print("Image smaller than target, skipping resize.")
                
                output_io = io.BytesIO()
                # Save as WebP for best compression/quality ratio
                img.save(output_io, format="WEBP", quality=75)
                optimized_size = output_io.tell()
                output_io.seek(0)
                
                print(f"Optimized Size: {optimized_size} bytes")
                print("----------------------------------")
                
                return StreamingResponse(
                    output_io, 
                    status_code=200, 
                    media_type="image/webp"
                )
            except Exception as img_err:
                print(f"Image Optimization Failed: {img_err}")
                import traceback
                traceback.print_exc()
                
                from io import BytesIO
                # Fallback to original content
                return StreamingResponse(
                    BytesIO(content),
                    status_code=200,
                    media_type=r.headers.get("content-type")
                )

        # STANDARD PATH: Stream directly
        async def stream_content():
            try:
                # httpx aiter_bytes automatically handles decompression (gzip/deflate)
                # finding raw bytes.
                async for chunk in r.aiter_bytes():
                    yield chunk
            finally:
                await r.aclose()
                await client.aclose()

        # Construct response headers CAREFULLY
        # Do NOT forward content-encoding or content-length to avoid browser confusion
        # (Since we are streaming decoded bytes, length and encoding change)
        response_headers = {
            "Content-Disposition": r.headers.get("content-disposition", "inline")
        }
        
        return StreamingResponse(
            stream_content(), 
            status_code=200, 
            media_type=r.headers.get("content-type"),
            headers=response_headers
        )

    except Exception as e:
        print(f"Monday Proxy Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


from pydantic import BaseModel

class ClearCacheRequest(BaseModel):
    clear_db: bool = False
    clear_assets: bool = False
    clear_optimized: bool = False
    clear_originals: bool = False

@router.post("/boards/{board_id}/clear-cache")
async def clear_board_cache(
    board_id: int,
    request: ClearCacheRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
):
    monday_service = MondayService(api_key="") # API key not needed for local delete
    
    result = await monday_service.clear_board_cache(
        session, 
        board_id, 
        clear_db=request.clear_db, 
        clear_assets=request.clear_assets, 
        clear_optimized=request.clear_optimized,
        clear_originals=request.clear_originals
    )
    
    
    return result

class AccessRequest(BaseModel):
    board_id: int
    user_ids: list[int]

@router.get("/access/users/{board_id}")
async def get_board_access_users(
    board_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    service: MondayService = Depends(get_monday_service)
):
    """
    Get list of users who have access to this board.
    Only Admins can view this.
    """
    if str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can view board access")
        
    user_ids = service.get_board_access_users(session, board_id)
    return {"board_id": board_id, "user_ids": user_ids}

@router.post("/access/grant")
async def grant_board_access(
    payload: AccessRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    service: MondayService = Depends(get_monday_service)
):
    """
    Grant access to board for users.
    Only Admins.
    """
    if str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can grant access")
        
    service.grant_board_access(session, payload.board_id, payload.user_ids, granted_by=current_user.id)
    return {"status": "success", "message": "Access granted"}

@router.post("/access/revoke")
async def revoke_board_access(
    payload: AccessRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    service: MondayService = Depends(get_monday_service)
):
    """
    Revoke access.
    Only Admins.
    """
    if str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can revoke access")
        
    service.revoke_board_access(session, payload.board_id, payload.user_ids)
    return {"status": "success", "message": "Access revoked"}


# --- Barcode Scanner Features ---




@router.post("/items/{item_id}/barcode")
async def update_item_barcode(
    item_id: int,
    payload: Dict[str, str], # {"barcode": "12345"}
    session: Session = Depends(get_session),
    service: MondayService = Depends(get_monday_service),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Update the barcode column for a specific item.
    Requires existing config for the item's board.
    """
    barcode = payload.get("barcode")
    if not barcode:
        raise HTTPException(status_code=400, detail="Barcode value is required")

    # 1. Find Item to get Board ID
    item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 2. Get Config for this Board
    config = session.exec(select(MondayBarcodeConfig).where(MondayBarcodeConfig.board_id == item.board_id)).first()
    if not config:
        raise HTTPException(status_code=400, detail="Barcode configuration not found for this board")

    # 3. Update using MondayService (uses existing update_item_column_value logic)
    # Construct column_values dict
    column_values = {
        config.barcode_column_id: barcode
    }

    # Use the existing update endpoint logic by calling service directly
    # Reuse `update_item_value` logic? Better to call service.
    
    # 4. Update on Monday.com
    try:
        updated = await service.update_item_column_value(item.board_id, item_id, column_values)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update Monday.com: {str(e)}")

    # 5. Update Local DB (Optimistic)
    if updated:
         new_values = item.column_values.copy() if item.column_values else {}
         if not isinstance(new_values, list): new_values = []
         
         # Helper to update list of dicts
         found = False
         for cv in new_values:
             if cv.get("id") == config.barcode_column_id:
                 cv["text"] = str(barcode)
                 cv["value"] = str(barcode)
                 found = True
                 break
        
         if not found:
             new_values.append({"id": config.barcode_column_id, "text": str(barcode), "value": str(barcode), "type": "text"})
         
         item.column_values = new_values
         session.add(item)
         session.commit()
         session.refresh(item)
         
    return {"status": "success", "message": "Barcode updated", "item_id": item_id, "barcode": barcode}




# --- Barcode Scanner Features ---


@router.get("/config/barcode")
async def get_barcode_config(
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get all barcode configurations."""
    from fastapi.responses import JSONResponse
    try:
        if not current_user.company_id:
             return JSONResponse(content={})
             
        # Return the first config found for now, or empty list
        configs = session.exec(select(MondayBarcodeConfig)).all()
        # Frontend Expects an Array!
        return configs if configs else []
    except Exception as e:
        print(f"DEBUG: Error in get_barcode_config (routes.py): {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={})

@router.post("/config/barcode")
async def save_barcode_config(
    payload: BarcodeConfigDTO,
    background_tasks: BackgroundTasks, # Added for auto-sync
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
    service: MondayService = Depends(get_monday_service) # Need service to sync
):
    """
    Save barcode configuration.
    Upserts based on board_id and triggers a fresh sync.
    """
    if str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can configure barcode settings")
        
    # Enforce Single Active Configuration Logic (Strict & Safe)
    # 1. Delete ALL existing configurations
    print(f"[CONFIG] Nuke Request: Deleting ALL existing configs.", flush=True)
    existing_configs = session.exec(select(MondayBarcodeConfig)).all()
    for existing in existing_configs:
         session.delete(existing)
    
    session.flush() # Stage the delete
    
    # 2. Create NEW config
    print(f"[CONFIG] Creating NEW config for Board {payload.board_id}", flush=True)
    print(f"[CONFIG] Payload Search ID: '{payload.search_column_id}'", flush=True)
    config = MondayBarcodeConfig(
        board_id=payload.board_id,
        barcode_column_id=payload.barcode_column_id,
        search_column_id=payload.search_column_id,
        sort_column_id=payload.sort_column_id,
        sort_direction=payload.sort_direction,

        display_column_ids=payload.display_column_ids,
        is_mobile_active=payload.is_mobile_active
    )
    session.add(config)
    session.commit()
    session.refresh(config)
    
    # 3. AUTO-SYNC TRIGGER
    # We must sync to ensure the new columns (especially Auto Number) are populated in Local DB
    print(f"[CONFIG] Triggering Auto-Sync for Board {payload.board_id}...", flush=True)
    
    # We can reuse the sync_board logic or call service directly. 
    # Calling service.create_sync_job is cleanest if we want background execution.
    # But usually we want the queue processor.
    # Let's verify how /sync does it. content of sync_board in this file?
    # It calls service.create_sync_job then service.run_sync_job if immediate?
    # Let's simply enqueue the job using the same pattern as the /sync endpoint logic would (if we could see it).
    # Safest: service.create_sync_job and then background_task(service.process_queue)
    
    try:
        # Create Job
        job_id = await service.create_sync_job(
            session=session, 
            board_id=payload.board_id, 
            user_id=current_user.id
        )
        
        # Background Execution - Safe Session Management
        async def background_queue_runner():
             from app.database import engine
             from sqlmodel import Session
             # Create a NEW session for the background task
             with Session(engine) as task_session:
                 srv = MondayService(api_key=service.api_key)
                 await srv.process_queue(task_session)

        # Trigger immediately in background
        background_tasks.add_task(background_queue_runner)
        
        print(f"[CONFIG] Auto-Sync Job Created: {job_id} (Background Task Started)", flush=True)
    except Exception as e:
         print(f"[CONFIG] Auto-Sync Trigger Failed: {e}", flush=True)
         job_id = None

    return {
        "status": "success", 
        "config": config, 
        "sync_triggered": True,
        "job_id": str(job_id) if job_id else None
    }


@router.delete("/config/barcode")
async def clear_barcode_config(
     session: Session = Depends(get_session),
     current_user: User = Depends(deps.get_current_user)
):
    """
    Manually clear all barcode configurations.
    """
    if str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can clear configuration")

    existing_configs = session.exec(select(MondayBarcodeConfig)).all()
    count = len(existing_configs)
    count = 0
    try:
        for existing in existing_configs:
            session.delete(existing)
            count += 1
        
        session.commit()
        print(f"[CONFIG] Manual Clear: Deleted {count} configs.", flush=True)
        return {"status": "success", "deleted_count": count}
    except Exception as e:
        session.rollback()
        print(f"[CONFIG] Clear Failed: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/items/{item_id}/barcode")
async def update_item_barcode(
    item_id: int,
    payload: Dict[str, str], # {"barcode": "12345"}
    session: Session = Depends(get_session),
    service: MondayService = Depends(get_monday_service),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Update the barcode column for a specific item.
    Requires existing config for the item's board.
    """
    barcode = payload.get("barcode")
    if not barcode:
        raise HTTPException(status_code=400, detail="Barcode value is required")

    # 1. Find Item to get Board ID
    item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 2. Get Config for this Board
    config = session.exec(select(MondayBarcodeConfig).where(MondayBarcodeConfig.board_id == item.board_id)).first()
    if not config:
        raise HTTPException(status_code=400, detail="Barcode configuration not found for this board")

    # 3. Update using MondayService (uses existing update_item_column_value logic)
    # Construct column_values dict
    column_values = {
        config.barcode_column_id: barcode
    }

    # Use the existing update endpoint logic by calling service directly
    # Reuse `update_item_value` logic? Better to call service.
    
    # 4. Update on Monday.com
    try:
        updated = await service.update_item_column_value(item.board_id, item_id, column_values)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update Monday.com: {str(e)}")

    # 5. Update Local DB (Optimistic)
    if updated:
         new_values = item.column_values.copy() if item.column_values else {}
         if not isinstance(new_values, list): new_values = []
         
         # Helper to update list of dicts
         found = False
         for cv in new_values:
             if cv.get("id") == config.barcode_column_id:
                 cv["text"] = str(barcode)
                 cv["value"] = str(barcode)
                 found = True
                 break
        
         if not found:
             new_values.append({"id": config.barcode_column_id, "text": str(barcode), "value": str(barcode), "type": "text"})
         
         item.column_values = new_values
         session.add(item)
         session.commit()
         session.refresh(item)
         
    return {"status": "success", "message": "Barcode updated", "item_id": item_id, "barcode": barcode}



@router.get("/test-monday/{board_id}")
async def test_monday_direct(
    board_id: int,
    service: MondayService = Depends(get_monday_service),
    current_user: User = Depends(deps.get_current_user)
):
    """
    SIMPLE TEST: Direct Monday API call to see raw response
    """
    import httpx
    query = """
    query {
        boards (ids: [%s]) {
            id
            name
            items_page(limit: 10) {
                cursor
                items {
                    id
                    name
                }
            }
        }
    }
    """ % board_id
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.monday.com/v2",
            json={"query": query},
            headers=service.headers,
            timeout=30.0
        )
        raw_data = response.json()
        
        # Return the EXACT response from Monday
        return {
            "status_code": response.status_code,
            "raw_response": raw_data,
            "item_count": len(raw_data.get("data", {}).get("boards", [{}])[0].get("items_page", {}).get("items", []))
        }


@router.get("/boards/{board_id}/items")
async def get_monday_board_items(
    board_id: int,
    limit: int = 50,
    cursor: str = None,
    session: Session = Depends(get_session),
    service: MondayService = Depends(get_monday_service),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Proxy endpoint to fetch items from a Monday board.
    Useful for mobile app to list items without full sync.
    """
    print(f"DEBUG: Fetching items for board {board_id} via proxy...")
    try:
        data = await service.get_board_items(board_id, limit=limit, cursor=cursor)
        print(f"DEBUG: Got {len(data.get('items', []))} items from service.")
        return data
    except Exception as e:
        print(f"DEBUG: Error fetching items: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
