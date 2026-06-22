@echo off
chcp 65001 >nul
color 0E
cls
echo.
echo   PauseTrader — включение сайта на GitHub Pages
echo   =============================================
echo.
cd /d "E:\PauseTrader"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_enable-pages-api.ps1"
if errorlevel 1 (
  echo.
  echo   Не удалось автоматически. Открою настройки...
  start https://github.com/bdkosmos/PauseTrader/settings/pages
  pause
  exit /b 1
)
echo.
echo   Готово! Сайт: https://bdkosmos.github.io/PauseTrader/
start https://bdkosmos.github.io/PauseTrader/
pause