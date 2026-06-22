@echo off
chcp 65001 >nul
title PauseTrader — одна кнопка
color 0A
cls
echo.
echo   ╔══════════════════════════════════════════════════════╗
echo   ║              PauseTrader — публикация                  ║
echo   ╠══════════════════════════════════════════════════════╣
echo   ║                                                      ║
echo   ║   Сейчас откроется браузер GitHub.                   ║
echo   ║                                                      ║
echo   ║   Нажми только:  Authorize  (Разрешить)              ║
echo   ║                                                      ║
echo   ║   Больше ничего вводить не нужно.                    ║
echo   ║                                                      ║
echo   ╚══════════════════════════════════════════════════════╝
echo.
pause
cd /d "E:\PauseTrader"
powershell -NoProfile -ExecutionPolicy Bypass -File "E:\PauseTrader\deploy-gh-simple.ps1"
pause