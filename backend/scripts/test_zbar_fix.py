
import os
import sys
import ctypes
import os
import sys
import ctypes
from PIL import Image

try:
    import cv2
    print(f"Pre-loaded CV2: {cv2.__version__}")
except:
    print("Could not preload CV2")

# Path to the specific image
img_path = r"C:\Users\ARUN\.gemini\antigravity\brain\11b81b3f-d37e-4560-a16b-f41d0b6aad90\uploaded_image_1768608972308.jpg"

print("--- TESTING ZBAR FIX ---")

# Calculate pyzbar path dynamically or hardcode for test
# We know it is in venv/Lib/site-packages/pyzbar
# Let's find site-packages
import site
site_packages = site.getsitepackages()[0]
if "site-packages" not in site_packages:
    # searching...
    for p in site.getsitepackages():
        if "site-packages" in p:
            site_packages = p
            break

pyzbar_dir = os.path.join(site_packages, 'pyzbar')
print(f"PyZBar Dir: {pyzbar_dir}")

if os.path.exists(pyzbar_dir):
    try:
        # The FIX: Add to DLL search path
        os.add_dll_directory(pyzbar_dir)
        print("Added to DLL directory.")
    except AttributeError:
        # Python < 3.8
        os.environ['PATH'] = pyzbar_dir + os.pathsep + os.environ['PATH']
        print("Added to PATH (Legacy).")

try:
    from pyzbar.pyzbar import decode
    print("Import Successful!")
    
    img = Image.open(img_path)
    res = decode(img)
    print(f"Decode Result: Found {len(res)} items")
    for r in res:
        print(f"Type: {r.type}, Data: {r.data}")

except Exception as e:
    print(f"Import/Decode Failed: {e}")
    # Traceback?
    import traceback
    traceback.print_exc()
