import os
import logging
import json
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    def is_available() -> bool:
        """
        Checks if API key is set. 
        Note: We do NOT check for the library here to avoid top-level imports that might crash the server.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("DEBUG: GEMINI_API_KEY is MISSING or EMPTY.")
        else:
            logger.info(f"DEBUG: GEMINI_API_KEY Found (Length: {len(api_key)})")
            
        return bool(api_key)

    @staticmethod
    def extract_codes(image_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Uses Gemini to identify barcodes, QR codes, and TEXT in the image.
        Lazy loads 'google.generativeai' to prevent server startup crashes.
        """
        # Lazy Import to prevent memory spike/crash at startup
        try:
            import google.generativeai as genai
        except ImportError:
            logger.error("google-generativeai library not found")
            return [{"type": "ERROR", "error": "AI Library Missing"}]

        if not AIService.is_available():
            logger.warning("AI Service unavailable (missing key).")
            return []

        try:
            api_key = os.getenv("GEMINI_API_KEY")
            genai.configure(api_key=api_key)

            # --- MODEL SELECTION ---
            # Prioritize "Lite" models (likely better quota) -> Standard -> Exp
            usable_models = [
                "gemini-2.0-flash-lite-preview-02-05",
                "gemini-2.0-flash-lite",
                "gemini-2.5-flash-lite",
                "gemini-2.0-flash",
                "gemini-2.0-flash-exp",
                "gemini-1.5-flash"
            ]
            
            logger.info(f"Using Lazy-Loaded AI Service. Candidates: {usable_models}")

            # Prompt
            prompt = """
            Analyze this image and identify ALL:
            1. 1D Barcodes (UPC, EAN, Code 128, etc.) - Look for vertical lines!
            2. **INVERTED BARCODES** (White lines on Black/Dark background) - These are common on electronics.
            3. QR Codes (2D)
            4. Readable Text (product names, labels, serial numbers)

            CRITICAL: 
            - Scan for BOTH standard (Black on White) and INVERTED (White on Black) codes.
            - Some barcodes might be small, rotated, or blurry. Extract precisely.

            For each item found, extract the exact data/text and its bounding box.
            
            Return ONLY a valid JSON array.
            Format:
            [
                {
                    "type": "QR_CODE" or "BARCODE" or "TEXT",
                    "data": "exact_content",
                    "box_2d": [ymin, xmin, ymax, xmax]  # Normalized 0-1000
                }
            ]
            If nothing is found, return [].
            """

            # Prepare Input
            image_blob = {
                'mime_type': 'image/jpeg', 
                'data': image_bytes
            }

            response = None
            errors = {}
            used_model = None

            for model_name in usable_models:
                try:
                    logger.info(f"Attempting AI Model: {model_name}")
                    model = genai.GenerativeModel(model_name)
                    
                    # Try with JSON enforcement first
                    try: 
                        generation_config = genai.GenerationConfig(response_mime_type="application/json")
                        response = model.generate_content(
                            [prompt, image_blob],
                            generation_config=generation_config
                        )
                    except Exception as json_err:
                        # Some models (like pro-vision) don't support JSON mode or fail with it
                        logger.warning(f"JSON Mode failed ({model_name}): {json_err}. Retrying text mode.")
                        response = model.generate_content([prompt, image_blob])

                    print(f"SUCCESS with model: {model_name}", flush=True)
                    used_model = model_name
                    break # Success!
                except Exception as e:
                    print(f"FAILED model {model_name}: {e}", flush=True)
                    errors[model_name] = str(e)
                    continue # Try next
            
            if not response:
                # Construct a useful error message
                first_model = usable_models[0]
                first_err = errors.get(first_model, "Unknown")
                
                # Check for 429/Quota in the first model's error
                if "429" in str(first_err) or "Quota" in str(first_err):
                    friendly_msg = "AI Usage Limit Reached (Free Tier). Please wait 15-30 seconds and try again."
                    logger.warning(f"AI Rate Limit: {first_err}")
                    # Return a special error structure that the frontend can display nicely?
                    # For now, just raising it so the generic handler catches it, but with clean text.
                    raise Exception(friendly_msg)

                error_msg = f"All models failed. Primary ({first_model}) Error: {first_err}. details: {json.dumps(errors)}"
                print(f"CRITICAL AI FAILURE: {error_msg}", flush=True)
                raise Exception(error_msg)
            
            # Parse Response
            text_response = response.text
            print(f"DEBUG_AI_RAW: {text_response}", flush=True)
            
            # Try Parse JSON
            try:
                data = json.loads(text_response)
            except json.JSONDecodeError:
                # If we fell back to text mode, we might need regex again
                import re
                match = re.search(r'\[.*\]', text_response, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                else:
                    raise Exception(f"Could not parse valid JSON from AI response ({used_model})")
            
            if isinstance(data, list):
                # Load image to get dimensions for scaling
                from PIL import Image
                import io
                img = Image.open(io.BytesIO(image_bytes))
                w, h = img.size

                results = []
                for item in data:
                    # Parse Box
                    rect = None
                    box = item.get("box_2d")
                    
                    if box and isinstance(box, list) and len(box) == 4:
                        # Gemini: [ymin, xmin, ymax, xmax] (0-1000)
                        ymin, xmin, ymax, xmax = box
                        
                        # Normalize 0-1000 to 0-1
                        files_ymin = ymin / 1000.0
                        files_xmin = xmin / 1000.0
                        files_ymax = ymax / 1000.0
                        files_xmax = xmax / 1000.0
                        
                        # Convert to Pixels (x, y, w, h)
                        files_x = int(files_xmin * w)
                        files_y = int(files_ymin * h)
                        files_w = int((files_xmax - files_xmin) * w)
                        files_h = int((files_ymax - files_ymin) * h)
                        
                        rect = { "x": files_x, "y": files_y, "w": files_w, "h": files_h }
                    else:
                        # Default to full image if no box
                         rect = { "x": 0, "y": 0, "w": w, "h": h }

                    results.append({
                        "type": item.get("type", "UNKNOWN"),
                        "data": str(item.get("data", "")),
                        "rect": rect,
                        "angle_found": 0,
                        "source": "AI_GEMINI"
                    })
                return results
            else:
                logger.warning(f"AI returned unexpected format: {type(data)}")
                return []

        except Exception as e:
            import traceback
            traceback.print_exc()
            err_msg = str(e)
            print(f"CRITICAL AI FAILURE: {err_msg}", flush=True)
            return [{"error": err_msg, "type": "ERROR", "data": "AI Error"}]
