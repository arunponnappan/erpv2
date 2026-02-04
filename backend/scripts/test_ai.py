
import os
import sys
import logging

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock env if needed (User will need to set GEMINI_API_KEY env var)
# os.environ["GEMINI_API_KEY"] = "..." 

try:
    from app.services.ai_service import AIService
    print("AIService imported successfully.")
except ImportError as e:
    print(f"Failed to import AIService: {e}")
    # Add current dir to path
    sys.path.append(os.getcwd())
    try:
        from app.services.ai_service import AIService
        print("AIService imported successfully (after path fix).")
    except ImportError as e:
        print(f"CRITICAL: Could not import AIService: {e}")
        sys.exit(1)

def test_extraction(image_path):
    print(f"\n--- Testing Extraction on {image_path} ---")
    if not os.path.exists(image_path):
        print("Image file not found!")
        return

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    if not AIService.is_available():
        print("❌ AI Service NOT Available (Check GEMINI_API_KEY)")
        return

    print("Sending to AI...")
    try:
        results = AIService.extract_codes(image_bytes)
        print(f"✅ Comparison Finished. Found {len(results)} codes.")
        if results:
            print("Results:")
            for r in results:
                print(r)
        else:
            print("⚠️ No codes found.")
    except Exception as e:
        print(f"❌ Error during extraction: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Create a dummy image or use an existing one
    # I will try to find a jpg in the current dir or use the artifact one if absolute path works
    
    # Path to the artifact image we know exists
    target_image = r"C:\Users\ARUN\.gemini\antigravity\brain\11b81b3f-d37e-4560-a16b-f41d0b6aad90\uploaded_image_1768608972308.jpg"
    
    test_extraction(target_image)
