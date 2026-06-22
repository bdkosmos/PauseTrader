@echo off
chcp 65001 >nul
title PauseTrader — залить на GitHub
cd /d "E:\PauseTrader"

echo.
echo  PauseTrader — публикация на GitHub
echo  ==================================
echo.
echo  ШАГ 1: Создай пустой репозиторий (если ещё нет)
echo    Откроется: github.com/new
echo    Имя: PauseTrader
echo    Public, БЕЗ README и .gitignore
echo.
start https://github.com/new?description=PauseTrader+by+Konstantin+Andreev&visibility=public

echo  Нажми Enter когда репозиторий создан на GitHub...
pause >nul

echo.
echo  ШАГ 2: Загрузка кода (откроется вход GitHub в браузере)...
echo.

git remote remove origin 2>nul
git remote add origin https://github.com/AiKtg/PauseTrader.git
git branch -M main
git push -u origin main

if errorlevel 1 (
  echo.
  echo Ошибка push. Проверь:
  echo   - репозиторий AiKtg/PauseTrader существует
  echo   - ты залогинен как AiKtg
  pause
  exit /b 1
)

echo.
echo  OK! Код залит.
echo  Репозиторий: https://github.com/AiKtg/PauseTrader
echo.
echo  ШАГ 3: Включи GitHub Pages
echo    Settings -^> Pages -^> Build and deployment: GitHub Actions
echo.
start https://github.com/AiKtg/PauseTrader/settings/pages
start https://github.com/AiKtg/PauseTrader/actions

echo  Сайт через 1-2 мин: https://aiktg.github.io/PauseTrader/
echo.
pause