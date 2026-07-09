@echo off
cd /d "%~dp0"
npm run dev -- --hostname 127.0.0.1 --port 3010 > dev-3010.log 2>&1
