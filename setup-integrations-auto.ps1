$ErrorActionPreference = 'Stop'
$ProjectDir = 'E:\PauseTrader'
$RenderServiceId = 'srv-d8spnq3crhuc73abag8g'
$RenderApiKey = $env:RENDER_API_KEY
if (-not $RenderApiKey) {
    $cliYaml = "$env:USERPROFILE\.render\cli.yaml"
    if (Test-Path $cliYaml) {
        $yaml = Get-Content $cliYaml -Raw
        if ($yaml -match 'key:\s+(rnd_\S+)') { $RenderApiKey = $Matches[1] }
    }
}
if (-not $RenderApiKey) { throw 'RENDER_API_KEY not found' }

$StripeExe = Join-Path $ProjectDir 'tools\stripe\stripe.exe'
$TokenFile = Join-Path $ProjectDir 'tools\.telegram-token'
$StripeKeysFile = Join-Path $ProjectDir 'tools\.stripe-keys.json'
$RenderHeaders = @{
    Authorization = "Bearer $RenderApiKey"
    Accept = 'application/json'
    'Content-Type' = 'application/json'
}

function Set-RenderEnvVar([string]$Key, [string]$Value) {
    $body = @{ value = $Value } | ConvertTo-Json
    Invoke-RestMethod `
        -Uri "https://api.render.com/v1/services/$RenderServiceId/env-vars/$Key" `
        -Headers $RenderHeaders -Method Put -Body $body | Out-Null
    Write-Host "  Render: $Key" -ForegroundColor Green
}

function Get-StripeApiKey {
    if (-not (Test-Path $StripeExe)) { return $null }
    $cfgPath = "$env:USERPROFILE\.config\stripe\config.toml"
    if (Test-Path $cfgPath) {
        $toml = Get-Content $cfgPath -Raw
        if ($toml -match 'test_mode_api_key\s*=\s*"([^"]+)"') { return $Matches[1] }
        if ($toml -match 'test_mode_api_key\s*=\s*(\S+)') { return $Matches[1] }
    }
    $cfg = & $StripeExe config --list 2>$null | Out-String
    if ($cfg -match 'test_mode_api_key\s*=\s*(\S+)') { return $Matches[1] }
    return $null
}

function Initialize-Stripe {
    if (-not (Test-Path $StripeExe)) {
        Write-Host 'Stripe CLI missing — skip' -ForegroundColor Yellow
        return $null
    }

    $apiKey = Get-StripeApiKey
    if (-not $apiKey) {
        Write-Host 'Stripe login required — opening browser...' -ForegroundColor Yellow
        Start-Process 'https://dashboard.stripe.com/register'
        $login = & $StripeExe login --interactive 2>&1 | Out-String
        if ($login -match 'browser_url":\s*"([^"]+)"') {
            Start-Process $Matches[1]
        }
        for ($i = 0; $i -lt 36; $i++) {
            Start-Sleep -Seconds 5
            $apiKey = Get-StripeApiKey
            if ($apiKey) { break }
            Write-Host "  waiting Stripe auth... $($i + 1)/36"
        }
    }

    if (-not $apiKey) {
        Write-Host 'Stripe not authorized — license keys + Telegram pay still work' -ForegroundColor Yellow
        return $null
    }

    Write-Host 'Stripe authorized' -ForegroundColor Green
    $env:STRIPE_API_KEY = $apiKey

    $productJson = & $StripeExe products create --name 'PauseTrader Pro' --description 'Pro subscription' 2>$null | Out-String
    $product = $productJson | ConvertFrom-Json
    $priceJson = & $StripeExe prices create `
        --product $product.id `
        --unit-amount 200 `
        --currency usd `
        -d 'recurring[interval]=month' 2>$null | Out-String
    $price = $priceJson | ConvertFrom-Json

    $webhookJson = & $StripeExe webhook_endpoints create `
        --url 'https://pausetrader-api.onrender.com/api/v1/webhooks/stripe' `
        -e checkout.session.completed `
        -e customer.subscription.updated `
        -e customer.subscription.deleted 2>$null | Out-String
    $webhook = $webhookJson | ConvertFrom-Json

    $keys = @{
        STRIPE_SECRET_KEY = $apiKey
        STRIPE_PRICE_ID = $price.id
        STRIPE_WEBHOOK_SECRET = $webhook.secret
    }
    $keys | ConvertTo-Json | Set-Content $StripeKeysFile -Encoding UTF8
    return $keys
}

