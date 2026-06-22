@echo off
chcp 65001 >nul
title PauseTrader — архив сайта
cd /d "E:\PauseTrader"

echo Сборка...
call npm run build

set OUT=%USERPROFILE%\Desktop\PauseTrader-site.zip
if exist "%OUT%" del "%OUT%"

powershell -NoProfile -Command "Compress-Archive -Path 'E:\PauseTrader\dist\*' -DestinationPath '%OUT%' -Force"

echo.
echo Готово: %OUT%
echo Залей на Netlify / Vercel / GitHub Pages — или открой index.html через локальный сервер
pause