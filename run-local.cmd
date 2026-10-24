@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH. Install Node.js 20.19 or later, then try again.
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd was not found on PATH. Repair the Node.js installation, then try again.
  exit /b 1
)

if not exist ".env" (
  echo .env is missing. Copy .env.example to .env and configure the required local values.
  echo See the Local setup section in README.md. This script will not create or overwrite .env.
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencies are missing. Run npm.cmd install from this folder, then try again.
  exit /b 1
)

echo Starting the local development server. Press Ctrl+C to stop it.
npm.cmd run dev
exit /b %errorlevel%
