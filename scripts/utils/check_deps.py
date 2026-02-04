
try:
    import cv2
    print("cv2: OK")
except ImportError as e:
    print(f"cv2: MISSING ({e})")

try:
    import numpy
    print("numpy: OK")
except ImportError as e:
    print(f"numpy: MISSING ({e})")

try:
    import pytesseract
    print("pytesseract: OK")
except ImportError as e:
    print(f"pytesseract: MISSING ({e})")

try:
    from pyzbar.pyzbar import decode
    print("pyzbar: OK")
except ImportError as e:
    print(f"pyzbar: MISSING ({e})")
