import tarfile
import os

def create_tar():
    output_filename = "backend_deploy.tar"
    
    # List of files and directories to include
    include_paths = [
        "Dockerfile",
        "captain-definition",
        "requirements_v2.txt",
        "app",
        "addons",
        "custom_addons",
        "data",
        "static"
    ]
    
    print(f"Creating {output_filename}...")
    
    try:
        with tarfile.open(output_filename, "w") as tar:
            for path in include_paths:
                if os.path.exists(path):
                    print(f"Adding {path}...")
                    tar.add(path, recursive=True)
                else:
                    print(f"Warning: {path} not found, skipping.")
        
        print(f"Successfully created {output_filename}")
        
    except Exception as e:
        print(f"Error creating tarfile: {e}")

if __name__ == "__main__":
    create_tar()
