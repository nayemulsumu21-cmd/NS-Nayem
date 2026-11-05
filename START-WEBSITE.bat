@echo off
title NAYEMUL ISLAM - 3D Portfolio Website Server
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ========================================================
echo   Starting NAYEMUL ISLAM 3D Portfolio Website...
echo   Browser will open automatically at:
echo   http://localhost:5173/
echo ========================================================
start "" "http://localhost:5173/"
"C:\Program Files\nodejs\npm.cmd" run dev
pause
