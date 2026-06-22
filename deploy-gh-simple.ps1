$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Set-Location "E:\PauseTrader"

Write-Host "`n  Шаг 1: Вход в GitHub (браузер)..." -ForegroundColor Cyan
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Start-Process "https://github.com/login"
    gh auth login -h github.com -p https -w -s repo,workflow
}

Write-Host "  Шаг 2: Создаю репозиторий..." -ForegroundColor Cyan
gh repo view AiKtg/PauseTrader 2>$null
if ($LASTEXITCODE -ne 0) {
    gh repo create PauseTrader --public --description "PauseTrader by Konstantin Andreev" --source=. --remote=origin
} else {
    git remote remove origin 2>$null
    gh repo set-default AiKtg/PauseTrader
    git remote add origin https://github.com/AiKtg/PauseTrader.git
}

Write-Host "  Шаг 3: Сборка и загрузка..." -ForegroundColor Cyan
$env:GITHUB_PAGES = "true"
npm run build --silent 2>$null
git add -A
git commit -m "PauseTrader deploy" 2>$null
git branch -M main
git push -u origin main --force

Write-Host "  Шаг 4: GitHub Pages..." -ForegroundColor Cyan
gh api repos/AiKtg/PauseTrader/pages -X PUT -f build_type=workflow 2>$null

Write-Host "`n  ГОТОВО!" -ForegroundColor Green
Write-Host "  Сайт: https://aiktg.github.io/PauseTrader/" -ForegroundColor Yellow
Write-Host "  Код:  https://github.com/AiKtg/PauseTrader/`n" -ForegroundColor Yellow

Start-Process "https://aiktg.github.io/PauseTrader/"
Start-Process "https://github.com/AiKtg/PauseTrader"