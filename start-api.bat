@echo off
chcp 65001 >nul
cd /d "E:\PauseTrader\server"
if not exist ".env" (
  echo.
  echo   Создай server\.env из server\.env.example
  echo   Заполни ADMIN_SECRET и Stripe ключи
  echo.
  copy .env.example .env
  notepad .env
  pause
)
if not exist "node_modules\" call npm install
echo.
echo   PauseTrader API → http://localhost:8787
echo.
npm run dev