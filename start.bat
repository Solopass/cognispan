@echo off
title CogniSpan - Working Memory Capacity Lab
cd /d "%~dp0"

echo ========================================================
echo   Starting CogniSpan Working Memory Capacity Lab...
echo ========================================================
echo.

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    echo Once installed, double-click start.bat again.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not install
if not exist "node_modules\" (
    echo [1/2] Installing dependencies...
    call npm install
) else (
    echo [1/2] Dependencies already verified.
)

echo.
echo [2/2] Launching Vite development server at http://localhost:3000...
echo (Your default browser will open automatically.)
echo.

:: Launch Vite (Vite will automatically open the browser)
call npm run dev

pause
