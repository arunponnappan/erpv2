
# Create deploy directory if not exists
$deployDir = ".\deploy"
if (!(Test-Path -Path $deployDir)) {
    New-Item -ItemType Directory -Path $deployDir | Out-Null
}

Write-Host "Starting CapRover Artifact Build..." -ForegroundColor Cyan

# Generate Version ID
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
Write-Host "Build Version: $timestamp" -ForegroundColor Magenta

# --- BACKEND ---
Write-Host "Building Backend Tarball..." -ForegroundColor Yellow
$backendExclusions = @(
    "venv", 
    ".venv", 
    "__pycache__", 
    ".git", 
    ".env", 
    ".env.*",
    "assets", 
    "data", 
    "*.db", 
    "*.log", 
    "*.bin", 
    "static/uploads",
    "static/exports",
    "*.pyc"
)

# Convert exclusions to tar --exclude arguments
$backendExcludeArgs = $backendExclusions | ForEach-Object { "--exclude='$_'" }

# Calculate size of included files roughly (optional check)
# Running tar command
# Running tar command
$backendTar = "$deployDir\backend-deploy-$timestamp.tar"
if (Test-Path $backendTar) { Remove-Item $backendTar }

Write-Host "Compressing backend..."
# Note: Windows tar might interpret quotes differently. Using standard exclusions.
tar -cvf $backendTar -C backend `
    --exclude="venv" `
    --exclude=".venv" `
    --exclude="__pycache__" `
    --exclude=".git" `
    --exclude=".env" `
    --exclude="assets" `
    --exclude="data" `
    --exclude="*.db" `
    --exclude="*.log" `
    --exclude="*.bin" `
    --exclude="static/uploads" `
    .

$bSize = (Get-Item $backendTar).Length / 1MB
Write-Host "Backend Tarball Created: $backendTarString ($($bSize.ToString('F2')) MB)" -ForegroundColor Green


# --- FRONTEND ---
Write-Host "`nBuilding Frontend Tarball..." -ForegroundColor Yellow
$frontendTar = "$deployDir\frontend-deploy-$timestamp.tar"
if (Test-Path $frontendTar) { Remove-Item $frontendTar }

Write-Host "Compressing frontend..."
tar -cvf $frontendTar -C frontend `
    --exclude="node_modules" `
    --exclude="dist" `
    --exclude=".git" `
    --exclude=".env" `
    --exclude=".env.*" `
    .

$fSize = (Get-Item $frontendTar).Length / 1MB
Write-Host "Frontend Tarball Created: $frontendTarString ($($fSize.ToString('F2')) MB)" -ForegroundColor Green

Write-Host "`n[SUCCESS] Artifacts Ready in $deployDir" -ForegroundColor Cyan
Write-Host "1. Upload backend-deploy-$timestamp.tar to CapRover (Backend App) -> Deployment -> Method 3: Upload Tarball"
Write-Host "2. Upload frontend-deploy-$timestamp.tar to CapRover (Frontend App) -> Deployment -> Method 3: Upload Tarball"
