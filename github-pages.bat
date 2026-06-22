@echo off
chcp 65001 >nul
color 0B
cls
echo.
echo   ╔════════════════════════════════════════════════════════╗
echo   ║     PauseTrader — выкладка на GitHub (3 шага)           ║
echo   ╚════════════════════════════════════════════════════════╝
echo.
echo   ШАГ 1 из 3 — Создать репозиторий
echo   ---------------------------------
echo   Сейчас откроется github.com/new
echo.
echo   • Repository name:  PauseTrader
echo   • Public
echo   • НЕ ставь галочки README / gitignore
echo   • Нажми: Create repository
echo.
start https://github.com/login
timeout /t 2 /nobreak >nul
start https://github.com/new
echo.
echo   Когда создал репозиторий — нажми Enter здесь...
pause >nul

echo.
echo   ШАГ 2 из 3 — Загрузка кода
echo   ---------------------------------
echo   Сейчас откроется окно входа GitHub — войди как bdkosmos
echo.
cd /d "E:\PauseTrader"

set GITHUB_PAGES=true
call npm run build >nul 2>&1

git add -A
git commit -m "PauseTrader site" 2>nul
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/bdkosmos/PauseTrader.git
git push -u origin main --force

if errorlevel 1 (
  echo.
  echo   ОШИБКА загрузки. Проверь:
  echo   • Репозиторий PauseTrader создан на github.com/bdkosmos
  echo   • Ты вошёл как bdkosmos
  pause
  exit /b 1
)

echo.
echo   OK! Код залит.
echo.
echo   ШАГ 3 из 3 — Включить сайт
echo   ---------------------------------
echo   На открывшейся странице:
echo   • Build and deployment → Source: GitHub Actions
echo.
start https://github.com/bdkosmos/PauseTrader/settings/pages
start https://github.com/bdkosmos/PauseTrader/actions

echo.
echo   Через 2 минуты сайт будет:
echo   https://bdkosmos.github.io/PauseTrader/
echo.
echo   Пока ждёшь — локально: PauseTrader.bat
echo.
pause