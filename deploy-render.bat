@echo off
chcp 65001 >nul
cd /d "E:\PauseTrader"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-render.ps1"
pause