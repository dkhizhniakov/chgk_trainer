#Requires -Version 7
<#
.SYNOPSIS
    Обёртка над Terraform для окружений chgk_trainer.

.EXAMPLE
    ./scripts/infra.ps1 -Env bootstrap -Action apply
    ./scripts/infra.ps1 -Env dev -Action plan
    ./scripts/infra.ps1 -Env dev -Action apply
    ./scripts/infra.ps1 -Env dev -Action env      # только перегенерировать .env.local
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [Alias('Env')]
    [ValidateSet('bootstrap', 'dev')]
    [string]$Environment,

    [ValidateSet('init', 'plan', 'apply', 'destroy', 'output', 'env')]
    [string]$Action = 'plan',

    # Профиль AWS: -Profile / -AwsProfile, иначе $env:AWS_PROFILE, иначе chgk-dev
    [Alias('Profile')]
    [string]$AwsProfile = $(if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { 'chgk-dev' }),

    [string]$Region = 'eu-central-1',

    # Суффикс персонального набора ресурсов: chgk-dev-<suffix>-*
    [string]$NameSuffix = '',

    [switch]$AutoApprove
)

$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$dir = if ($Environment -eq 'bootstrap') {
    Join-Path $root 'infra/bootstrap'
} else {
    Join-Path $root "infra/envs/$Environment"
}

function Invoke-Tf {
    param([Parameter(ValueFromRemainingArguments)][string[]]$TfArgs)
    Write-Host "› terraform $($TfArgs -join ' ')" -ForegroundColor DarkGray
    & terraform "-chdir=$dir" @TfArgs
    if ($LASTEXITCODE -ne 0) { throw "terraform $($TfArgs[0]) завершился с кодом $LASTEXITCODE" }
}

. (Join-Path $PSScriptRoot 'lib/aws.ps1')

function Write-EnvFiles {
    $json = & terraform "-chdir=$dir" output -json
    if ($LASTEXITCODE -ne 0) { throw 'Не удалось прочитать terraform output' }
    $o = $json | ConvertFrom-Json

    $backendDir = Join-Path $root 'backend'
    $frontendDir = Join-Path $root 'frontend'
    New-Item -ItemType Directory -Force -Path $backendDir, $frontendDir | Out-Null

    @(
        '# Сгенерировано scripts/infra.ps1 — не редактировать вручную'
        'APP_ENV=local'
        'HTTP_ADDR=:8080'
        "AWS_PROFILE=$AwsProfile"
        "AWS_REGION=$($o.aws_region.value)"
        "DDB_TABLE_PREFIX=$($o.table_prefix.value)"
        "MEDIA_BUCKET=$($o.media_bucket.value)"
        "COGNITO_USER_POOL_ID=$($o.cognito_user_pool_id.value)"
        "COGNITO_CLIENT_ID=$($o.cognito_client_id.value)"
        'AUTH_DEV_BYPASS=false'
        'LOG_LEVEL=debug'
    ) | Set-Content -Path (Join-Path $backendDir '.env.local') -Encoding utf8

    @(
        '# Сгенерировано scripts/infra.ps1 — не редактировать вручную'
        "VITE_AWS_REGION=$($o.aws_region.value)"
        "VITE_COGNITO_USER_POOL_ID=$($o.cognito_user_pool_id.value)"
        "VITE_COGNITO_CLIENT_ID=$($o.cognito_client_id.value)"
    ) | Set-Content -Path (Join-Path $frontendDir '.env.local') -Encoding utf8

    Write-Host '✔ backend/.env.local и frontend/.env.local обновлены' -ForegroundColor Green
}

try {
    # Ключи профиля экспортируются в env — их подхватывают Terraform (provider + backend) и AWS CLI.
    $account = Enter-AwsSession -AwsProfile $AwsProfile -Region $Region
    Write-Host "AWS account: $account, profile: $AwsProfile, region: $Region, env: $Environment" -ForegroundColor Cyan

    if ($Environment -eq 'bootstrap') {
        Invoke-Tf init -input=false
    } else {
        $stateBucket = "chgk-tfstate-$account"
        Invoke-Tf init -input=false -reconfigure "-backend-config=bucket=$stateBucket" "-backend-config=region=$Region"
    }

    $vars = @("-var=aws_region=$Region")
    if ($Environment -ne 'bootstrap' -and $NameSuffix) { $vars += "-var=name_suffix=$NameSuffix" }
    $approve = if ($AutoApprove) { @('-auto-approve') } else { @() }

    switch ($Action) {
        'init' { }
        'plan' { Invoke-Tf plan -input=false @vars }
        'apply' {
            Invoke-Tf apply -input=false @vars @approve
            if ($Environment -ne 'bootstrap') { Write-EnvFiles }
        }
        'destroy' { Invoke-Tf destroy -input=false @vars @approve }
        'output' { Invoke-Tf output }
        'env' {
            if ($Environment -eq 'bootstrap') { throw 'env доступен только для прикладных окружений' }
            Write-EnvFiles
        }
    }
} finally {
    Exit-AwsSession
}
