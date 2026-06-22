@echo off
chcp 65001 >nul
title PauseTrader — публикация на GitHub
cd /d "E:\PauseTrader"

where gh >nul 2>&1
if errorlevel 1 (
  echo Установи GitHub CLI: winget install GitHub.cli
  pause
  exit /b 1
)

gh auth status >nul 2>&1
if errorlevel 1 (
  echo.
  echo Войди в GitHub (откроется браузер)...
  gh auth login -h github.com -p https -w -s repo,workflow,write:packages
  if errorlevel 1 pause & exit /b 1
)

git init 2>nul
git branch -M main 2>nul
git add .
git commit -m "PauseTrader — Константин Андреев" 2>nul
if errorlevel 1 git commit --allow-empty -m "PauseTrader deploy"

gh repo view AiKtg/PauseTrader >nul 2>&1
if errorlevel 1 (
  echo Создаю репозиторий AiKtg/PauseTrader...
  gh repo create PauseTrader --public --description "PauseTrader — TradingView style crypto charts by Konstantin Andreev" --source=. --remote=origin --push
) else (
  echo Пушу в AiKtg/PauseTrader...
  git remote remove origin 2>nul
  git remote add origin https://github.com/AiKtg/PauseTrader.git
  git push -u origin main --force
)

echo.
echo Включи GitHub Pages:
echo   Settings -^> Pages -^> Source: GitHub Actions
echo.
echo Сайт будет: https://aiktg.github.io/PauseTrader/
echo.
pause