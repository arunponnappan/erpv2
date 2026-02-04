
import tarfile
import os

def create_tar():
    output_filename = "frontend_deploy.tar"
    
    # Files to include (source + config)
    include_paths = [
        "captain-definition",
        "Dockerfile",
        "nginx.conf",
        "package.json",
        "package-lock.json",
        "vite.config.js",
        "index.html",
        "postcss.config.js",
        "tailwind.config.js",
        ".env.production",
        "src",
        "public"
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
