from typing import Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from app.database import get_session
from app.api import deps
from app.models.marketplace import InstalledApp
from app.models.user import User
from app.services.monday_service import MondayService
from app.models.monday import MondayBoard
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
try:
    from custom_addons.monday_connector import routes as custom_routes
except ImportError:
    custom_routes = None

router = APIRouter()
if custom_routes:
    router.include_router(custom_routes.router)

def get_monday_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user)
) -> MondayService:
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
        
    # Find the installed Monday.com app for the user's company
    # ID 1 is reserved for Monday.com Connector in our seed data
    installed_app = session.exec(
        select(InstalledApp)
        .where(InstalledApp.company_id == current_user.company_id)
        .where(InstalledApp.app_id == 1) # Assuming Monday.com is App ID 1
        .where(InstalledApp.is_active == True)
    ).first()
    
    if not installed_app:
        raise HTTPException(status_code=400, detail="Monday.com connector is not installed")
        
    api_key = installed_app.settings.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Monday.com API Key is not configured")
        
    return MondayService(api_key=api_key)

@router.post("/test-connection")
async def test_monday_connection(
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """
    Test the connection to Monday.com using stored credentials.
    """
    success = await service.test_connection()
    if not success:
        raise HTTPException(status_code=400, detail="Failed to connect to Monday.com. Check API Key.")
    return {"status": "connected", "message": "Successfully connected to Monday.com"}

@router.get("/boards")
async def get_boards(
    limit: int = 100,
    service: MondayService = Depends(get_monday_service),
    service_session: Session = Depends(get_session)
) -> Any:
    """
    Fetch boards from Monday.com.
    """
    try:
        boards = await service.get_boards(limit=limit)
        
        # Enrich with local metadata (last_synced_at)
        board_ids = [int(b['id']) for b in boards]
        local_boards = service_session.exec(select(MondayBoard).where(MondayBoard.id.in_(board_ids))).all()
        local_map = {str(b.id): b.last_synced_at for b in local_boards}
        
        for b in boards:
            b['last_synced_at'] = local_map.get(b['id'])
            
        return boards
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SyncRequest(BaseModel):
    filters: Optional[List[Dict[str, Any]]] = None
    filtered_item_ids: Optional[List[int]] = None

@router.post("/boards/{board_id}/sync")
async def sync_board(
    board_id: int,
    payload: SyncRequest = None,
    download_images: bool = Query(False),
    optimize_images: bool = Query(False),
    session: Session = Depends(get_session),
    service: MondayService = Depends(get_monday_service)
) -> Any:
    """
    Trigger a manual sync for a board. Fetches full data from Monday and updates local DB.
    Streams progress updates as NDJSON.
    """
    print(f"DEBUG_SYNC: Received sync request for board {board_id}")
    if payload:
        print(f"DEBUG_SYNC: Payload present. Filters: {len(payload.filters) if payload.filters else 0}")
    else:
        print("DEBUG_SYNC: No payload (payload is None)")

    filters = payload.filters if payload else None
    filtered_item_ids = payload.filtered_item_ids if payload else None

    try:
        print("DEBUG_SYNC: Calling service.sync_board")
        return StreamingResponse(
            service.sync_board(
                session=session, 
                board_id=board_id, 
                download_assets=download_images, 
                optimize_images=optimize_images,
                filters=filters,
                filtered_item_ids=filtered_item_ids
            ),
            media_type="application/x-ndjson"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"DEBUG_SYNC: Exception catch: {e}")
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")

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
             from app.models.monday import MondayItem
             item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
             if item:
                 # Deep copy existing values to modify
                 new_values = item.column_values.copy() if item.column_values else {}
                 
                 for col_id, val in column_values.items():
                     if col_id == 'name':
                         item.name = str(val)
                     else:
                         # We assume 'val' is the simple text/value from frontend input
                         if col_id in new_values:
                             new_values[col_id]["text"] = str(val)
                             new_values[col_id]["value"] = str(val) 
                         else:
                             new_values[col_id] = {"text": str(val), "value": str(val), "type": "text"}
                 
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




class ClearCacheRequest(BaseModel):
    clear_db: bool = False
    clear_assets: bool = False
    clear_optimized: bool = False

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
        clear_optimized=request.clear_optimized
    )
    
    return result
