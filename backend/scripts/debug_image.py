
import cv2
import sys
import os
import numpy as np
from PIL import Image
from app.services.extraction_service import ExtractionService

# Path to the user's uploaded image
img_path = r"C:\Users\ARUN\.gemini\antigravity\brain\11b81b3f-d37e-4560-a16b-f41d0b6aad90\uploaded_image_1768608972308.jpg"

print(f"--- DEBUGGING IMAGE: {img_path} ---")
print(f"OpenCV Version: {cv2.__version__}")
print(f"Has BarcodeDetector: {hasattr(cv2, 'barcode_BarcodeDetector')}")

if not os.path.exists(img_path):
    print("ERROR: Image file not found at path.")
    sys.exit(1)

# Read Bytes
with open(img_path, "rb") as f:
    img_bytes = f.read()

# Run Service
print("\n--- RUNNING SERVICE ---")
result = ExtractionService.extract_from_image(img_bytes)
print("SERVICE RESULT:", result)

if not result['codes']:
    print("\n--- DEEP DIVE DIAGNOSIS ---")
    img = cv2.imread(img_path)
    if img is None:
        print("CV2 Failed to read image")
        sys.exit(1)

    # Manual check with standard detector
    bd = cv2.barcode_BarcodeDetector() if hasattr(cv2, 'barcode_BarcodeDetector') else None
    
    def decode_safe(detector, img):
        try:
            ret = detector.detectAndDecode(img)
            if len(ret) == 4:
                return ret
            elif len(ret) == 3:
                # retval, decoded_info, points (usually)
                return ret[0], ret[1], None, ret[2]
            else:
                return None, None, None, None
        except Exception as e:
            print(f"Decode err: {e}")
            return None, None, None, None

    if bd:
        print("Running Raw BarcodeDetector...")
        retval, decoded_info, _, points = decode_safe(bd, img)
        print(f"Raw Detect: {retval}, Info: {decoded_info}")
        
        # Try Thresholding
        print("Trying Preprocessing (Grayscale + Threshold)...")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Try a range of thresholds
        for thresh_val in [80, 100, 120, 150]:
            _, thresh = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY)
            retval, decoded_info, _, points = decode_safe(bd, thresh)
            if retval:
                print(f"SUCCESS at Threshold {thresh_val}: {decoded_info}")
                break
        else:
             print("Thresholding failed.")
             
        # Try Sharpening
        print("Trying Sharpening...")
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        sharpened = cv2.filter2D(gray, -1, kernel)
        retval, decoded_info, _, points = decode_safe(bd, sharpened)
        if retval:
             print(f"SUCCESS at Sharpening: {decoded_info}")

        # Try Upscaling (2x)
        print("Trying Upscale 2x...")
        upscaled = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        # Try threshold on upscaled
        _, thresh_up = cv2.threshold(upscaled, 100, 255, cv2.THRESH_BINARY)
        retval, decoded_info, _, points = decode_safe(bd, thresh_up)
        if retval:
             print(f"SUCCESS at Upscale+Thresh: {decoded_info}")
             
        # Try Rotation (90 deg)
        print("Trying Rotation 90...")
        rot90 = cv2.rotate(gray, cv2.ROTATE_90_CLOCKWISE)
        retval, decoded_info, _, points = decode_safe(bd, rot90)
        if retval:
             print(f"SUCCESS at Rotate90: {decoded_info}")

    else:
        print("No BarcodeDetector available.")

