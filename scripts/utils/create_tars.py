import tarfile
import os
import shutil

def create_tar(source_dir, output_path, excludes=None):
    if excludes is None:
        excludes = []
    
    # Ensure output dir exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    print(f"Creating {output_path} from {source_dir}...")
    
    # Normalize excludes to lowercase
    excludes = [e.lower() for e in excludes]

    with tarfile.open(output_path, "w") as tar:
        for root, dirs, files in os.walk(source_dir):
            
            # Prune directories in-place
            # Use lower() for comparison but keep original name for list
            dirs[:] = [d for d in dirs if d.lower() not in excludes and not d.startswith('.')]
            
            for file in files:
                if file.startswith('.') and file != 'captain-definition':
                    continue
                if file.endswith('.pyc') or file.endswith('.pyo') or file.endswith('.log') or file.endswith('.webp') or file.endswith('.png'):
                    continue
                if file.endswith('.db') or file.endswith('.sqlite') or file.endswith('.tar'):
                     continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                
                # Check path parts against excludes
                parts = rel_path.split(os.sep)
                if any(p.lower() in excludes for p in parts):
                    continue
                
                # Skip the tar itself if it's inside (unlikely if in deploy/)
                if os.path.abspath(full_path) == os.path.abspath(output_path):
                    continue

                print(f"Adding {rel_path}")
                tar.add(full_path, arcname=rel_path)
                
    size = os.path.getsize(output_path) / (1024*1024)
    print(f"Done! Created {output_path} ({size:.2f} MB)")

if __name__ == "__main__":
    # Common Excludes
    COMMON_EXCLUDES = [
        "venv", ".venv", "env", ".env", 
        "__pycache__", ".git", ".idea", ".vscode",
        "node_modules", "dist", "build", "coverage",
        "tmp", "temp", "logs", 
        "assets", "static", "images", "uploads", "data" # Exclude heavy assets
    ]

    # Backend
    create_tar("backend", "deploy/backend.tar", excludes=COMMON_EXCLUDES)
    
    # Frontend (Source)
    create_tar("frontend", "deploy/frontend.tar", excludes=COMMON_EXCLUDES + [".next"])
