import os
import html

# Configuration
PROJECT_ROOT = os.getcwd()
OUTPUT_FILE = "codex.html"
EXCLUDED_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".idea", ".vscode", ".gemini"}

def get_file_structure(root_dir):
    structure = []
    for root, dirs, files in os.walk(root_dir):
        # Filter excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        
        rel_path = os.path.relpath(root, root_dir)
        if rel_path == ".":
            rel_path = ""
            
        structure.append((rel_path, files))
    return structure

def generate_html(structure):
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Project Codex</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f9; color: #333; }
            h1 { color: #2c3e50; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .directory { margin-bottom: 20px; border-left: 4px solid #3498db; padding-left: 15px; }
            .directory h2 { font-size: 1.2em; margin: 0 0 10px 0; color: #34495e; }
            .file-list { list-style: none; padding: 0; }
            .file-list li { padding: 5px 0; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; }
            .file-list li:last-child { border-bottom: none; }
            .file-link { text-decoration: none; color: #2980b9; font-weight: 500; }
            .file-link:hover { text-decoration: underline; color: #3498db; }
            .file-meta { font-size: 0.85em; color: #7f8c8d; margin-left: 10px; }
            .stats { margin-bottom: 20px; padding: 15px; background: #e8f6f3; border-radius: 5px; border: 1px solid #d1f2eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Project Codex</h1>
            <div class="stats">
                <p><strong>Project Root:</strong> """ + html.escape(PROJECT_ROOT) + """</p>
                <p>Generated on: """ + html.escape(os.popen('date /t').read().strip()) + """</p>
            </div>
            
            <div id="file-structure">
    """
    
    for rel_path, files in structure:
        if not files:
            continue
            
        display_path = rel_path if rel_path else "(Root)"
        html_content += f'<div class="directory"><h2>{html.escape(display_path)}</h2><ul class="file-list">'
        
        for file in files:
            full_path = os.path.join(PROJECT_ROOT, rel_path, file) if rel_path else os.path.join(PROJECT_ROOT, file)
            # Use relative path for link to be portable if possible, or file:// protocol
            link_path = os.path.join(rel_path, file).replace("\\\\", "/")
            
            html_content += f'<li><a href="{html.escape(link_path)}" class="file-link" target="_blank">{html.escape(file)}</a></li>'
            
        html_content += '</ul></div>'

    html_content += """
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

if __name__ == "__main__":
    if not os.path.exists("scripts"):
        os.makedirs("scripts")
        
    structure = get_file_structure(PROJECT_ROOT)
    html_out = generate_html(structure)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html_out)
        
    print(f"Codex generated at {os.path.abspath(OUTPUT_FILE)}")
