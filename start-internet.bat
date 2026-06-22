@echo off
chcp 65001 >nul
title PauseTrader — ссылка для интернета
cd /d "E:\PauseTrader"

:: Локальный сервер
netstat -ano | findstr ":3080" | findstr LISTENING >nul
if errorlevel 1 (
  start /min cmd /c "npx --yes serve dist -l 3080"
  timeout /t 3 /nobreak >nul
)

echo.
echo  PauseTrader — создание ссылки для интернета
echo  ==========================================
echo  Не закрывай это окно — пока оно открыто, ссылка работает.
echo.

npx --yes cloudflared tunnel --url http://localhost:3080

pause