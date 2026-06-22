@echo off
chcp 65001 >nul
cd /d "E:\PauseTrader"
powershell -NoProfile -ExecutionPolicy Bypass -File "E:\PauseTrader\setup-integrations-auto.ps1"
pause