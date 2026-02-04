@echo off
echo ========================================================
echo MOBLIE APP TEST LAUNCHER
echo ========================================================

echo.
echo [1/2] Starting Expo Server in a new window...
echo    - Please SCAN the QR Code that appears in the new window.
start "Expo Server" cmd /k "npx expo start"

echo.
echo [2/2] Backend Connection Reminder
echo    - Ensure your backend is running (localhost:8000).
echo    - If testing on a physical phone, your phone needs to reach the backend.
echo    - RECOMMENDED: Run 'ngrok http 8000' in a separate terminal.
echo.
echo [ON THE MOBILE APP]
echo    - Wait for the app to load.
echo    - Tap the 'Settings' (Gear) Icon on the Login Screen.
echo    - Enter your Backend URL (e.g., https://your-ngrok-url.ngrok-free.app).
echo.
echo Done! You can close this window once you've read the instructions.
pause
