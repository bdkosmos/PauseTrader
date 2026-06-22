@echo off
chcp 65001 >nul
cd /d "E:\PauseTrader\server"
set MONTHS=%1
if "%MONTHS%"=="" set MONTHS=1
call npm run license -- %MONTHS% manual
pause