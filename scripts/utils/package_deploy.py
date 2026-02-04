import tarfile
import os

def create_filtered_tar(source_dir, output_filename, excludes):
    print(f"\\nPackaging {source_dir} -> {output_filename}...")
    
    try:
        with tarfile.open(output_filename, "w") as tar:
            for root, dirs, files in os.walk(source_dir):
                # Filter directories in-place to prevent recursion into unwanted folders
                dirs[:] = [d for d in dirs if d not in excludes and not d.startswith('.')]
                
                for file in files:
                    if file in excludes or file.startswith('.') or file.endswith('.pyc') or file.endswith('.tar'):
                        continue
                        
                    full_path = os.path.join(root, file)
                    # Archive name should be relative to the source Directory, so it unpacks nicely
                    # But CapRover usually wants contents at root of tar?
                    # "On your local machine, select all files INSIDE the folder... and compress"
                    # So we need to strip the source_dir prefix.
                    
                    arcname = os.path.relpath(full_path, source_dir)
                    
                    # Print progress for large files only
                    if os.path.getsize(full_path) > 1024 * 1024:
                       print(f"  Adding large file: {arcname}")
                       
                    tar.add(full_path, arcname=arcname)
                    
        size_mb = os.path.getsize(output_filename) / (1024 * 1024)
        print(f"DONE: Created {output_filename} ({size_mb:.2f} MB)")
        
    except Exception as e:
        print(f"ERROR creating {output_filename}: {e}")

if __name__ == "__main__":
    # Ensure deploy directory exists
    if not os.path.exists("deploy"):
        if not os.path.exists("deploy"): os.makedirs("deploy")

    # Aggressive exclusions for lightweight deployment (Code Only)
    EXCLUDES = {
        "node_modules", "venv", ".venv", ".git", ".idea", ".vscode", 
        "__pycache__", "dist", "build", "coverage", "tmp", "temp",
        "backend.tar", "frontend.tar", "deploy", "mobile", "debug_artifact.bin",
        # Heavy data files
        "sql_app.db", "backend_app.db", "db.sqlite3",
        "assets", "data", "monday_files", "uploads", ".DS_Store"
    }


    # Backend
    if os.path.exists("backend"):
        create_filtered_tar("backend", "deploy/backend.tar", EXCLUDES)
    else:
        print("Backend folder not found!")

    # Frontend (assuming web frontend, OR if they meant mobile code?)
    # Usually "frontend" implies React Web. If they meant mobile, we should ask.
    # But for CapRover, it's usually Web. Let's package 'frontend' folder if exists.
    if os.path.exists("frontend"):
        create_filtered_tar("frontend", "deploy/frontend.tar", EXCLUDES)
    else:
        print("Frontend folder not found!")
