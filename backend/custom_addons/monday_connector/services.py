import httpx
from typing import Dict, Any, Optional, List, AsyncGenerator
import os
from pathlib import Path
from sqlmodel import Session, select, delete, func, or_, col
from sqlalchemy.orm import selectinload
# Changed import from absolute to relative
from .models import MondayBoard, MondayItem, MondayBoardAccess, MondaySyncJob
import json
import asyncio
import uuid
from datetime import datetime

try:
    from PIL import Image
    import io
except ImportError:
    Image = None

class MondayService:
    BASE_URL = "https://api.monday.com/v2"
    ASSETS_DIR = "assets/monday_files"
    ASSETS_DIR = "assets/monday_files"
    MAX_CONCURRENT_DOWNLOADS = 10 # Increased to 10 for faster sync

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
            "API-Version": "2024-04"
        }

    async def execute_query(self, query: str, variables: Dict[str, Any] = None) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            payload = {"query": query}
            if variables:
                payload["variables"] = variables

            response = await client.post(
                self.BASE_URL,
                json=payload,
                headers=self.headers,
                timeout=60.0 # Increased from 30.0
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                # Log or re-raise with more info if needed
                raise Exception(f"Monday API Error: {response.text}")
                
            data = response.json()
            if "errors" in data:
                raise Exception(f"Monday GraphQL Error: {data['errors']}")
                
            return data
            
    async def test_connection(self) -> bool:
        try:
            query = "{ me { id name } }"
            data = await self.execute_query(query)
            return "data" in data
        except Exception:
            return False

    async def get_boards(self, session: Session = None, user: Any = None, limit: int = 100) -> list:
        # 1. Fetch from Monday API
        query = f"""
        {{
            boards (limit: {limit}) {{
                id
                name
                state
                columns {{
                    id
                    title
                    type
                    settings_str
                }}
            }}
        }}
        """
        data = await self.execute_query(query)
        boards = data.get("data", {}).get("boards", [])

        # 2. Filter by Access (RBAC)
        if user and session:
            # Check if admin
            # Assuming user.role is a string or Enum that str() converts to "admin"/"super_admin"
            role_str = str(user.role.value if hasattr(user.role, 'value') else user.role)
            if role_str not in ["super_admin", "admin"]:
                # Normal user: Filter
                # Get permitted board IDs
                perms = session.exec(select(MondayBoardAccess.board_id).where(MondayBoardAccess.user_id == user.id)).all()
                allowed_ids = set(perms) # Set of BigInts
                
                # Filter boards list
                boards = [b for b in boards if int(b["id"]) in allowed_ids]

        return boards
        
    def get_board_access_users(self, session: Session, board_id: int) -> List[int]:
        """Returns list of user_ids who have access to this board."""
        return session.exec(select(MondayBoardAccess.user_id).where(MondayBoardAccess.board_id == board_id)).all()

    def grant_board_access(self, session: Session, board_id: int, user_ids: List[int], granted_by: int = None):
        """Grants access to a board for multiple users."""
        for uid in user_ids:
            # Check existance
            exists = session.exec(select(MondayBoardAccess).where(MondayBoardAccess.board_id == board_id, MondayBoardAccess.user_id == uid)).first()
            if not exists:
                access = MondayBoardAccess(board_id=board_id, user_id=uid, granted_by=granted_by)
                session.add(access)
        session.commit()

    def revoke_board_access(self, session: Session, board_id: int, user_ids: List[int]):
        """Revokes access."""
        statement = delete(MondayBoardAccess).where(MondayBoardAccess.board_id == board_id).where(MondayBoardAccess.user_id.in_(user_ids))
        session.exec(statement)
        session.commit()
        
    async def get_board_items(self, board_id: int, limit: int = 50, cursor: str = None) -> dict:
        # If cursor is provided, use it directly
        if cursor:
            query = """
            query next_items_page($limit: Int!, $cursor: String!) {
                next_items_page (limit: $limit, cursor: $cursor) {
                    cursor
                    items {
                        id
                        name
                        column_values {
                            id
                            text
                            value
                            type
                        }
                        assets {
                            id
                            name
                            url
                            public_url
                            file_extension
                        }
                    }
                }
            }
            """
            variables = {
                "limit": limit,
                "cursor": cursor
            }
            data = await self.execute_query(query, variables)
            items_page = data.get("data", {}).get("next_items_page", {})
            return {
                "items": items_page.get("items", []),
                "cursor": items_page.get("cursor")
            }
        else:
            # Initial fetch
            query = """
            query board_items($boardId: [ID!], $limit: Int!) {
                boards (ids: $boardId) {
                    items_page (limit: $limit) {
                        cursor
                        items {
                            id
                            name
                            column_values {
                                id
                                text
                                value
                                type
                            }
                            assets {
                                id
                                name
                                url
                                public_url
                                file_extension
                            }
                        }
                    }
                }
            }
            """
            variables = {
                "boardId": [board_id],
                "limit": limit
            }
            try:
                print(f"[MONDAY] Fetching items for board {board_id}, limit={limit}", flush=True)
                data = await self.execute_query(query, variables)
                print(f"[MONDAY] Response keys: {data.keys() if data else 'None'}", flush=True)

                boards_data = data.get("data", {}).get("boards", [])
                print(f"[MONDAY] Boards count: {len(boards_data) if boards_data else 0}", flush=True)
                
                if boards_data:
                    items_page = boards_data[0].get("items_page", {})
                    if items_page:
                        items = items_page.get("items", [])
                        print(f"[MONDAY] SUCCESS: Returning {len(items)} items", flush=True)
                        return {
                            "items": items,
                            "cursor": items_page.get("cursor")
                        }
                    else:
                        print(f"[MONDAY] WARNING: items_page is empty/None", flush=True)
                else:
                    print(f"[MONDAY] WARNING: boards_data is empty", flush=True)
            except Exception as e:
                print(f"DEBUG: Modern Query Failed: {str(e)}", flush=True)
                print(f"DEBUG: Trying Legacy Query...", flush=True)

            # --- FALLBACK: LEGACY QUERY ---
            legacy_query = """
            query board_items($boardId: [ID!], $limit: Int!) {
                boards (ids: $boardId) {
                    items (limit: $limit) {
                        id
                        name
                        column_values {
                            id
                            text
                            value
                            type
                        }
                        assets {
                            id
                            name
                            url
                            public_url
                            file_extension
                        }
                    }
                }
            }
            """
            
            data = await self.execute_query(legacy_query, variables)

            boards_data = data.get("data", {}).get("boards", [])
            items = boards_data[0].get("items", []) if boards_data else []
            
            return { "items": items, "cursor": None }


    async def _process_asset(self, client: httpx.AsyncClient, semaphore: asyncio.Semaphore, board_id: int, item_id: str, asset: Dict, optimize: bool, force: bool, keep_original: bool) -> Dict[str, Any]:
        """
        Downloads and optionally optimizes an asset with concurrency control.
        """
        asset_id = asset["id"]
        # Public URL is needed to download - use 'public_url' or 'url' depending on what Monday provides in 'assets'
        # In API v2, assets usually have 'public_url'. The passed 'asset' object comes from the item's assets column value (resolved?) 
        # OR from the `assets` query on the item?
        # In sync_board, we query `assets { public_url ... }`. So it should be there.
        # Try public_url first, then fallback to url
        url = asset.get("public_url") or asset.get("url")
        
        if not url: 
            print(f"DEBUG: Skipping asset {asset_id} - No URL found. Keys: {asset.keys()}")
            return None 

        # Base Directory: assets/monday_files/{board_id}/{item_id}
        base_dir = Path(self.ASSETS_DIR) / str(board_id) / str(item_id)
        # DEBUG: Print resolved path
        try:
            abs_path = base_dir.resolve()
            print(f"DEBUG: Saving asset {asset_id} to: {abs_path}")
        except:
            print(f"DEBUG: Saving asset {asset_id} to: {base_dir} (resolution failed)")

        base_dir.mkdir(parents=True, exist_ok=True)
        
        # Sanitize filename
        original_name = asset.get("name", f"asset_{asset_id}")
        
        # FIX: Handle Duplicate Filenames
        # Prepend asset_id to ensure uniqueness even if multiple files have same name 'image.jpg'
        safe_original_name = "".join([c for c in original_name if c.isalnum() or c in ('-', '_', '.', ' ')])
        safe_name = f"{asset_id}_{safe_original_name}"
        
        local_file_path = base_dir / safe_name
        optimized_file_path = base_dir / f"opt_{Path(safe_name).stem}.webp"

        # Web Paths
        web_path_base = f"/assets/monday_files/{board_id}/{item_id}"
        web_path = f"{web_path_base}/{safe_name}"
        opt_web_path = f"{web_path_base}/{optimized_file_path.name}"

        stats = {"original_size": 0, "optimized_size": 0, "original_deleted": False, "downloaded": False, "optimized": False}
        result_update = {}

        # Helpers for async execution
        loop = asyncio.get_running_loop()

        def _check_exists(p: Path) -> bool:
            return p.exists()

        def _get_size(p: Path) -> int:
            return p.stat().st_size

        def _write_file(p: Path, content: bytes):
            with open(p, "wb") as f:
                f.write(content)

        def _delete_file(p: Path):
            p.unlink(missing_ok=True)

        async with semaphore:
            try:
                # Check existance
                original_exists = await loop.run_in_executor(None, _check_exists, local_file_path)
                optimized_exists = await loop.run_in_executor(None, _check_exists, optimized_file_path)
                
                # Logic:
                # If force=True, download everything again.
                # If not force:
                #   If optimize=True:
                #       If opt exists, we are good (unless we want to verify original?).
                #       If opt missing, we need original. If original missing, download.
                #   If optimize=False:
                #       If original exists, good. Else download.
                
                need_download = False
                need_optimize = False
                
                if force:
                    need_download = True
                    need_optimize = optimize and Image is not None
                else:
                    if optimize and Image:
                        if not optimized_exists:
                            need_optimize = True
                            if not original_exists:
                                need_download = True
                    else:
                        if not original_exists:
                            need_download = True

                if not need_download and not need_optimize:
                    # Even if no download needed, if files exist, we should return their paths 
                    # so they are saved/updated in the item's assets field.
                    if original_exists:
                        result_update["local_path"] = web_path
                    if optimized_exists:
                        result_update["optimized_path"] = opt_web_path
                    
                    if result_update:
                        return {"asset_id": asset_id, "updates": result_update, "stats": stats}
                    return None

                if need_download:
                    response = await client.get(url, follow_redirects=True)
                    if response.status_code == 200:
                        # Blocking Write -> Async
                        print(f"DEBUG: writing file content to {local_file_path}, type: {type(response.content)}, len: {len(response.content)}")
                        await loop.run_in_executor(None, _write_file, local_file_path, response.content)
                        
                        result_update["local_path"] = web_path
                        stats["original_size"] = await loop.run_in_executor(None, _get_size, local_file_path)
                        stats["downloaded"] = True
                    else:
                        print(f"Failed to download {url}: {response.status_code}")
                        return None
                elif original_exists:
                     stats["original_size"] = await loop.run_in_executor(None, _get_size, local_file_path)
                     # Ensure we know the path
                     if not result_update.get("local_path"):
                         result_update["local_path"] = web_path

                # Optimize
                if need_optimize:
                    # check existence again in case download failed?
                    if await loop.run_in_executor(None, _check_exists, local_file_path):
                        try:
                            # _optimize_image_sync is already a helper, just run it
                            await loop.run_in_executor(None, self._optimize_image_sync, local_file_path, optimized_file_path)
                            
                            stats["optimized_size"] = await loop.run_in_executor(None, _get_size, optimized_file_path)
                            stats["optimized"] = True
                            result_update["optimized_path"] = opt_web_path
                        except Exception as e:
                            print(f"Optimization failed: {e}")

                # Check Keep Original Logic
                # Only delete if we have a valid optimized file
                if not keep_original:
                     if await loop.run_in_executor(None, _check_exists, optimized_file_path):
                         await loop.run_in_executor(None, _delete_file, local_file_path)
                         stats["original_deleted"] = True
                         stats["original_size"] = 0
                         result_update["local_path"] = None 
                
                if result_update:
                     return {"asset_id": asset_id, "updates": result_update, "stats": stats}
                return None

            except Exception as e:
                print(f"Asset error {asset_id}: {e}")
                return None

    def _optimize_image_sync(self, input_path: Path, output_path: Path):
        """
        Synchronous helper for image optimization to be run in a thread pool.
        """
        if not Image: return
        
        with Image.open(input_path) as img:
            target_w = 800
            if img.width > target_w:
                ratio = target_w / float(img.width)
                h_size = int((float(img.height) * float(ratio)))
                img = img.resize((target_w, h_size), Image.Resampling.LANCZOS)
            
            img.save(output_path, "WEBP", quality=80)

    async def sync_board(self, session: Session, board_id: int, download_assets: bool = False, optimize_images: bool = False, force_sync_images: bool = False, keep_original_images: bool = True, filters: List[Dict] = None, filtered_item_ids: List[str] = None) -> AsyncGenerator[str, None]:
        """
        Fetches items from Monday, OPTIONALLY FILTERS THEM, updates local DB, and downloads/optimizes assets.
        Yields progress messages.
        """
        print(f"DEBUG: sync_board START. Board: {board_id}, Keep Original: {keep_original_images}")
        client = None
        try:
            yield json.dumps({"status": "started", "message": "Starting sync..."}) + "\n"

            # 1. Fetch Board Details (Columns)
            board_query = f"""
            {{
                boards (ids: [{board_id}]) {{
                    id
                    name
                    state
                    columns {{
                        id
                        title
                        type
                    }}
                }}
            }}
            """
            board_data = await self.execute_query(board_query)
            boards = board_data.get("data", {}).get("boards", [])
            if not boards:
                raise Exception(f"Board {board_id} not found")
                
            monday_board = boards[0]
            
            # Upsert Board
            db_board = session.exec(select(MondayBoard).where(MondayBoard.id == board_id)).first()
            if not db_board:
                db_board = MondayBoard(id=board_id, name=monday_board["name"])
                session.add(db_board)
            else:
                db_board.name = monday_board["name"]
            
            # Update columns structure
            columns_map = {col["id"]: col for col in monday_board.get("columns", [])}
            db_board.columns = columns_map
            session.commit()
            session.refresh(db_board)
            
            yield json.dumps({"status": "fetching", "message": "Board details updated. Fetching items..."}) + "\n"

            # 2. Fetch All Items (Recursive) => Then Filter
            # Monday API filtering is limited for complex cases, so we fetch all and filter in memory for now.
            # This ensures we have a consistent state if we wipe/update.
            # WAIT: If filtering, user probably expects ONLY those items to be updated.
            
            cursor = None
            has_more = True
            
            # Semaphore for limiting concurrent downloads
            semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_DOWNLOADS)
            
            # Use a single client for all downloads in this sync session
            client = httpx.AsyncClient(timeout=60.0) # Increased timeout from 30.0
            total_synced = 0
            page_count = 0 # Track pages
            synced_count = 0 # Track items
            total_size_bytes = 0
            original_size_bytes = 0
            optimized_size_bytes = 0
            fetched_count = 0
            
            # PRUNING: Track IDs seen during this sync
            seen_item_ids = set()
            process_all_items_flag = True
            
            while has_more:
                page_count += 1
                if page_count > 500: # Safety break
                     process_all_items_flag = False
                     yield json.dumps({"status": "error", "message": "Sync Stopped: Max page limit reached."}) + "\n"
                     break
                
                # Verify DB Count BEFORE fetch
                try:
                    pre_fetch_count = session.exec(select(func.count()).select_from(MondayItem).where(MondayItem.board_id == board_id)).one()
                    yield json.dumps({"status": "progress", "message": f"Start Page {page_count}. Items in DB: {pre_fetch_count}"}) + "\n"
                except: pass

                # Re-use existing get_board_items logic but with limit=100
                data = await self.get_board_items(board_id, limit=100, cursor=cursor) # Changed limit to 100
                items = data.get("items", [])
                new_cursor = data.get("cursor")
                
                if cursor and new_cursor == cursor:
                     yield json.dumps({"status": "warning", "message": "Cursor not advancing. Stopping."}) + "\n"
                     break
                cursor = new_cursor

                if not new_cursor:
                    has_more = False

                if not items:
                    break
                
                # Track SEEN IDs for Pruning
                for i in items:
                    seen_item_ids.add(int(i['id']))

                fetched_count += len(items)
                yield json.dumps({"status": "progress", "message": f"Page {page_count}: Fetched {len(items)} items. IDs: {[i['id'] for i in items[:3]]}..."}) + "\n"

                # --- FILTERING LOGIC ---
                items_to_sync = []
                if filters:
                    for item in items:
                        try:
                            match = True
                            for f in filters:
                                if f.get("condition") == "is_duplicate": continue 
                                if not f.get("value"): continue
                                
                                col_id = f.get("column", "all")
                                # Safe string conversion
                                query_val = str(f.get("value", "")).lower()
                                
                                item_val = ""
                                if col_id == "name":
                                    item_val = str(item.get("name", ""))
                                elif col_id != "all":
                                    # Find column safely
                                    c_val = next((c for c in item.get("column_values", []) if c.get("id") == col_id), None)
                                    item_val = str(c_val.get("text", "")) if c_val else ""
                                
                                if col_id == "all":
                                    # Search name + all columns
                                    if query_val not in str(item.get("name", "")).lower():
                                        found_in_col = False
                                        for c in item.get("column_values", []):
                                            if c.get("text") and query_val in str(c.get("text")).lower():
                                                found_in_col = True
                                                break
                                        if not found_in_col:
                                            match = False
                                else:
                                    if query_val not in item_val.lower():
                                        match = False
                                
                                if not match: break
                            
                            if match:
                                items_to_sync.append(item)
                        except Exception as e:
                            print(f"Filter error on item {item.get('id')}: {e}")
                            # Determine policy: Skip item on error or include? 
                            # Safer to skip if we can't verify filter.
                            continue
                else:
                    items_to_sync = items
                    
                # -----------------------
                
                synced_count += len(items_to_sync)
                yield json.dumps({"status": "fetching", "message": f"Fetched page {page_count} ({len(items)} items)", "count": synced_count}) + "\n"
            
                print(f"DEBUG: Processing {len(items_to_sync)} items for Upsert")
                
                # if not items_to_sync:
                #    if not cursor: has_more = False
                #    continue


                # Prepare list to hold task objects if downloading
                download_tasks = []
                item_asset_map_refs = {} # Map item_id -> assets_map to update later

                # Pre-Upsert Item Processing
                first_item_debug = True # Flag to debug only first item of page
                for item in items_to_sync:
                    if first_item_debug:
                        print(f"[SYNC_DEBUG] First Item ID: {item.get('id')} Name: {item.get('name')}", flush=True)
                        # Print ALL columns (no truncation)
                        print(f"[SYNC_DEBUG] Column Values Full: {json.dumps(item.get('column_values', []))}", flush=True)
                        
                        # Explicitly check for auto-number like columns
                        for c in item.get("column_values", []):
                            if "auto" in c.get("id", "") or "auto" in c.get("type", ""):
                                 print(f"[SYNC_DEBUG] Found Potential Autonumber: {c}", flush=True)
                        
                        first_item_debug = False

                    # Parse column values
                    col_values = {}
                    for cv in item.get("column_values", []):
                        val_text = cv.get("text")
                        val_value = cv.get("value")
                        val_type = cv.get("type")
                        
                        # FALLBACK: If text is missing but value exists (Auto Number, Formula, etc.)
                        if not val_text and val_value:
                            try:
                                import json as j # alias to avoid conflict if any
                                val_obj = j.loads(val_value)
                                # Common patterns
                                if "value" in val_obj: # Auto Number often {"value": 123}
                                    val_text = str(val_obj["value"])
                                elif "formula_result" in val_obj:
                                    val_text = str(val_obj["formula_result"])
                                # Add more heuristics if needed
                            except:
                                pass # Keep empty if parse fails

                        col_values[cv["id"]] = {
                            "text": val_text,
                            "value": val_value,
                            "type": val_type
                        }
                    
                    # Parse assets & Check existing keys
                    existing_item = session.exec(select(MondayItem).where(MondayItem.id == int(item["id"]))).first()
                    existing_assets = existing_item.assets if existing_item else {}

                    assets_map = {}
                    for asset in item.get("assets", []):
                        asset_id = asset["id"]
                        assets_map[asset_id] = asset
                        
                        # Preserve known paths
                        if asset_id in existing_assets:
                            if "local_path" in existing_assets[asset_id]:
                                 assets_map[asset_id]["local_path"] = existing_assets[asset_id]["local_path"]
                            if "optimized_path" in existing_assets[asset_id]:
                                assets_map[asset_id]["optimized_path"] = existing_assets[asset_id]["optimized_path"]
                            if "rotation" in existing_assets[asset_id]:
                                assets_map[asset_id]["rotation"] = existing_assets[asset_id]["rotation"]
                        
                        # Queue for download if requested AND item matches filter (if explicitly filtered)
                        should_process_assets = download_assets
                        if should_process_assets and filtered_item_ids is not None:
                            should_process_assets = str(item["id"]) in filtered_item_ids
                        
                        if should_process_assets:
                            task = self._process_asset(client, semaphore, board_id, item["id"], asset, optimize_images, force_sync_images, keep_original_images)
                            download_tasks.append(task)

                    # Store reference to map to update it after tasks complete
                    item_asset_map_refs[item["id"]] = assets_map

                # Execute Downloads in Parallel for this Page
                if download_tasks:
                    yield json.dumps({"status": "downloading", "message": f"Downloading {len(download_tasks)} images for {len(items_to_sync)} items...", "count": synced_count}) + "\n"
                    results = await asyncio.gather(*download_tasks)
                    
                    # Log success
                    success_count = sum(1 for r in results if r)
                    
                    # Calculate detailed stats
                    downloaded_count = 0
                    optimized_count = 0
                    for r in results:
                        if r and "stats" in r:
                            if r["stats"].get("downloaded"): downloaded_count += 1
                            if r["stats"].get("optimized"): optimized_count += 1

                    yield json.dumps({"status": "downloading", "message": f"Downloading/Processing {len(download_tasks)} assets: {downloaded_count} new downloads, {optimized_count} optimized.", "count": synced_count}) + "\n"
                    
                    # Apply updates to maps and calculate stats
                    for res in results:
                        if res:
                            asset_id = res["asset_id"]
                            updates = res["updates"]
                            stats = res.get("stats", {}) # Expecting _process_asset to return stats
                            
                            # Stats
                            original_size_bytes += stats.get("original_size", 0)
                            optimized_size_bytes += stats.get("optimized_size", 0)
                            total_size_bytes += stats.get("original_size", 0) + stats.get("optimized_size", 0)
                            
                            # Find where this asset lives
                            for i_id, a_map in item_asset_map_refs.items():
                                if asset_id in a_map:
                                    a_map[asset_id].update(updates)
                                    # Fix: Persist stats to asset object so frontend can read file size
                                    a_map[asset_id]["stats"] = stats
                elif download_assets:
                     yield json.dumps({"status": "downloading", "message": f"No new images to download/optimize for this batch."}) + "\n"

                # Now Upsert Items to DB with updated asset maps
                batch_items = items_to_sync
                yield json.dumps({"status": "progress", "message": f"Saving {len(batch_items)} items to DB..."}) + "\n"
                
                added_count = 0
                updated_count = 0
                
                # Now Upsert Items to DB with updated asset maps
                for item in batch_items:
                    item_id = int(item["id"])
                    assets_map = item_asset_map_refs[item["id"]]
                    
                    col_values = {}
                    for cv in item.get("column_values", []):
                        col_values[cv["id"]] = {
                            "text": cv.get("text"),
                            "value": cv.get("value"),
                            "type": cv.get("type")
                        }

                    existing_item = session.exec(select(MondayItem).where(MondayItem.id == item_id)).first()
                    
                    if not existing_item:
                        new_item = MondayItem(
                            id=item_id,
                            board_id=board_id,
                            name=item["name"],
                            column_values=col_values,
                            assets=assets_map
                        )
                        session.add(new_item)
                        added_count += 1
                    else:
                        existing_item.name = item["name"]
                        existing_item.column_values = col_values
                        existing_item.assets = assets_map
                        updated_count += 1
                
                try:
                    session.commit()
                    yield json.dumps({"status": "progress", "message": f"Committed: {added_count} new, {updated_count} updated."}) + "\n"
                    
                    # --- ASSET CLEANUP ---
                    # Identify assets that were removed from items in this batch
                    # We compare 'existing_assets' vs 'assets_map' (new)
                    # We already fetched existing_item in the loop, but we need to do this carefully.
                    # It's better to do this during the main loop or right after commit if we tracked deletions.
                    # Let's do a post-process on the batch since we have item_asset_map_refs (new state)
                    # But we need the OLD state. The loop above already updated the DB objects.
                    
                    # Refined Approach:
                    # Inside the loop, we had 'existing_assets'. We should have diffed them there.
                    # But we didn't want to delete files if the commit failed. 
                    # Now commit is successful. But we lost the 'existing_assets' reference (overwritten in DB object memory).
                    
                    # To be safe and simple: We will trust the "Preserve Existing" logic for now. 
                    # True orphan cleanup (deleted assets) might require a second pass or better tracking in the future.
                    # For now, we focus on ITEM deletion cleanup below, which is the big space saver.
                    
                except Exception as e:
                    session.rollback()
                    yield json.dumps({"status": "error", "message": f"Commit Failed: {str(e)}"}) + "\n"

                
                if not cursor:
                    has_more = False
                
            # PRUNING: Delete items that no longer exist on Monday.com
            # Indented to 12 spaces to stay within the function-wide try block
            if process_all_items_flag:
                 pass

            all_local_ids = session.exec(select(MondayItem.id).where(MondayItem.board_id == board_id)).all()
            ids_to_delete = set(all_local_ids) - seen_item_ids
            
            pruned_count = 0
            if ids_to_delete:
                yield json.dumps({"status": "progress", "message": f"Pruning {len(ids_to_delete)} deleted items..."}) + "\n"
                # Batch delete
                try:
                    # We need to chunk it if too many? SQLite handles 999 limit.
                    # Assuming list isn't massive for now, or chunk it.
                    id_list = list(ids_to_delete)
                    chunk_size = 500
                    for i in range(0, len(id_list), chunk_size):
                        chunk = id_list[i:i + chunk_size]
                        statement = delete(MondayItem).where(col(MondayItem.id).in_(chunk))
                        session.exec(statement)
                    session.commit()
                    pruned_count = len(ids_to_delete)
                    
                    # --- FILE CLEANUP for Deleted Items ---
                    deleted_dirs_count = 0
                    for item_id in ids_to_delete:
                        try:
                            item_dir = Path(self.ASSETS_DIR) / str(board_id) / str(item_id)
                            if item_dir.exists() and item_dir.is_dir():
                                import shutil
                                shutil.rmtree(item_dir)
                                deleted_dirs_count += 1
                        except Exception as cleanup_err:
                            print(f"[CLEANUP ERROR] Failed to remove dir for item {item_id}: {cleanup_err}")
                            
                    yield json.dumps({"status": "progress", "message": f"Pruned {pruned_count} orphaned items and {deleted_dirs_count} folders."}) + "\n"
                except Exception as e:
                    session.rollback()
                    print(f"Pruning failed: {e}")
                    print(f"Pruning failed: {e}")
                    yield json.dumps({"status": "warning", "message": f"Pruning failed: {e}"}) + "\n"
            
            # Force Garbage Collection after loop
            import gc
            gc.collect()

        # Update Board Last Synced Timestamp AND Stats
        # This is outside the loop, runs once. Safe.
            board = session.exec(select(MondayBoard).where(MondayBoard.id == board_id)).first()
            if board:
                board.last_synced_at = datetime.utcnow()
                board.last_sync_item_count = synced_count # Should this trigger count be current active limit? 
                # Ideally count should be `len(seen_item_ids)` if that's the true total.
                # But actual synced (DB) count is what matters?
                # Let's count DB items
                final_count = session.exec(select(func.count(MondayItem.id)).where(MondayItem.board_id == board_id)).one()
                board.last_sync_item_count = final_count
                
                board.last_sync_size_bytes = total_size_bytes
                board.last_sync_original_size_bytes = original_size_bytes
                board.last_sync_optimized_size_bytes = optimized_size_bytes
                session.add(board)
                session.commit()
            
            # Format message
            size_mb = total_size_bytes / (1024 * 1024)
            saved_mb = (original_size_bytes - optimized_size_bytes) / (1024 * 1024) if optimize_images else 0
            
            msg = f"Synced {synced_count} items. Size: {size_mb:.2f} MB."
            if optimize_images and saved_mb > 0:
                msg += f" Optimization saved {saved_mb:.2f} MB."
    
            # Verify DB Count
            try:
                db_count = session.exec(select(func.count()).select_from(MondayItem).where(MondayItem.board_id == board_id)).one()
                msg += f" (DB Verified: {db_count} items)"
            except Exception as e:
                msg += f" (DB Check Failed: {str(e)})"
    
            yield json.dumps({"status": "complete", "message": msg, "total": synced_count, "stats": {
                "size_mb": size_mb,
                "saved_mb": saved_mb
            }}) + "\n"
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield json.dumps({"status": "error", "message": f"Sync process failed: {str(e)}"}) + "\n"
        finally:
            if client:
                await client.aclose()
        
    def get_local_board_items(self, session: Session, board_id: int) -> List[Dict[str, Any]]:
        """
        Retrieves items from the local database and formats them to match Monday API structure.
        Resolves local URLs if available.
        """
        db_items = session.exec(select(MondayItem).where(MondayItem.board_id == board_id)).all()
        
        output_items = []
        for item in db_items:
            # Convert column_values dict back to list
            col_values_list = []
            
            # Robust handling: column_values might be Dict or List (due to old syncs)
            if isinstance(item.column_values, dict):
                for col_id, val_data in item.column_values.items():
                    col_data = val_data.copy()
                    col_data["id"] = col_id
                    col_values_list.append(col_data)
            elif isinstance(item.column_values, list):
                # If it's already a list (from Monday API direct save), just use it
                col_values_list = item.column_values
            else:
                # Handle None or weird types
                col_values_list = []
                
            # Convert assets dict back to list AND inject local URLs
            assets_list = []
            for asset_id, asset_data in item.assets.items():
                asset_data_copy = asset_data.copy()
                asset_data_copy["id"] = asset_id
                
                # Logic: If we have a local path, inject it
                if "local_path" in asset_data:
                    asset_data_copy["local_url"] = asset_data["local_path"]
                if "optimized_path" in asset_data:
                    asset_data_copy["optimized_url"] = asset_data["optimized_path"]

                assets_list.append(asset_data_copy)

            output_items.append({
                "id": str(item.id),
                "name": item.name,
                "column_values": col_values_list,
                "assets": assets_list
            })
            
        return output_items

    async def create_sync_job(self, session: Session, board_id: int, user_id: int, params: Dict[str, Any] = {}) -> MondaySyncJob:
        job = MondaySyncJob(
            board_id=board_id, 
            created_by=user_id, 
            status="pending",
            stats={"params": params},
            progress_message="Queued..."
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        return job

    async def get_sync_job(self, session: Session, job_id: uuid.UUID) -> MondaySyncJob:
        return session.get(MondaySyncJob, job_id)

    async def run_sync_job(self, session: Session, job_id: uuid.UUID, **kwargs):
        """
        Legacy wrapper redirecting to Queue Processor.
        The route calls this, so we use this entry point to trigger the queue.
        """
        await self.process_queue(session)

    async def process_queue(self, session: Session):
        """
        Core Queue Processor (Serial/FIFO).
        1. Checks if a job is currently RUNNING. If yes, exits.
        2. Finds oldest PENDING job.
        3. Executes it.
        4. Recursively checks for next job.
        """
        print("Queue Processor: Checking for jobs...")
        
        # 1. Concurrency Check
        active_job = session.exec(select(MondaySyncJob).where(MondaySyncJob.status == "running")).first()
        if active_job:
            print(f"Queue Processor: Job {active_job.id} is already running. Exiting.")
            return

        # 2. Fetch Next Job (FIFO)
        next_job = session.exec(select(MondaySyncJob).where(MondaySyncJob.status == "pending").order_by(MondaySyncJob.created_at.asc())).first()
        
        if not next_job:
            print("Queue Processor: No pending jobs.")
            return

        # 3. Execute
        print(f"Queue Processor: Starting Job {next_job.id}")
        
        # Execute the job
        await self._execute_sync_job(session, next_job.id) 

    async def _execute_sync_job(self, session: Session, job_id: uuid.UUID):
        """
        Internal: Executes the sync logic for a specific job.
        """
        job = session.get(MondaySyncJob, job_id)
        if not job: return

        print(f"Executing Job {job_id}")
        job.status = "running"
        job.progress_message = "Starting..."
        session.add(job)
        session.commit()

        # Extract Params (Assuming we stored them, or defaulting)
        # TODO: Implement Params storage. For now, defaults.
        sync_kwargs = job.stats.get("params", {}) if job.stats else {}
        # We will store params in 'stats' field for now to avoid schema change if possible? 
        # 'stats' is JSON. We can put {"params": {...}, "results": ...}
        
        logs_buffer = []

        try:
            async for line in self.sync_board(session, job.board_id, **sync_kwargs):
                try:
                    data = json.loads(line)
                    msg = data.get("message", "")
                    status = data.get("status")
                    
                    job.progress_message = msg
                    if status == "error":
                        logs_buffer.append(f"ERROR: {msg}")
                    elif status == "warning":
                        logs_buffer.append(f"WARNING: {msg}")
                    else:
                        if "Page" in msg or "Downloading" in msg or "Committed" in msg:
                             logs_buffer.append(msg)
                    
                    if not job.logs:
                        job.logs = []
                    job.logs = list(job.logs) + logs_buffer
                    logs_buffer = []
                    
                    if data.get("stats"):
                        # Merge stats, don't overwrite params if we stored them there
                        current_stats = job.stats or {}
                        current_stats.update(data.get("stats"))
                        job.stats = current_stats

                    session.add(job)
                    session.commit()
                except json.JSONDecodeError:
                    pass

            job.status = "complete"
            job.completed_at = datetime.utcnow()
            job.progress_message = "Sync Completed Successfully"
            session.add(job)
            session.commit()

        except Exception as e:
            import traceback
            traceback.print_exc()
            job.status = "failed"
            job.completed_at = datetime.utcnow()
            job.progress_message = f"Failed: {str(e)}"
            if not job.logs:
                job.logs = []
            job.logs = list(job.logs) + [f"CRITICAL ERROR: {str(e)}"]
            session.add(job)
            session.commit()
            
        # 4. Recursion: Check for next job
        # We need to run this in background again to avoid deep recursion stack?
        # Just await it.
        await self.process_queue(session)

    async def clear_board_cache(
        self,
        session: Session,
        board_id: str,
        clear_db: bool = False,
        clear_assets: bool = False,
        clear_optimized: bool = False,
        clear_originals: bool = False
    ):
        """
        Clears selected cache types for a specific board.
        """
        results = {"db_items_removed": 0, "storage_freed_mb": 0.0}
        
        # 1. Clear DB Items
        if clear_db:
            try:
                statement = select(MondayItem).where(MondayItem.board_id == board_id)
                items = session.exec(statement).all()
                count = len(items)
                for item in items:
                    session.delete(item)
                session.commit()
                results["db_items_removed"] = count
            except Exception as e:
                print(f"Error clearing DB: {e}")
                session.rollback()

        # 2. Clear Files
        # Path: assets/monday_files/{board_id}
        board_dir = Path(self.ASSETS_DIR) / str(board_id)
        if board_dir.exists():
            if clear_assets:
                # Remove entire directory specific to this board's items
                try:
                    import shutil
                    # Calculate size before deletion for reporting?
                    total_size = sum(f.stat().st_size for f in board_dir.rglob('*') if f.is_file())
                    results["storage_freed_mb"] += total_size / (1024 * 1024)
                    
                    shutil.rmtree(board_dir)
                except Exception as e:
                    print(f"Error clearing assets: {e}")
            
            elif clear_optimized:
                # Only delete opt_* files
                try:
                    freed_bytes = 0
                    for file_path in board_dir.rglob("opt_*"):
                        if file_path.is_file():
                            freed_bytes += file_path.stat().st_size
                            file_path.unlink()
                    results["storage_freed_mb"] += freed_bytes / (1024 * 1024)
                except Exception as e:
                    print(f"Error clearing optimized images: {e}")

            elif clear_originals:
                # Delete files NOT starting with opt_
                try:
                    freed_bytes = 0
                    for file_path in board_dir.rglob("*"):
                        if file_path.is_file() and not file_path.name.startswith("opt_"):
                            freed_bytes += file_path.stat().st_size
                            file_path.unlink()
                    results["storage_freed_mb"] += freed_bytes / (1024 * 1024)
                except Exception as e:
                    print(f"Error clearing original images: {e}")

        return results

    async def update_item_column_value(self, board_id: int, item_id: int, column_values: Dict[str, Any]) -> bool:
        """
        Updates specific column values for an item on Monday.com.
        """
        # Using variables avoids string escaping issues
        # column_values argument in 'change_multiple_column_values' is type 'JSON' 
        # which accepts a JSON string OR an object if using variables.
        # However, historically it often requires a JSON string.
        # Let's try passing the object first as it's cleaner. If it fails, we stringify it.
        # Actually, standard practice for Monday API v2 with variables for this arg is passing JSON string.
        
        json_values = json.dumps(column_values)
        
        query = """
        mutation change_multiple_column_values($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
            change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) {
                id
            }
        }
        """
        
        variables = {
            "itemId": item_id,
            "boardId": board_id,
            "columnValues": json_values 
        }
        
        try:
            data = await self.execute_query(query, variables)
            # If no error raised, it succeeded
            return True
        except Exception as e:
            print(f"Failed to update item {item_id}: {e}")
            raise e

    def reset_queue_jobs(self, session: Session):
        """
        Resets all Pending or Running jobs to Failed.
        Used to unstuck the queue.
        """
        jobs = session.exec(select(MondaySyncJob).where(MondaySyncJob.status.in_(["pending", "running"]))).all()
        count = len(jobs)
        for job in jobs:
            job.status = "failed"
            job.progress_message = "Manually cancelled/reset"
            job.completed_at = datetime.utcnow()
            session.add(job)
        session.commit()
        return count
