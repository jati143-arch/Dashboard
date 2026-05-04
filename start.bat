@echo off
title Trading Dashboard
color 0A
echo.
echo  ============================================
echo   Trading Dashboard - Starting Up
echo  ============================================
echo.

REM ── Anchor to the folder where this .bat lives ────────────────────────────
cd /d "%~dp0"

REM ── Pull latest code ──────────────────────────────────────────────────────
echo  [0/3] Pulling latest code from GitHub...
git fetch --all
git checkout claude/fix-performance-chart-ksm1z
git pull origin claude/fix-performance-chart-ksm1z
echo.
echo  Current branch:
git branch --show-current
echo.

REM ── Create .env if missing ────────────────────────────────────────────────
if not exist "server\.env" (
    if exist "server\.env.example" (
        copy "server\.env.example" "server\.env" >nul
        echo  [SETUP] server\.env created. Edit it and add your ANTHROPIC_API_KEY.
        echo.
        pause
    )
)

REM ── Install server dependencies ───────────────────────────────────────────
echo  [1/3] Installing server dependencies...
cd server
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo  ERROR: server npm install failed.
    pause
    exit /b 1
)
cd ..

REM ── Install client dependencies and build ─────────────────────────────────
echo  [2/3] Building client...
cd client
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo  ERROR: client npm install failed.
    pause
    exit /b 1
)
call npx vite build
if errorlevel 1 (
    echo  ERROR: Client build failed.
    pause
    exit /b 1
)
cd ..

REM ── Launch ────────────────────────────────────────────────────────────────
echo.
echo  [3/3] Starting server...
echo.
echo  ============================================
echo   Open: http://localhost:3001
echo   Stop: press Ctrl+C
echo  ============================================
echo.
start "" "http://localhost:3001"
cd server
node index.js
