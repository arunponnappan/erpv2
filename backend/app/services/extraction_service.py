
import logging
from typing import Dict, Any, List
import io
import math

# Configure logging
logger = logging.getLogger(__name__)

# Try imports to handle environments where dependencies might be missing
try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    logger.warning("Pillow is missing. Extraction service disabled.")
    HAS_PILLOW = False

HAS_ZBAR = False
HAS_TESSERACT = False
HAS_OPENCV = False

try:
    from pyzbar.pyzbar import decode as zbar_decode
    HAS_ZBAR = True
except (ImportError, OSError, Exception) as e:
    logger.warning(f"ZBar/QRCode dependency missing or broken: {e}")

try:
    import pytesseract
    HAS_TESSERACT = True
except (ImportError, OSError, Exception) as e:
    logger.warning(f"Tesseract OCR dependency missing: {e}")

try:
    import cv2
    import numpy as np
    HAS_OPENCV = True
except ImportError:
    logger.warning("OpenCV dependency missing.")
    HAS_OPENCV = False


class ExtractionService:
    @staticmethod
    def extract_from_image(image_bytes: bytes, force_ai: bool = False) -> Dict[str, Any]:
        result = {"text": "", "codes": [], "success": False}
        
        if not HAS_PILLOW:
             return {"error": "Server missing Pillow library. Extraction disabled.", "text": "", "codes": []}

        try:
            # 1. Load Image with Pillow
            try:
                img = Image.open(io.BytesIO(image_bytes))
            except Exception as e:
                return {"error": f"Invalid image data: {e}", "text": "", "codes": []}

            # 2. Preprocessing
            gray_img = img.convert('L')
            
            codes = []
            seen_codes = set()
            found_something = False

            # --- PATH A: AI FORCED (Magic Scan) ---
            if force_ai:
                logger.info("--- MAGIC SCAN ENABLED (Force AI) ---")
                from app.services.ai_service import AIService
                if AIService.is_available():
                    ai_codes = AIService.extract_codes(image_bytes)
                    
                    # Check for explicit error from AI Service
                    if ai_codes and len(ai_codes) == 1 and ai_codes[0].get("type") == "ERROR":
                        return {"error": f"AI Error: {ai_codes[0].get('error')}", "success": False, "codes": []}
                        
                    if ai_codes:
                        logger.info(f"AI Found {len(ai_codes)} codes")
                        codes.extend(ai_codes)
                        found_something = True
                else:
                    return {"error": "AI Service unavailable (Check API Key)", "success": False, "codes": []}
                
                result["codes"] = codes
                result["success"] = True
                return result

            # --- Strategy 1: ZBar (Best for 1D) ---
            if HAS_ZBAR:
                try:
                    angles = [0, 90, 180, 270]
                    for angle in angles:
                        rotated_img = gray_img.rotate(angle, expand=True)
                        rotated_w, rotated_h = rotated_img.size
                        decoded_objects = zbar_decode(rotated_img)
                        
                        if decoded_objects: found_something = True
                        
                        for obj in decoded_objects:
                            data_str = obj.data.decode("utf-8")
                            unique_key = f"{obj.type}:{data_str}"
                            if unique_key in seen_codes: continue
                            
                            rx, ry, rw, rh = obj.rect.left, obj.rect.top, obj.rect.width, obj.rect.height
                            final_rect = ExtractionService._transform_rect(rx, ry, rw, rh, angle, gray_img.width, gray_img.height, rotated_w, rotated_h)
                            codes.append({ "type": obj.type, "data": data_str, "rect": final_rect, "angle_found": angle, "source": "CV_ZBAR" })
                            seen_codes.add(unique_key)
                    
                    # --- ZBar Pass 2: Inverted Image (for White on Black) ---
                    if not found_something:
                        # logger.info("ZBar: Low confidence. Trying Inverted Image...")
                        from PIL import ImageOps
                        inverted_gray = ImageOps.invert(gray_img)
                        for angle in angles:
                            rotated_img = inverted_gray.rotate(angle, expand=True)
                            rotated_w, rotated_h = rotated_img.size
                            decoded_objects = zbar_decode(rotated_img)
                            
                            if decoded_objects: found_something = True
                            
                            for obj in decoded_objects:
                                data_str = obj.data.decode("utf-8")
                                unique_key = f"{obj.type}:{data_str}"
                                if unique_key in seen_codes: continue
                                
                                rx, ry, rw, rh = obj.rect.left, obj.rect.top, obj.rect.width, obj.rect.height
                                final_rect = ExtractionService._transform_rect(rx, ry, rw, rh, angle, gray_img.width, gray_img.height, rotated_w, rotated_h)
                                codes.append({ "type": obj.type, "data": data_str, "rect": final_rect, "angle_found": angle, "source": "CV_ZBAR_INV" })
                                seen_codes.add(unique_key)

                except Exception as e:
                    logger.error(f"ZBar Execution Error: {e}")

            # --- Strategy 2: OpenCV (Fallback) ---
            if HAS_OPENCV and (not HAS_ZBAR or not found_something or len(codes) == 0):
                logger.info("--- START OPENCV SCAN (Fallback) ---")
                try:
                    # Prepare Base Images
                    bgr_img = np.array(img.convert('RGB')) 
                    bgr_img = bgr_img[:, :, ::-1].copy() # RGB to BGR
                    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
                    
                    # Pre-processing Strategies
                    # Tuple: (Name, Image)
                    strategies = []
                    
                    # 1. Standard Grayscale
                    strategies.append(("Gray", gray))
                    
                    # 2. Inverted (Essential for White-on-Dark labels)
                    inverted = cv2.bitwise_not(gray)
                    strategies.append(("Inverted", inverted))
                    
                    # 3. Adaptive Thresholding (Handle shadows/complex backgrounds)
                    # Block Size 11, C=2
                    adapt = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
                    strategies.append(("Adaptive", adapt))

                    # 4. Sharpened (For blurry prints)
                    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
                    sharpened = cv2.filter2D(gray, -1, kernel)
                    strategies.append(("Sharpened", sharpened))

                    qr_detector = cv2.QRCodeDetector()
                    barcode_detector = cv2.barcode_BarcodeDetector() if hasattr(cv2, 'barcode_BarcodeDetector') else None

                    # If we found codes in a previous stage, we can stop? 
                    # Or maybe we want to find ALL codes. Let's try high-confidence first.
                    
                    for s_name, s_img in strategies:
                        # Don't spend too much time if we already found codes, unless necessary.
                        # But user might have multiple codes.
                        
                        # Rotate 0 and 90
                        angles = [0, 90] 
                        for angle in angles:
                            if angle == 0: 
                                r_img = s_img.copy()
                            else: 
                                r_img = cv2.rotate(s_img, cv2.ROTATE_90_CLOCKWISE)

                            h, w = r_img.shape[:2]

                            # A. QR Detection
                            try:
                                retval, points = qr_detector.detect(r_img)
                                if retval:
                                    decoded_text, points, _ = qr_detector.detectAndDecode(r_img)
                                    if decoded_text:
                                         unique_key = f"QRCODE:{decoded_text}"
                                         if unique_key not in seen_codes:
                                             processed_rect = ExtractionService._extract_cv2_rect(points, angle, bgr_img.shape[1], bgr_img.shape[0], w, h, is_multidim=True)
                                             if processed_rect:
                                                 codes.append({ "type": "QRCODE", "data": decoded_text, "rect": processed_rect, "angle_found": angle })
                                                 seen_codes.add(unique_key)
                                                 logger.info(f"OpenCV Found QR ({s_name}): {decoded_text}")
                            except: pass

                            # B. Barcode Detection
                            if barcode_detector:
                                try:
                                    ret_tuple = barcode_detector.detectAndDecode(r_img)
                                    retval = False
                                    decoded_info = []
                                    points = None
                                    
                                    if len(ret_tuple) == 4:
                                         retval, decoded_info, _, points = ret_tuple
                                    elif len(ret_tuple) == 3:
                                         retval, decoded_info, points = ret_tuple
                                    
                                    if retval:
                                         for i, d_code in enumerate(decoded_info):
                                             if not d_code: continue
                                             unique_key = f"BARCODE:{d_code}"
                                             if unique_key in seen_codes: continue
                                             
                                             processed_rect = None
                                             if points is not None and len(points) > i:
                                                 processed_rect = ExtractionService._extract_cv2_rect(points[i], angle, bgr_img.shape[1], bgr_img.shape[0], w, h, is_multidim=False)
                                             
                                             if processed_rect:
                                                codes.append({ "type": "BARCODE", "data": d_code, "rect": processed_rect, "angle_found": angle })
                                                seen_codes.add(unique_key)
                                                logger.info(f"OpenCV Found BARCODE ({s_name}): {d_code}")
                                except: pass

                except Exception as ex:
                    logger.error(f"OpenCV Error: {ex}")

            # NOTE: Removed automatic AI fallback. This is now manual via force_ai.

            result["codes"] = codes
            
            # --- OCR ---
            if HAS_TESSERACT:
                try:
                    text = pytesseract.image_to_string(gray_img)
                    result["text"] = text.strip()
                except Exception as e:
                    logger.error(f"Tesseract Error: {e}")
            
            result["success"] = True
            return result
        
        except Exception as e:
            logger.error(f"Extraction Error: {e}")
            return {"error": str(e), "success": False}

    @staticmethod
    def _extract_cv2_rect(points, angle, orig_w, orig_h, rot_w, rot_h, is_multidim=True):
        try:
            pts = points
            if is_multidim and len(points.shape) > 2:
                pts = points[0]
            
            x_min, y_min = np.min(pts, axis=0)
            x_max, y_max = np.max(pts, axis=0)
            rw, rh = int(x_max - x_min), int(y_max - y_min)
            rx, ry = int(x_min), int(y_min)
            
            return ExtractionService._transform_rect(rx, ry, rw, rh, angle, orig_w, orig_h, rot_w, rot_h)
        except:
            return None

    @staticmethod
    def _transform_rect(rx, ry, rw, rh, angle, original_w, original_h, rotated_w, rotated_h):
        final_rect = {"x": rx, "y": ry, "w": rw, "h": rh}
        if angle == 90: 
            final_rect = { "x": ry, "y": original_w - (rx + rw), "w": rh, "h": rw }
        elif angle == 180: 
            final_rect = { "x": original_w - (rx + rw), "y": original_h - (ry + rh), "w": rw, "h": rh }
        elif angle == 270: 
             final_rect = { "x": original_h - (ry + rh), "y": rx, "w": rh, "h": rw }
        return final_rect
