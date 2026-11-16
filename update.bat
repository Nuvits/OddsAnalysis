@echo off
rem One-off update without opening the page (e.g. for Windows Task Scheduler).
chcp 65001 >nul
cd /d "%~dp0"
if not exist data mkdir data
node server.js --update >> data\update.log 2>&1
