@echo off
title Silent Studios - Local Server
cd /d "%~dp0"

echo.
echo  ========================================
echo   Silent Studios - Local Development
echo  ========================================
echo.
echo  Starting server in this folder:
echo  %CD%
echo.

set PORT=5500

:: Try Python 3 (most common)
where py >nul 2>nul
if %errorlevel%==0 (
  echo  Using Python...
  echo  Open in browser: http://localhost:%PORT%
  echo  Press Ctrl+C to stop the server.
  echo.
  start "" "http://localhost:%PORT%"
  py -m http.server %PORT%
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo  Using Python...
  echo  Open in browser: http://localhost:%PORT%
  echo  Press Ctrl+C to stop the server.
  echo.
  start "" "http://localhost:%PORT%"
  python -m http.server %PORT%
  goto :end
)

:: Try Node.js npx serve
where npx >nul 2>nul
if %errorlevel%==0 (
  echo  Using Node.js (npx serve)...
  echo  Open in browser: http://localhost:%PORT%
  echo  Press Ctrl+C to stop the server.
  echo.
  start "" "http://localhost:%PORT%"
  npx --yes serve -l %PORT%
  goto :end
)

echo  ERROR: Could not find Python or Node.js.
echo.
echo  Install one of these, then run this file again:
echo    - Python: https://www.python.org/downloads/
echo    - Node.js: https://nodejs.org/
echo.
pause

:end
