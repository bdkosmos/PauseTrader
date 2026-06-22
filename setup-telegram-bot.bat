@echo off
chcp 65001 >nul
cd /d "E:\PauseTrader"
powershell -NoProfile -ExecutionPolicy Bypass -File "E:\PauseTrader\setup-telegram-bot.ps1"
pause