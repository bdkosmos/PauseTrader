@echo off
chcp 65001 >nul
title PauseTrader — архив исходников
set OUT=%USERPROFILE%\Desktop\PauseTrader-source.zip
if exist "%OUT%" del "%OUT%"

powershell -NoProfile -Command ^
  "$t = Join-Path $env:TEMP 'PauseTrader-share'; " ^
  "Remove-Item $t -Recurse -Force -ErrorAction SilentlyContinue; " ^
  "robocopy 'E:\PauseTrader' $t /E /XD node_modules dist .git /NFL /NDL /NJH /NJS | Out-Null; " ^
  "Compress-Archive -Path (Join-Path $t '*') -DestinationPath '%OUT%' -Force; " ^
  "Remove-Item $t -Recurse -Force"

echo.
echo Готово: %OUT%
echo Получатель: распаковать, npm install, npm run dev
pause