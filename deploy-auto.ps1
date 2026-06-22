# PauseTrader — полный автодеплой на GitHub Pages
# Нужен один раз: Personal Access Token с правом repo

$ErrorActionPreference = "Stop"
$RepoOwner = "AiKtg"
$RepoName = "PauseTrader"
$ProjectDir = "E:\PauseTrader"
$TokenFile = Join-Path $ProjectDir ".github-token"

Set-Location $ProjectDir

function Get-Token {
    if ($env:GH_TOKEN) { return $env:GH_TOKEN }
    if ($env:GITHUB_TOKEN) { return $env:GITHUB_TOKEN }
    if (Test-Path $TokenFile) { return (Get-Content $TokenFile -Raw).Trim() }
    return $null
}

$token = Get-Token

if (-not $token) {
    Write-Host ""
    Write-Host "  PauseTrader — автодеплой на GitHub" -ForegroundColor Cyan
    Write-Host "  ==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Откроется страница создания токена GitHub."
    Write-Host "  Права: repo (все) + workflow"
    Write-Host ""
    Start-Process "https://github.com/settings/tokens/new?description=PauseTrader&scopes=repo,workflow"
    Start-Sleep 2
    $token = Read-Host "  Вставь токен (ghp_...) и Enter"
    $token = $token.Trim()
    if (-not $token) { Write-Host "Токен не введён." -ForegroundColor Red; pause; exit 1 }
    Set-Content -Path $TokenFile -Value $token -NoNewline -Encoding UTF8
    Write-Host "  Токен сохранён в .github-token (не попадёт в git)" -ForegroundColor Green
}

$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# Проверка токена
try {
    $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
    Write-Host "  GitHub: $($user.login)" -ForegroundColor Green
} catch {
    Write-Host "  Токен неверный или истёк. Удали .github-token и запусти снова." -ForegroundColor Red
    Remove-Item $TokenFile -Force -ErrorAction SilentlyContinue
    pause; exit 1
}

# Создать репозиторий если нет
$repoUrl = "https://api.github.com/repos/$RepoOwner/$RepoName"
$exists = $true
try {
    Invoke-RestMethod -Uri $repoUrl -Headers $headers | Out-Null
    Write-Host "  Репозиторий уже есть" -ForegroundColor Yellow
} catch {
    $exists = $false
}

if (-not $exists) {
    Write-Host "  Создаю $RepoOwner/$RepoName..." -ForegroundColor Cyan
    $body = @{
        name = $RepoName
        description = "PauseTrader — TradingView style crypto charts. Konstantin Andreev. Telegram @AiKtg"
        private = $false
        auto_init = $false
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json" | Out-Null
    Write-Host "  Репозиторий создан" -ForegroundColor Green
}

# Сборка
Write-Host "  Сборка..." -ForegroundColor Cyan
$env:GITHUB_PAGES = "true"
npm run build --silent

# Git push
git remote remove origin 2>$null
$pushUrl = "https://x-access-token:${token}@github.com/${RepoOwner}/${RepoName}.git"
git remote add origin $pushUrl
git branch -M main
git add -A
git commit -m "PauseTrader deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>$null
git push -u origin main --force
Write-Host "  Код залит" -ForegroundColor Green

# Включить GitHub Pages (workflow)
try {
    $pagesBody = @{ build_type = "workflow"; source = @{ branch = "main"; path = "/" } } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/pages" -Method Put -Headers $headers -Body $pagesBody -ContentType "application/json" | Out-Null
    Write-Host "  GitHub Pages включён" -ForegroundColor Green
} catch {
    Write-Host "  Pages: включи вручную Settings -> Pages -> GitHub Actions" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  ГОТОВО!" -ForegroundColor Green
Write-Host "  Репозиторий: https://github.com/$RepoOwner/$RepoName"
Write-Host "  Сайт (1-2 мин): https://${RepoOwner}.github.io/$RepoName/"
Write-Host ""

Start-Process "https://github.com/$RepoOwner/$RepoName/actions"
Start-Process "https://${RepoOwner}.github.io/$RepoName/"

pause