
import cv2
import sys

print(f"CV2 Ver: {cv2.__version__}")
if not hasattr(cv2, 'barcode_BarcodeDetector'):
    print("No BarcodeDetector")
    sys.exit(0)

bd = cv2.barcode_BarcodeDetector()
img = cv2.imread(r"C:\Users\ARUN\.gemini\antigravity\brain\11b81b3f-d37e-4560-a16b-f41d0b6aad90\uploaded_image_1768608972308.jpg")
if img is None:
    print("Img fail")
    sys.exit(1)

ret = bd.detectAndDecode(img)
print(f"Return type: {type(ret)}")
print(f"Return len: {len(ret)}")
print(f"Return values: {ret}")
