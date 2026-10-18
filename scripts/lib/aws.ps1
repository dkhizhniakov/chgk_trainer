# Общие функции для работы с AWS-учётными данными в скриптах.
# Подключение: . (Join-Path $PSScriptRoot 'lib/aws.ps1')

$script:SavedAwsEnv = $null
$script:AwsEnvNames = @(
    'AWS_PROFILE', 'AWS_REGION', 'AWS_DEFAULT_REGION',
    'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN'
)

<#
.SYNOPSIS
    Проверяет доступ к AWS с профилем и экспортирует временные ключи в переменные окружения.
    Работает с любым типом профиля (aws login, SSO, статические ключи, assume role):
    AWS CLI резолвит учётные данные, а Terraform/SDK получают их как обычные env-переменные.
    Возвращает ID аккаунта.
#>
function Enter-AwsSession {
    param(
        [Parameter(Mandatory)][string]$AwsProfile,
        [Parameter(Mandatory)][string]$Region
    )

    $script:SavedAwsEnv = @{}
    foreach ($n in $script:AwsEnvNames) {
        $script:SavedAwsEnv[$n] = [Environment]::GetEnvironmentVariable($n)
    }

    # Сбрасываем возможные старые ключи, чтобы CLI резолвил именно профиль.
    foreach ($n in 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN') {
        Remove-Item "Env:$n" -ErrorAction SilentlyContinue
    }

    $out = & aws configure export-credentials --profile $AwsProfile --format process 2>&1
    if ($LASTEXITCODE -ne 0) {
        $msg = ($out | Out-String).Trim()
        throw @"
Нет доступа к AWS с профилем '$AwsProfile':
$msg

Войдите заново, например:
  aws login --profile $AwsProfile        # вход через консоль AWS
  aws sso login --profile $AwsProfile    # IAM Identity Center
"@
    }

    $creds = ($out | Out-String) | ConvertFrom-Json
    $env:AWS_ACCESS_KEY_ID = $creds.AccessKeyId
    $env:AWS_SECRET_ACCESS_KEY = $creds.SecretAccessKey
    if ($creds.SessionToken) { $env:AWS_SESSION_TOKEN = $creds.SessionToken }
    # Профиль убираем, чтобы SDK не пытался разбирать его конфиг — ключи уже в окружении.
    Remove-Item Env:AWS_PROFILE -ErrorAction SilentlyContinue
    $env:AWS_REGION = $Region
    $env:AWS_DEFAULT_REGION = $Region

    $account = & aws sts get-caller-identity --query Account --output text 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "sts get-caller-identity: $(($account | Out-String).Trim())"
    }

    if ($creds.Expiration) {
        Write-Host "Учётные данные действительны до $($creds.Expiration)" -ForegroundColor DarkGray
    }
    return "$account".Trim()
}

<#
.SYNOPSIS
    Восстанавливает переменные окружения AWS, бывшие до Enter-AwsSession.
#>
function Exit-AwsSession {
    if ($null -eq $script:SavedAwsEnv) { return }
    foreach ($n in $script:AwsEnvNames) {
        $v = $script:SavedAwsEnv[$n]
        if ($null -eq $v) {
            Remove-Item "Env:$n" -ErrorAction SilentlyContinue
        } else {
            Set-Item "Env:$n" $v
        }
    }
    $script:SavedAwsEnv = $null
}
