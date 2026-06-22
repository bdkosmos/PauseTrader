@echo off
chcp 65001 >nul
color 0E
cls
echo.
echo   ╔════════════════════════════════════════════════════╗
echo   ║  PauseTrader — включить сайт (1 настройка)         ║
echo   ╚════════════════════════════════════════════════════╝
echo.
echo   Откроется Settings -^> Pages
echo.
echo   Выбери:
echo     Source:  Deploy from a branch
echo     Branch:  gh-pages
echo     Folder:  / (root)
echo.
echo   Нажми Save
echo.
start https://github.com/bdkosmos/PauseTrader/settings/pages
echo.
echo   Когда сохранил — нажми Enter (перезапущу деплой)...
pause >nul

cd /d "E:\PauseTrader"
git add -A
git commit -m "fix: gh-pages deploy" 2>nul
git push origin main

echo.
echo   Подожди 1-2 минуты, затем открой:
echo   https://bdkosmos.github.io/PauseTrader/
echo.
start https://github.com/bdkosmos/PauseTrader/actions
timeout /t 90 /nobreak >nul
start https://bdkosmos.github.io/PauseTrader/
pause