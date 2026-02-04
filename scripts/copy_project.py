import os
import shutil
import sys

# Configuration
SOURCE_DIR = "C:\\Users\\ARUN\\OneDrive - Leisure World Holdings\\Documents\\Development"
DEST_DIR = "C:\\dev\\erp"
EXCLUDED_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".idea", ".vscode", "coverage"}
EXCLUDED_FILES = {".DS_Store", "Thumbs.db"}

def copy_project():
    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Source directory '{SOURCE_DIR}' does not exist.")
        return

    print(f"Copying from '{SOURCE_DIR}' to '{DEST_DIR}'...")

    if os.path.exists(DEST_DIR):
        print(f"Destination '{DEST_DIR}' exists. Merging/Overwriting...")
    else:
        os.makedirs(DEST_DIR)

    file_count = 0
    dir_count = 0

    for root, dirs, files in os.walk(SOURCE_DIR):
        # Filter directories in-place
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        
        # Calculate relative path
        rel_path = os.path.relpath(root, SOURCE_DIR)
        dest_path = os.path.join(DEST_DIR, rel_path)
        
        if not os.path.exists(dest_path):
            os.makedirs(dest_path)
            dir_count += 1
            
        for file in files:
            if file in EXCLUDED_FILES:
                continue
                
            src_file = os.path.join(root, file)
            dst_file = os.path.join(dest_path, file)
            
            try:
                shutil.copy2(src_file, dst_file)
                file_count += 1
            except Exception as e:
                print(f"Failed to copy {src_file}: {e}")

    print(f"Copy completed successfully.")
    print(f"Directories created: {dir_count}")
    print(f"Files copied: {file_count}")

if __name__ == "__main__":
    copy_project()
