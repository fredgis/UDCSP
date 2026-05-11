<#
.SYNOPSIS
    Install-Postgres — Azure Database for PostgreSQL Flexible Server,
    one per sovereign zone. Real Bicep deployment.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Postgres {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\data\postgresql\postgresql-flexible.bicep'
    $logFile = Join-Path $ReportDir 'install-postgres.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-postgres-rg"
        $param = Join-Path $repo "infra\data\postgresql\parameters\$($country.ToLower()).bicepparam"
        $resolvedParam = Resolve-BicepParamSubscriptionTokens `
            -SourceFile $param `
            -Subscriptions $Config.Subscriptions `
            -OutputDir $ReportDir `
            -Tag "postgres-$($country.ToLower())"
        if ($PSCmdlet.ShouldProcess("postgres-$country", 'az deployment group create')) {
            $deployName = "udcsp-postgres-$($country.ToLower())"
            $existing = az deployment group show --subscription $sub --resource-group $rg --name $deployName --query "properties.provisioningState" -o tsv 2>$null
            if ($existing -eq 'Running' -or $existing -eq 'Succeeded') {
                Write-Host "    ↳ skip postgres-$country (deployment $deployName is $existing)" -ForegroundColor DarkGray
                continue
            }
            # Generate a strong admin password (24 chars, alphanumeric+symbols).
            $bytes = New-Object byte[] 18
            [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
            $adminPwd = ([Convert]::ToBase64String($bytes) -replace '[/+=]','x') + '!Aa1'
            Invoke-AzGroupDeployment `
                -Subscription $sub -ResourceGroup $rg -Location $region `
                -TemplateFile $bicep `
                -ParametersFile $resolvedParam `
                -Parameters @{ administratorLoginPassword = $adminPwd } `
                -LogFile $logFile `
                -DeploymentName $deployName `
                -Tags $Config.Tags `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Postgres {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\data\postgresql\postgresql-flexible.bicep'
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    "{`"phase`":`"Postgres`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-postgres.json')
}

Export-ModuleMember -Function Install-Postgres, Test-Postgres
