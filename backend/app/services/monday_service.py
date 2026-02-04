import httpx
from typing import Dict, Any, Optional, List, AsyncGenerator
import os
from pathlib import Path
from sqlmodel import Session, select
from app.models.monday import MondayBoard, MondayItem
import json
import asyncio
from datetime import datetime

try:
    from PIL import Image
    import io
except ImportError:
    Image = None

class MondayService:
    BASE_URL = "https://api.monday.com/v2"
    UPLOAD_DIR = "static/uploads"
    MAX_CONCURRENT_DOWNLOADS = 10

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json"
        }

    async def execute_query(self, query: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.BASE_URL,
                json={"query": query},
                headers=self.headers,
                timeout=30.0
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

    async def get_boards(self, limit: int = 100) -> list:
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
        return data.get("data", {}).get("boards", [])
        
    async def get_board_items(self, board_id: int, limit: int = 50, cursor: str = None) -> dict:
        # If cursor is provided, use it directly
        if cursor:
            query = f"""
            {{
                next_items_page (limit: {limit}, cursor: "{cursor}") {{
                    cursor
                    items {{
                        id
                        name
                        column_values {{
                            id
                            text
                            value
                            type
                        }}
                        assets {{
                            id
                            name
                            url
                            public_url
                            file_extension
                        }}
                    }}
                }}
            }}
            """
            data = await self.execute_query(query)
            items_page = data.get("data", {}).get("next_items_page", {})
        else:
            # Initial fetch
            query = f"""
            {{
                boards (ids: [{board_id}]) {{
                    items_page (limit: {limit}) {{
                        cursor
                        items {{
                            id
                            name
                            column_values {{
                                id
                                text
                                value
                                type
                            }}
                            assets {{
                                id
                                name
                                url
                                public_url
                                file_extension
                            }}
                        }}
                    }}
                }}
            }}
            """
            data = await self.execute_query(query)
            boards = data.get("data", {}).get("boards", [])
            items_page = boards[0].get("items_page", {}) if boards else {}

        return {
            "items": items_page.get("items", []),
            "cursor": items_page.get("cursor")
        }

    async def _process_asset(self, client: httpx.AsyncClient, semaphore: asyncio.Semaphore, 
                           board_id: int, item_id: str, asset: Dict, optimize_images: bool) -> Optional[Dict]:
        """
        Helper to download and optimize a single asset with concurrency limiting.
        """
        async with semaphore:
            asset_id = asset["id"]
            url = asset.get("public_url") or asset.get("url")
            if not url:
                return None
                
            # Create directory structure: static/uploads/{board_id}/{item_id}/
            file_ext = os.path.splitext(asset["name"])[1] or ""
            # Sanitize filename
            clean_name = "".join([c for c in asset["name"] if c.isalpha() or c.isdigit() or c in (' ', '.', '_')]).strip().replace(' ', '_')
            
            safe_dir = Path(self.UPLOAD_DIR) / str(board_id) / str(item_id)
            safe_dir.mkdir(parents=True, exist_ok=True)
            
            # Define local paths
            original_filename = f"{asset_id}_{clean_name}"
            local_file_path = safe_dir / original_filename
            web_path = f"/static/uploads/{board_id}/{item_id}/{original_filename}"
            
            result_update = {}

            # Check if already exists
            if not local_file_path.exists():
                try:
                    headers = {"Authorization": self.api_key} if "monday.com" in url else {}
                    
                    async with client.stream("GET", url, headers=headers, follow_redirects=True) as resp:
                        if resp.status_code == 200:
                            # Use standard synchronous open
                            with open(local_file_path, 'wb') as f:
                                async for chunk in resp.aiter_bytes():
                                    f.write(chunk)
                            
                            result_update["local_path"] = web_path
                            
                            # Optimization
                            if optimize_images and Image and file_ext.lower() in ['.jpg', '.jpeg', '.png']:
                                try:
                                    optimized_filename = f"opt_{asset_id}_{Path(clean_name).stem}.webp"
                                    optimized_path = safe_dir / optimized_filename
                                    opt_web_path = f"/static/uploads/{board_id}/{item_id}/{optimized_filename}"
                                    
                                    # Generate WebP
                                    with Image.open(local_file_path) as img:
                                        target_w = 800
                                        if img.width > target_w:
                                            ratio = target_w / float(img.width)
                                            h_size = int((float(img.height) * float(ratio)))
                                            img = img.resize((target_w, h_size), Image.Resampling.LANCZOS)
                                        
                                        img.save(optimized_path, "WEBP", quality=80)
                                        result_update["optimized_path"] = opt_web_path
                                except Exception as e:
                                    print(f"Optimization failed for {asset_id}: {e}")
                                    
                except Exception as e:
                    print(f"Download failed for {asset_id}: {e}")
            else:
                # If file exists, we still want to record that we have it
                result_update["local_path"] = web_path
                # Check for optimized version too
                optimized_filename = f"opt_{asset_id}_{Path(clean_name).stem}.webp"
                if (safe_dir / optimized_filename).exists():
                     result_update["optimized_path"] = f"/static/uploads/{board_id}/{item_id}/{optimized_filename}"

            if result_update:
                return {"asset_id": asset_id, "updates": result_update}
            return None

    async def sync_board(self, session: Session, board_id: int, download_assets: bool = False, optimize_images: bool = False, filters: List = None, filtered_item_ids: List = None) -> AsyncGenerator[str, None]:
        """
        Fetches all items from Monday, updates local DB, and optionally downloads/optimizes assets.
        Yields progress messages.
        """
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

            # 2. Fetch All Items (Recursive)
            cursor = None
            has_more = True
            total_items = 0
            
            # Semaphore for limiting concurrent downloads
            semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_DOWNLOADS)
            
            # Use a single client for all downloads in this sync session
            async with httpx.AsyncClient() as client:
                while has_more:
                    # Re-use existing get_board_items logic but with limit=100
                    page_data = await self.get_board_items(board_id, limit=100, cursor=cursor)
                    items = page_data.get("items", [])
                    cursor = page_data.get("cursor")
                    
                    if not items:
                        break
                    
                    # Apply Filter
                    if filtered_item_ids:
                         items = [i for i in items if int(i["id"]) in filtered_item_ids]
                         
                    if not items:
                        # Continue to fetch next page if all items were filtered out
                        continue

                    total_items += len(items)
                    yield json.dumps({"status": "fetching", "message": f"Fetched {total_items} items...", "count": total_items}) + "\n"
                        
                    # Prepare list to hold task objects if downloading
                    download_tasks = []
                    item_asset_map_refs = {} # Map item_id -> assets_map to update later

                    # Pre-Upsert Item Processing
                    for item in items:
                        # Parse column values
                        col_values = {}
                        for cv in item.get("column_values", []):
                            col_values[cv["id"]] = {
                                "text": cv.get("text"),
                                "value": cv.get("value"),
                                "type": cv.get("type")
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
                            
                            # Queue for download if requested
                            if download_assets:
                                # We check if we ALREADY have it? logic in _process_asset handles specific check but we can optimization here
                                # But let's just queue it, _process_asset checks file existence
                                task = self._process_asset(client, semaphore, board_id, item["id"], asset, optimize_images)
                                download_tasks.append(task)

                        # Store reference to map to update it after tasks complete
                        item_asset_map_refs[item["id"]] = assets_map

                    # Execute Downloads in Parallel for this Page
                    if download_tasks:
                        yield json.dumps({"status": "downloading", "message": f"Downloading assets for batch...", "count": total_items}) + "\n"
                        results = await asyncio.gather(*download_tasks)
                        
                        # Apply updates to maps
                        for res in results:
                            if res:
                                # Need to find which item this asset belongs to? 
                                # Actually we can't easily map back purely from result without ID.
                                # But we know the asset_ID. 
                                # Efficient way: iterate all items in this batch again or keep a flattened map?
                                # Let's just iterate the maps we built.
                                asset_id = res["asset_id"]
                                updates = res["updates"]
                                
                                # Find where this asset lives
                                for i_id, a_map in item_asset_map_refs.items():
                                    if asset_id in a_map:
                                        # Update the map entry
                                        a_map[asset_id].update(updates)
                                        # (optimization: could break here if assets are unique globaly, which they likely are)

                    # Now Upsert Items to DB with updated asset maps
                    for item in items:
                        item_id = int(item["id"])
                        assets_map = item_asset_map_refs[item["id"]]
                        
                        # Re-parse col_values because I didn't save them in the pre-loop (could optimize this repetition)
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
                        else:
                            existing_item.name = item["name"]
                            existing_item.column_values = col_values
                            existing_item.assets = assets_map
                    
                    session.commit()
                    
                    if not cursor:
                        has_more = False
                    
            # Update Board Last Synced Timestamp
            board = session.exec(select(MondayBoard).where(MondayBoard.id == board_id)).first()
            if board:
                board.last_synced_at = datetime.utcnow()
                session.add(board)
                session.commit()

            yield json.dumps({"status": "complete", "message": "Sync complete!", "total": total_items}) + "\n"
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield json.dumps({"status": "error", "message": f"Sync process failed: {str(e)}"}) + "\n"
        
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
            for col_id, val_data in item.column_values.items():
                col_data = val_data.copy()
                col_data["id"] = col_id
                col_values_list.append(col_data)
                
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

    async def clear_board_cache(self, session: Session, board_id: int, clear_db: bool = False, clear_assets: bool = False, clear_optimized: bool = False) -> Dict[str, Any]:
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
        board_dir = Path(self.UPLOAD_DIR) / str(board_id)
        if board_dir.exists():
            if clear_assets:
                # Remove entire directory specific to this board's items? 
                # Actually, the structure is static/uploads/{board_id}/{item_id}/
                # So removing board_dir removes everything.
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

        return results

    async def update_item_column_value(self, board_id: int, item_id: int, column_values: Dict[str, Any]) -> bool:
        """
        Updates specific column values for an item on Monday.com.
        """
        # Monday API expects JSON string for column_values
        json_values = json.dumps(column_values).replace('"', '\\"')
        
        query = f"""
        mutation {{
            change_multiple_column_values(item_id: {item_id}, board_id: {board_id}, column_values: "{json_values}") {{
                id
            }}
        }}
        """
        
        try:
            data = await self.execute_query(query)
            # If no error raised, it succeeded
            return True
        except Exception as e:
            print(f"Failed to update item {item_id}: {e}")
            raise e
