import io
from PIL import Image, ImageDraw
from app.services.extraction_service import ExtractionService
import logging

# Setup Logging to match app
logging.basicConfig(level=logging.INFO)

# Create a dummy image (just white, won't have code, but should trigger log flow)
img = Image.new('RGB', (100, 100), color='white')
buf = io.BytesIO()
img.save(buf, format='PNG')
img_bytes = buf.getvalue()

print("--- RUNNING EXTRACTION SERVICE TEST ---")
result = ExtractionService.extract_from_image(img_bytes)
print("RESULT:", result)
print("---------------------------------------")
