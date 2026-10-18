#Requires -Version 7
<#
.SYNOPSIS
    Создаёт (или обновляет) пользователя в Cognito dev-пула с постоянным паролем и группами.

.EXAMPLE
    ./scripts/dev-user.ps1 -Email me@example.com -Groups admin,editor
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Email,

    [string[]]$Groups = @(),

    [SecureString]$Password,

    [Alias('Env')]
    [ValidateSet('dev')]
    [string]$Environment = 'dev',

    # Профиль AWS: -Profile / -AwsProfile, иначе $env:AWS_PROFILE, иначе chgk-dev
    [Alias('Profile')]
    [string]$AwsProfile = $(if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { 'chgk-dev' }),

    [string]$Region = 'eu-central-1'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $root "infra/envs/$Environment"

. (Join-Path $PSScriptRoot 'lib/aws.ps1')

try {
# terraform output читает state из S3 — учётные данные нужны и ему.
$null = Enter-AwsSession -AwsProfile $AwsProfile -Region $Region

$poolId = "$(& terraform "-chdir=$dir" output -raw cognito_user_pool_id)".Trim()
if ($LASTEXITCODE -ne 0 -or -not $poolId) {
    throw "Не найден cognito_user_pool_id. Сначала: ./scripts/infra.ps1 -Env $Environment -Action apply"
}

if (-not $Password) {
    $Password = Read-Host -AsSecureString "Пароль для $Email (мин. 8 символов, строчные буквы и цифры)"
}
$plain = ConvertFrom-SecureString -SecureString $Password -AsPlainText

Write-Host "User pool: $poolId" -ForegroundColor Cyan

$out = & aws cognito-idp admin-create-user `
    --user-pool-id $poolId `
    --username $Email `
    --user-attributes "Name=email,Value=$Email" "Name=email_verified,Value=true" `
    --message-action SUPPRESS 2>&1
if ($LASTEXITCODE -ne 0) {
    if ("$out" -match 'UsernameExistsException') {
        Write-Host 'Пользователь уже существует — обновляю пароль и группы' -ForegroundColor Yellow
    } else {
        throw "admin-create-user: $out"
    }
}

& aws cognito-idp admin-set-user-password --user-pool-id $poolId --username $Email --password $plain --permanent
if ($LASTEXITCODE -ne 0) { throw 'admin-set-user-password завершился с ошибкой' }

foreach ($g in $Groups) {
    & aws cognito-idp admin-add-user-to-group --user-pool-id $poolId --username $Email --group-name $g
    if ($LASTEXITCODE -ne 0) { throw "Не удалось добавить в группу $g" }
    Write-Host "  + группа $g"
}

Write-Host "✔ Пользователь $Email готов" -ForegroundColor Green
} finally {
    Exit-AwsSession
}
