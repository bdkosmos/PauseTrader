$ErrorActionPreference = 'Stop'
$ProjectDir = 'E:\PauseTrader'
$RenderDir = Join-Path $ProjectDir 'tools\render'
$RenderExe = Join-Path $RenderDir 'cli_v2.20.0.exe'

function Install-RenderCli {
    if (Test-Path $RenderExe) { return }
    Write-Host '  Устанавливаю Render CLI...' -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path $RenderDir | Out-Null
    $zip = Join-Path $env:TEMP 'render-cli.zip'
    Invoke-WebRequest -Uri 'https://github.com/render-oss/cli/releases/download/v2.20.0/cli_2.20.0_windows_amd64.zip' -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $RenderDir -Force
    Remove-Item $zip -Force
}

Set-Location $ProjectDir
Install-RenderCli

if (-not $env:RENDER_API_KEY) {
    Write-Host ''
    Write-Host '  Нужна авторизация Render (один раз)' -ForegroundColor Yellow
    Write-Host '  Откроется браузер — нажми Authorize CLI' -ForegroundColor Yellow
    Write-Host ''
    & $RenderExe login
}

Write-Host ''
Write-Host '  Проверяю render.yaml...' -ForegroundColor Cyan
& $RenderExe blueprints validate render.yaml

Write-Host ''
Write-Host '  Создаю/обновляю сервис pausetrader-api...' -ForegroundColor Cyan

$exists = & $RenderExe services list -o json --confirm 2>$null | ConvertFrom-Json
$service = $exists | Where-Object { $_.service.name -eq 'pausetrader-api' -or $_.name -eq 'pausetrader-api' } | Select-Object -First 1

if (-not $service) {
    & $RenderExe services create `
        --name pausetrader-api `
        --type web_service `
        --runtime node `
        --plan free `
        --repo https://github.com/bdkosmos/PauseTrader `
        --branch main `
        --root-dir server `
        --build-command 'npm install' `
        --start-command 'npm start' `
        --confirm -o json
} else {
    Write-Host '  Сервис уже существует, запускаю деплой...' -ForegroundColor Green
    $id = if ($service.service) { $service.service.id } else { $service.id }
    & $RenderExe deploys create $id --confirm --wait -o text
}

Write-Host ''
Write-Host '  API: https://pausetrader-api.onrender.com' -ForegroundColor Green
Write-Host '  Health: https://pausetrader-api.onrender.com/api/v1/health' -ForegroundColor Green
Write-Host ''
Write-Host '  Добавь в GitHub → Settings → Actions → Variables:' -ForegroundColor Yellow
Write-Host '  VITE_API_URL = https://pausetrader-api.onrender.com' -ForegroundColor Yellow
Write-Host ''