@echo off
chcp 65001 >nul
title PauseTrader — сервер
cd /d "E:\PauseTrader"

:: Убить старые процессы на 3080
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3080" ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

:: Пересборка если dist пустой
if not exist "dist\index.html" (
  echo Сборка...
  call npm run build
)

echo Запуск PauseTrader на http://localhost:3080
start http://localhost:3080
npx --yes serve dist -l 3080