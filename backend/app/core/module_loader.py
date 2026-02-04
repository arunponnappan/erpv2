import logging
import os
import sys
import importlib
import json
from fastapi import FastAPI
from sqlmodel import Session, select
from app.database import engine
from app.models.marketplace import MarketplaceApp
from app.core.config import settings

# Configure logging to write to a file for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
fh = logging.FileHandler('loader_debug.log')
fh.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)

ADDONS_PATHS = ["backend/addons", "backend/custom_addons"]

def load_addons(app: FastAPI):
    """
    Scans addons directories, seeds database, and mounts routers.
    """
    # 1. Ensure paths are absolute or relative to root
    root_dir = os.getcwd()
    
    # Paths to check. We try to be smart about where we are running from.
    # If running from 'backend' dir, we expect 'addons'.
    # If running from parent of backend, we expect 'backend/addons'.
    
    potential_paths = ["addons", "backend/addons", "custom_addons", "backend/custom_addons"]
    
    for path_name in potential_paths:
        addons_dir = os.path.join(root_dir, path_name)
        
        # specific check for custom_addons as well
        # simplified: just looking for "addons" and "custom_addons" in current or backend/
        
        if not os.path.exists(addons_dir):
            # Check if we need to search inside backend/ explicitly if we are in root
            continue

        print(f"--- Loading Addons from: {addons_dir} ---")
        
        for module_name in os.listdir(addons_dir):
            module_path = os.path.join(addons_dir, module_name)
            manifest_path = os.path.join(module_path, "__manifest__.py")
            
            if os.path.isdir(module_path) and os.path.exists(manifest_path):
                try:
                    # 2. Read Manifest
                    with open(manifest_path, "r") as f:
                        # Safe eval for python dictionary format
                        manifest = eval(f.read())
                    
                    # 3. Seed/Update Database
                    seed_module(manifest, module_name)
                    
                    # 4. Import Module and Register Routes
                    register_module(app, path_name, module_name, manifest)
                    
                    logger.info(f"Loaded module: {module_name}")
                except Exception as e:
                    logger.error(f"Failed to load module {module_name}: {e}")

def seed_module(manifest: dict, module_name: str):
    with Session(engine) as session:
        # Check if exists by technical name (usually directory name, but let's use name from manifest or fallback)
        name = manifest.get("name", module_name)
        
        db_app = session.exec(select(MarketplaceApp).where(MarketplaceApp.name == name)).first()
        
        if not db_app:
            db_app = MarketplaceApp(
                name=name,
                description=manifest.get("description", ""),
                category=manifest.get("category", "Uncategorized"),
                version=manifest.get("version", "1.0.0"),
                developer=manifest.get("author", "Unknown"),
                icon_url=manifest.get("icon", None), # Map 'icon' from manifest
                is_active=True # Default to active in marketplace listing
            )
            session.add(db_app)
        else:
            # Update fields
            db_app.description = manifest.get("description", db_app.description)
            db_app.category = manifest.get("category", db_app.category)
            db_app.version = manifest.get("version", db_app.version)
            db_app.developer = manifest.get("author", db_app.developer)
            if "icon" in manifest:
                db_app.icon_url = manifest["icon"]
            session.add(db_app)
            
        session.commit()

def register_module(app: FastAPI, relative_addons_path: str, module_name: str, manifest: dict):
    # Construct import path based on directory structure
    # If relative_addons_path is "addons", import is "addons.employees"
    # If "backend/addons", import is "backend.addons.employees"
    
    base_module = relative_addons_path.replace("/", ".").replace("\\", ".")
    
    # If running from backend directory, "backend.addons" might fail if backend package isn't in path,
    # but "addons" should work if it's a package.
    
    # HACK: For now, we know our strict structure:
    # We moved files to 'backend/addons'.
    # If running from 'backend' dir (cwd=backend), 'addons' is a local package.
    # So we probably want 'addons.employees'.
    
    # However, global imports used 'addons.employees' so that suggests 'addons' is in pythonpath.
    
    if "backend" in base_module and "backend" not in os.getcwd():
         # Running from outside?
         pass
         
    # Let's try to infer best import path.
    # If we found it at "addons", assume "addons.{module_name}"
    # If we found it at "backend/addons", assume "backend.addons.{module_name}"
    
    full_module_name = f"{base_module}.{module_name}"
    
    # Correction for when running inside backend dir but path was found as 'addons'
    # but we might want 'addons.employees' vs 'backend.addons.employees'
    # references in code used 'addons.employees...'
    
    print(f"Attempting to load module: {full_module_name}")
    
    try:
        # Import the module (runs __init__.py)
        mod = importlib.import_module(full_module_name)
        
        # Look for router in routes.py specifically? Or exposed in __init__?
        # Let's check routes submodule
        routes_module_name = f"{full_module_name}.routes"
        
        try:
            routes_mod = importlib.import_module(routes_module_name)
            if hasattr(routes_mod, "router"):
                # Register the router
                # Use prefix from manifest or default to module name
                url_prefix = manifest.get("url_prefix", f"/{module_name}")
                if not url_prefix.startswith("/"):
                    url_prefix = "/" + url_prefix
                    
                app.include_router(routes_mod.router, prefix=f"{settings.API_V1_STR}{url_prefix}", tags=[module_name])
                print(f"REGISTERED ROUTER: {module_name} at {settings.API_V1_STR}{url_prefix}")
        except ImportError as e:
            # Check if it is just missing routes.py (path not found) or an error INSIDE routes.py
            # If routes.py exists but failed to import, we should know.
            print(f"Could not load routes for {module_name}: {e}")
            pass
            
    except Exception as e:
        logger.error(f"Could not import module {full_module_name}: {e}")
        print(f"ERROR IMPORTING {full_module_name}: {e}")