function Initialize-TelegramBot {
    if (Test-Path $TokenFile) {
        return (Get-Content $TokenFile -Raw).Trim()
    }

    Write-Host 'Creating Telegram bot...' -ForegroundColor Cyan
    $py = Join-Path $ProjectDir 'tools\create-telegram-bot.py'
    if (Test-Path $py) {
        $out = python $py 2>&1 | Out-String
        if ($out -match 'TELEGRAM_BOT_TOKEN=(\S+)') {
            $token = $Matches[1]
            Set-Content $TokenFile $token -NoNewline -Encoding UTF8
            return $token
        }
    }

    Write-Host 'Telegram not logged in — open BotFather' -ForegroundColor Yellow
    Start-Process "$env:APPDATA\Telegram Desktop\Telegram.exe" -ErrorAction SilentlyContinue
    Start-Process 'https://t.me/BotFather?start=newbot'
    Write-Host '  1) /newbot → PauseTrader Alerts Bot → PauseTraderAlertsBot' -ForegroundColor Cyan
    Write-Host '  2) Paste token into:' $TokenFile -ForegroundColor Cyan

    for ($i = 0; $i -lt 6; $i++) {
        Start-Sleep -Seconds 5
        if (Test-Path $TokenFile) {
            return (Get-Content $TokenFile -Raw).Trim()
        }
        Write-Host "  waiting token file... $($i + 1)/6"
    }
    return $null
}

function Get-BotUsername([string]$Token) {
    try {
        $me = Invoke-RestMethod -Uri "https://api.telegram.org/bot$Token/getMe"
        return $me.result.username
    } catch {
        return 'PauseTraderAlertsBot'
    }
}

Write-Host ''
Write-Host 'PauseTrader — auto setup Stripe + Telegram + Render' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan

$stripeKeys = Initialize-Stripe
$botToken = Initialize-TelegramBot
$webhookSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

Write-Host ''
Write-Host 'Updating Render env vars...' -ForegroundColor Cyan

if ($stripeKeys) {
    Set-RenderEnvVar 'STRIPE_SECRET_KEY' $stripeKeys.STRIPE_SECRET_KEY
    Set-RenderEnvVar 'STRIPE_PRICE_ID' $stripeKeys.STRIPE_PRICE_ID
    Set-RenderEnvVar 'STRIPE_WEBHOOK_SECRET' $stripeKeys.STRIPE_WEBHOOK_SECRET
}

if ($botToken) {
    $botUser = Get-BotUsername $botToken
    Set-RenderEnvVar 'TELEGRAM_BOT_TOKEN' $botToken
    Set-RenderEnvVar 'TELEGRAM_BOT_USERNAME' $botUser
    Set-RenderEnvVar 'TELEGRAM_WEBHOOK_SECRET' $webhookSecret

    $localEnv = Join-Path $ProjectDir 'server\.env'
    if (Test-Path $localEnv) {
        $content = Get-Content $localEnv -Raw
        $content = $content -replace 'TELEGRAM_BOT_TOKEN=.*', "TELEGRAM_BOT_TOKEN=$botToken"
        $content = $content -replace 'TELEGRAM_BOT_USERNAME=.*', "TELEGRAM_BOT_USERNAME=$botUser"
        Set-Content $localEnv $content.TrimEnd() -NoNewline
    }
}

Set-RenderEnvVar 'NTFY_BASE_URL' 'https://ntfy.sh'

Write-Host ''
Write-Host 'Triggering Render redeploy...' -ForegroundColor Cyan
$deployBody = @{ clearCache = 'do_not_clear' } | ConvertTo-Json
Invoke-RestMethod `
    -Uri "https://api.render.com/v1/services/$RenderServiceId/deploys" `
    -Headers $RenderHeaders -Method Post -Body $deployBody | Out-Null

$health = Invoke-RestMethod -Uri 'https://pausetrader-api.onrender.com/api/v1/health'
Write-Host ''
Write-Host "Health: ok=$($health.ok) stripe=$($health.stripe) telegram=$($health.telegram) ntfy=$($health.ntfy)" -ForegroundColor Green
Write-Host 'Done.' -ForegroundColor Green