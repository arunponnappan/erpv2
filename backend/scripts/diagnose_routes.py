import sys
import os
import json
from fastapi.routing import APIRoute

# Add current directory to sys.path
sys.path.append(os.getcwd())

# Attempt to import app
try:
    from app.main import app
    from app.core.module_loader import load_addons
    
    # Inline debugging of load_addons logic
    root_dir = os.getcwd()
    potential_paths = ["addons", "backend/addons"]
    
    print(f"DEBUG: CWD is {root_dir}")
    
    for path_name in potential_paths:
        addons_dir = os.path.join(root_dir, path_name)
        exists = os.path.exists(addons_dir)
        print(f"DEBUG: Checking {addons_dir} | Exists: {exists}")
        
        if not exists:
            continue
            
        print(f"DEBUG: Scanning directory: {addons_dir}")
        for module_name in os.listdir(addons_dir):
            module_path = os.path.join(addons_dir, module_name)
            manifest_path = os.path.join(module_path, "__manifest__.py")
            is_dir = os.path.isdir(module_path)
            has_manifest = os.path.exists(manifest_path)
            
            print(f"  - Module: {module_name} | IsDir: {is_dir} | HasManifest: {has_manifest}")
            
            if is_dir and has_manifest:
                print("    -> SHOULD LOAD THIS MODULE")
                try:
                    with open(manifest_path, "r") as f:
                        manifest = eval(f.read())
                    print(f"    -> Manifest loaded: {manifest.get('name')}")
                    # Simulate register
                    base_module = path_name.replace("/", ".").replace("\\", ".")
                    full_module_name = f"{base_module}.{module_name}"
                    print(f"    -> Import path: {full_module_name}")
                except Exception as e:
                    print(f"    -> ERROR reading manifest: {e}")

    print("------------------------------------")
        
except Exception as e:
    print(f"\nCRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
