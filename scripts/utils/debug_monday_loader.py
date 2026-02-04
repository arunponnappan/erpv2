import sys
import os
import importlib

# Add the current directory to sys.path so we can import 'backend' or 'app'
# Assuming we run this from the parent of 'backend' or inside 'backend'?
# Let's assume we run from 'Development' root (parent of backend)
sys.path.append(os.getcwd())

print(f"Propagated CWD: {os.getcwd()}")
print(f"Sys Path: {sys.path}")

try:
    print("Attempting to import backend.custom_addons.monday_connector...")
    mod = importlib.import_module("backend.custom_addons.monday_connector")
    print(f"SUCCESS: Imported {mod}")
except Exception as e:
    print(f"FAILED to import module: {e}")
    import traceback
    traceback.print_exc()

try:
    print("Attempting to import backend.custom_addons.monday_connector.routes...")
    routes = importlib.import_module("backend.custom_addons.monday_connector.routes")
    print(f"SUCCESS: Imported routes {routes}")
    if hasattr(routes, "router"):
        print("SUCCESS: Found 'router' object")
    else:
        print("FAILED: 'router' object not found in routes.py")
except Exception as e:
    print(f"FAILED to import routes: {e}")
    import traceback
    traceback.print_exc()
