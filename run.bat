@echo off
setlocal enabledelayedexpansion
title EHVA CyberLab - Attack & Defense Hub

echo ===================================================
echo           EHVA CyberLab Launcher
echo ===================================================
echo.

:: Detect root directory of the script
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your system PATH.
    echo Please install Node.js from https://nodejs.org/ to run EHVA CyberLab.
    echo.
    pause
    exit /b 1
)

:: Locate dashboard directory
if exist "%SCRIPT_DIR%security-dashboard\dashboard" (
    set "DASHBOARD_DIR=%SCRIPT_DIR%security-dashboard\dashboard"
) else if exist "%SCRIPT_DIR%dashboard" (
    set "DASHBOARD_DIR=%SCRIPT_DIR%dashboard"
) else (
    echo [ERROR] Could not find the dashboard directory.
    pause
    exit /b 1
)

cd /d "%DASHBOARD_DIR%"

:: Check and install dependencies if needed
if not exist "node_modules\" (
    echo [INFO] First-time setup: Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo [INFO] Starting EHVA CyberLab Servers...
echo - Target Lab Service:      http://localhost:3000
echo - Attack/Defense Hub:     http://localhost:8080
echo.

:: Launch browser in background after 2 seconds to allow server boot
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8080'"

:: Run the application
call npm start

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Application exited with code %errorlevel%.
    pause
)
