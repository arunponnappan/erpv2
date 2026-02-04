import os
import sys
import importlib
from fastapi import FastAPI

# Mock FastAPI app
app = FastAPI()

# Add current directory to sys.path
sys.path.append(os.getcwd())

print(f"CWD: {os.getcwd()}")

potential_paths = ["addons", "backend/addons"]
found_addons_dir = None

for path_name in potential_paths:
    addons_dir = os.path.join(os.getcwd(), path_name)
    print(f"Checking {addons_dir}...")
    if os.path.exists(addons_dir):
        print(f"FOUND addons at {addons_dir}")
        found_addons_dir = addons_dir
        break

if not found_addons_dir:
    print("CRITICAL: Addons directory not found!")
    sys.exit(1)

# Try manual import of employees
try:
    print("Attempting to import addons.employees.routes...")
    import addons.employees.routes
    print("SUCCESS: Imported addons.employees.routes")
except ImportError as e:
    print(f"ERROR: Failed to import addons.employees.routes: {e}")
except Exception as e:
    print(f"ERROR: General exception during import: {e}")

# Now try using the actual module loader logic (copy-pasted relevant parts)
relative_addons_path = "addons" if "backend" not in found_addons_dir else "backend/addons" # rough approx
module_name = "employees"

base_module = "addons" # Assuming running from backend/
full_module_name = f"{base_module}.{module_name}" 
print(f"Loader logic target: {full_module_name}")

try:
    mod = importlib.import_module(full_module_name)
    print(f"Loader import success: {mod}")
    
    routes_module_name = f"{full_module_name}.routes"
    routes_mod = importlib.import_module(routes_module_name)
    print(f"Loader routes import success: {routes_mod}")
    
    if hasattr(routes_mod, "router"):
        print("Loader found 'router' object")
    else:
        print("Loader DID NOT find 'router' object")
        
except Exception as e:
    print(f"Loader logic FAILED: {e}")
