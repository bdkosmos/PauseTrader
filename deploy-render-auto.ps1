$ErrorActionPreference = 'Stop'
$RenderExe = 'E:\PauseTrader\tools\render\cli_v2.20.0.exe'
$ConfigPath = "$env:USERPROFILE\.render\cli.yaml"

function Test-RenderAuth {
    if (-not (Test-Path $ConfigPath)) { return $false }
    $yaml = Get-Content $ConfigPath -Raw
    return $yaml -match 'workspace:\s+\S+' -and $yaml -notmatch 'workspace:\s+""'
}

if (-not (Test-RenderAuth)) {
    Write-Host ''
    Write-Host 'Render login required - authorize in browser' -ForegroundColor Yellow
    Start-Process $RenderExe -ArgumentList 'login' -NoNewWindow -Wait
}

if (-not (Test-RenderAuth)) {
    Write-Host 'Login failed. Opening one-click deploy...' -ForegroundColor Red
    Start-Process 'https://render.com/deploy?repo=https://github.com/bdkosmos/PauseTrader'
    exit 1
}

Write-Host 'Render auth OK' -ForegroundColor Green

$servicesJson = & $RenderExe services list -o json --confirm
$services = $servicesJson | ConvertFrom-Json
$existing = $services | Where-Object { $_.service.name -eq 'pausetrader-api' } | Select-Object -First 1

if ($existing) {
    $id = $existing.service.id
    Write-Host "Deploying service $id..." -ForegroundColor Cyan
    & $RenderExe deploys create $id --confirm --wait -o text
} else {
    Write-Host 'Creating pausetrader-api...' -ForegroundColor Cyan
    & $RenderExe services create `
        --name pausetrader-api `
        --type web_service `
        --runtime node `
        --plan free `
        --repo https://github.com/bdkosmos/PauseTrader `
        --branch main `
        --root-directory server `
        --build-command 'npm install' `
        --start-command 'npm start' `
        --health-check-path '/api/v1/health' `
        --env-var 'APP_URL=https://bdkosmos.github.io/PauseTrader' `
        --env-var 'TELEGRAM_BOT_USERNAME=AiKtg' `
        --confirm -o json
}

Write-Host ''
Write-Host 'API: https://pausetrader-api.onrender.com/api/v1/health' -ForegroundColor Green