import requests
from PIL import Image
import io
import time

# URL from user logs (Expires=3600, checking validity)
# Decoded URL for easier handling
url = "https://prod-euc1-files-monday-com.s3.eu-central-1.amazonaws.com/19852830/resources/179820369/IMG_20251220_121115_464.jpg?response-content-disposition=attachment&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA4MPVJMFXBU3HSM42%2F20260110%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260110T144125Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=8166627e9c6c5c8cd52c6d572dcace18ba8e350d84944e08f0fa0b826047bffa"

print(f"Downloading image from: {url[:50]}...")

try:
    # 1. Fetch Original
    start = time.time()
    response = requests.get(url)
    response.raise_for_status()
    fetch_time = time.time() - start
    
    original_size = len(response.content)
    print(f"Original Downloaded: {original_size / 1024:.2f} KB in {fetch_time:.2f}s")
    
    # 2. Optimize Logic (Copy-Pasted from backend)
    img_io = io.BytesIO(response.content)
    img = Image.open(img_io)
    
    print(f"Original Dimensions: {img.size}")
    
    width = 400 # Target width
    
    if img.width > width:
        w_percent = (width / float(img.width))
        h_size = int((float(img.height) * float(w_percent)))
        img = img.resize((width, h_size), Image.Resampling.LANCZOS)
        print(f"Resized Dimensions: {img.size}")
    else:
        print("Image smaller than target, skipping resize.")
        
    output_io = io.BytesIO()
    # Save as WebP
    img.save(output_io, format="WEBP", quality=75)
    optimized_size = output_io.tell()
    
    print(f"Optimized Size: {optimized_size / 1024:.2f} KB")
    
    reduction = (1 - (optimized_size / original_size)) * 100
    print(f"REDUCTION: {reduction:.2f}%")
    
    if reduction > 50:
        print("SUCCESS: Optimization is working effectively.")
    else:
        print("WARNING: minimal optimization achieved.")

except Exception as e:
    print(f"Error: {e}")
