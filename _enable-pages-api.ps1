$ErrorActionPreference = 'Stop'
Set-Location 'E:\PauseTrader'

$credInput = @"
protocol=https
host=github.com

"@
$cred = $credInput | git credential fill 2>$null
if (-not $cred) { throw 'No git credentials for github.com' }

$username = ($cred | Select-String '^username=(.+)$').Matches.Groups[1].Value
$password = ($cred | Select-String '^password=(.+)$').Matches.Groups[1].Value
if (-not $password) { throw 'No password/token in git credentials' }

$headers = @{
    Authorization = "Bearer $password"
    Accept = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
}

$user = Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $headers
Write-Host "GitHub user: $($user.login)"

$owner = 'bdkosmos'
$repo = 'PauseTrader'

$body = @{
    build_type = 'legacy'
    source = @{
        branch = 'gh-pages'
        path = '/'
    }
} | ConvertTo-Json -Depth 3

$pagesBody = @{ source = @{ branch = 'gh-pages'; path = '/' } } | ConvertTo-Json -Depth 3
try {
    $pages = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pages" -Method Post -Headers $headers -Body $pagesBody -ContentType 'application/json'
    Write-Host 'Pages enabled:'
    $pages | ConvertTo-Json -Depth 5
} catch {
    try {
        $pages = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pages" -Method Put -Headers $headers -Body $body -ContentType 'application/json'
        Write-Host 'Pages updated:'
        $pages | ConvertTo-Json -Depth 5
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $detail = $reader.ReadToEnd()
        Write-Host "Pages API error ($status): $detail"
        throw
    }
}