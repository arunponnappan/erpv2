@echo off
echo Stopping existing processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul

echo.
echo Starting Backend (FastAPI)...
cd backend
start "Backend" cmd /k "..\venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
cd ..

echo.
echo Starting Frontend (Vite)...
cd frontend
start "Frontend" cmd /k "npm run dev"
cd ..

echo.
echo Starting Mobile App (Expo)...
cd mobile
start "Mobile App" cmd /k "npx expo start --host lan --clear"
cd ..

echo.
echo Restart initiated. Check the new windows for status.
pause
