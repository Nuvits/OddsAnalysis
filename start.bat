@echo off
rem Starts the local server, updates the data and opens the page in the browser.
chcp 65001 >nul
title Odds Memory
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js not found. Install it from https://nodejs.org & pause & exit /b 1)
node server.js --open
echo.
echo The server has stopped. Any error message is shown above.
pause
