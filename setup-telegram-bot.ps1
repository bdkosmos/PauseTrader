$ErrorActionPreference = 'Stop'
$RenderServiceId = 'srv-d8spnq3crhuc73abag8g'
$RenderApiKey = $env:RENDER_API_KEY
if (-not $RenderApiKey) {
    $yaml = Get-Content "$env:USERPROFILE\.render\cli.yaml" -Raw
    if ($yaml -match 'key:\s+(rnd_\S+)') { $RenderApiKey = $Matches[1] }
}
if (-not $RenderApiKey) { throw 'RENDER_API_KEY not found' }

$TokenFile = 'E:\PauseTrader\tools\.telegram-token'
$headers = @{
    Authorization = "Bearer $RenderApiKey"
    Accept = 'application/json'
    'Content-Type' = 'application/json'
}

Write-Host ''
Write-Host 'PauseTrader — настройка Telegram-бота для Stars' -ForegroundColor Cyan
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '1) Откроется BotFather' -ForegroundColor Yellow
Write-Host '2) Напиши: /newbot' -ForegroundColor Yellow
Write-Host '3) Имя: PauseTrader Pro' -ForegroundColor Yellow
Write-Host '4) Username: PauseTraderProBot (или любой свободный ...Bot)' -ForegroundColor Yellow
Write-Host '5) Скопируй токен (123456789:ABC...)' -ForegroundColor Yellow
Write-Host ''

Start-Process 'https://t.me/BotFather?start=newbot'

$token = $null
if (Test-Path $TokenFile) {
    $token = (Get-Content $TokenFile -Raw).Trim()
    Write-Host "Найден токен в $TokenFile" -ForegroundColor Green
}

if (-not $token) {
    $token = Read-Host 'Вставь TELEGRAM_BOT_TOKEN и Enter'
    $token = $token.Trim()
}

if (-not $token -or $token -notmatch '^\d+:.+') {
    throw 'Неверный формат токена'
}

Set-Content $TokenFile $token -NoNewline -Encoding UTF8

$me = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe"
$username = $me.result.username
Write-Host "Бот: @$username" -ForegroundColor Green

function Set-RenderEnv([string]$Key, [string]$Value) {
    $body = @{ value = $Value } | ConvertTo-Json
    Invoke-RestMethod `
        -Uri "https://api.render.com/v1/services/$RenderServiceId/env-vars/$Key" `
        -Headers $headers -Method Put -Body $body | Out-Null
    Write-Host "  Render: $Key" -ForegroundColor Green
}

Set-RenderEnv 'TELEGRAM_BOT_TOKEN' $token
Set-RenderEnv 'TELEGRAM_BOT_USERNAME' $username
Set-RenderEnv 'TELEGRAM_STARS_PRICE' '150'

Invoke-RestMethod `
    -Uri "https://api.render.com/v1/services/$RenderServiceId/deploys" `
    -Headers $headers -Method Post `
    -Body (@{ clearCache = 'do_not_clear' } | ConvertTo-Json) | Out-Null

$localEnv = 'E:\PauseTrader\server\.env'
if (Test-Path $localEnv) {
    $content = Get-Content $localEnv -Raw
    $content = $content -replace 'TELEGRAM_BOT_TOKEN=.*', "TELEGRAM_BOT_TOKEN=$token"
    $content = $content -replace 'TELEGRAM_BOT_USERNAME=.*', "TELEGRAM_BOT_USERNAME=$username"
    Set-Content $localEnv $content.TrimEnd() -NoNewline
}

Write-Host ''
Write-Host 'Готово! Через 1-2 мин: Free · Pro → Оплатить звёздами' -ForegroundColor Green
Write-Host "Бот: https://t.me/$username" -ForegroundColor Cyan