@echo off
title Trading Dashboard
color 0A
echo.
echo  ============================================
echo   Trading Dashboard - Starting Up
echo  ============================================
echo.

cd /d "%~dp0"

REM ── Pull latest code ──────────────────────────────────────────────────────
echo  [0/3] Pulling latest code...
git fetch --all
git checkout main
git pull origin main
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
    )
)

REM ── Create data folder so the DB can be created ───────────────────────────
if not exist "server\data" mkdir "server\data"

REM ── Install server dependencies ───────────────────────────────────────────
echo  [1/3] Installing server dependencies...
cd server
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo.
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
    echo.
    echo  ERROR: client npm install failed.
    pause
    exit /b 1
)
call npx vite build
if errorlevel 1 (
    echo.
    echo  ERROR: Client build failed. See errors above.
    pause
    exit /b 1
)
cd ..

REM ── Launch ────────────────────────────────────────────────────────────────
echo.
echo  [3/3] Starting server...
echo.
echo  ============================================
echo   Open : http://localhost:3001
echo   Stop : press Ctrl+C in this window
echo  ============================================
echo.
start "" "http://localhost:3001"
cd server
node index.js

REM ── If node exits for any reason, keep window open to show the error ──────
echo.
echo  Server stopped. See error above if unexpected.
pause
