#Requires -Version 7
<#
.SYNOPSIS
    Запускает локальное окружение разработки (Go API + Vite React) с подключением к AWS DynamoDB и Cognito.

.EXAMPLE
    ./scripts/dev.ps1
    ./scripts/dev.ps1 -Profile dkweb
#>
[CmdletBinding()]
param(
    [Alias('Profile')]
    [string]$AwsProfile = $(if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { 'chgk-dev' }),

    [string]$Region = 'eu-central-1'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

. (Join-Path $PSScriptRoot 'lib/aws.ps1')

try {
    $account = Enter-AwsSession -AwsProfile $AwsProfile -Region $Region
    Write-Host "✔ AWS сессия активна (аккаунт: $account, профиль: $AwsProfile)" -ForegroundColor Green
} catch {
    Write-Host "⚠ Внимание: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Бэкенд попытается использовать профиль '$AwsProfile' напрямую через AWS SDK." -ForegroundColor DarkGray
    $env:AWS_PROFILE = $AwsProfile
    $env:AWS_REGION = $Region
}

Write-Host "Запуск сервисов..." -ForegroundColor Cyan
Write-Host "  Backend API:  http://localhost:8080" -ForegroundColor DarkGray
Write-Host "  Frontend SPA: http://localhost:5173" -ForegroundColor DarkGray
Write-Host "Нажмите Ctrl+C для остановки обоих серверов.`n" -ForegroundColor DarkGray

$jobs = @()

# 1. Go Backend
$backendScript = {
    param($dir, $envMap)
    foreach ($k in $envMap.Keys) { [Environment]::SetEnvironmentVariable($k, $envMap[$k]) }
    Set-Location $dir
    & go run ./cmd/api
}

$envSnapshot = @{}
foreach ($k in 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE', 'AWS_REGION', 'AWS_DEFAULT_REGION') {
    $v = [Environment]::GetEnvironmentVariable($k)
    if ($v) { $envSnapshot[$k] = $v }
}

$backendJob = Start-Job -ScriptBlock $backendScript -ArgumentList $backendDir, $envSnapshot
$jobs += $backendJob

# 2. Vite Frontend
$frontendScript = {
    param($dir)
    Set-Location $dir
    & npm run dev
}
$frontendJob = Start-Job -ScriptBlock $frontendScript -ArgumentList $frontendDir
$jobs += $frontendJob

try {
    while ($true) {
        foreach ($job in $jobs) {
            $output = Receive-Job -Job $job
            if ($output) {
                $prefix = if ($job.Id -eq $backendJob.Id) { '[backend]' } else { '[frontend]' }
                $color = if ($job.Id -eq $backendJob.Id) { 'Cyan' } else { 'Magenta' }
                foreach ($line in $output) {
                    Write-Host "$prefix $line" -ForegroundColor $color
                }
            }
            if ($job.State -ne 'Running') {
                Write-Host "Процесс $($job.Id) завершился со статусом $($job.State)" -ForegroundColor Red
                break
            }
        }
        Start-Sleep -Milliseconds 300
    }
} finally {
    Write-Host "`nОстановка серверов..." -ForegroundColor Yellow
    $jobs | Stop-Job -ErrorAction SilentlyContinue
    $jobs | Remove-Job -ErrorAction SilentlyContinue
    Exit-AwsSession
    Write-Host "✔ Серверы остановлены" -ForegroundColor Green
}
