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

REM ── Pull latest code from the correct branch ──────────────────────────────
echo  [0/3] Fetching latest code...
git fetch origin >nul 2>&1
git checkout claude/fix-performance-chart-ksm1z >nul 2>&1
git pull origin claude/fix-performance-chart-ksm1z >nul 2>&1
echo  Done - running on branch: claude/fix-performance-chart-ksm1z
echo.

REM ── Create .env from example if it does not exist ─────────────────────────
if not exist "server\.env" (
    if exist "server\.env.example" (
        copy "server\.env.example" "server\.env" >nul
        echo  [SETUP] server\.env created from .env.example
        echo.
        echo  !! ACTION REQUIRED !!
        echo  Open  server\.env  and replace the placeholder with your
        echo  real ANTHROPIC_API_KEY before using AI features.
        echo.
        pause
    )
)

REM ── Install server dependencies ───────────────────────────────────────────
echo  [1/3] Installing server dependencies...
cd server
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo  ERROR: npm install failed for server. Check your Node.js installation.
    pause
    exit /b 1
)
cd ..

REM ── Install client dependencies and build ─────────────────────────────────
echo  [2/3] Installing client dependencies and building...
cd client
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo  ERROR: npm install failed for client.
    pause
    exit /b 1
)
call npx vite build
if errorlevel 1 (
    echo  ERROR: Client build failed. Check the output above for details.
    pause
    exit /b 1
)
cd ..

REM ── Start server and open browser ─────────────────────────────────────────
echo  [3/3] Starting server...
echo.
echo  ============================================
echo   Dashboard running at http://localhost:3001
echo   Press Ctrl+C to stop the server
echo  ============================================
echo.
start "" "http://localhost:3001"

cd server
node index.js
