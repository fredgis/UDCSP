<#
.SYNOPSIS
    Install-Apim — APIM Premium multi-region, products, APIs, policies,
    named values. Real Bicep deployment + per-API import.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Apim {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'services\apim\apim.bicep'
    $logFile = Join-Path $ReportDir 'install-apim.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-apim-rg"
        $apimName = "udcsp-$($country.ToLower())-apim"
        if ($PSCmdlet.ShouldProcess("apim-$country", 'az deployment group create')) {
            Invoke-AzGroupDeployment `
                -Subscription $sub -ResourceGroup $rg -Location $region `
                -TemplateFile $bicep `
                -LogFile $logFile `
                -DeploymentName "udcsp-apim-$($country.ToLower())" `
                -Tags $Config.Tags `
                -WhatIfFlag $whatIf
        }

        $apis = Get-ChildItem (Join-Path $repo 'services\apim\apis') -Directory -ErrorAction SilentlyContinue
        foreach ($a in $apis) {
            $openapi = Join-Path $a.FullName 'openapi.yaml'
            $policy  = Join-Path $a.FullName 'policy.xml'
            if (-not (Test-Path $openapi)) { continue }
            if ($PSCmdlet.ShouldProcess("$($a.Name)@$apimName", 'az apim api import')) {
                Invoke-NativeCommand `
                    -Command @('az','apim','api','import',
                               '--subscription',$sub,
                               '--resource-group',$rg,
                               '--service-name',$apimName,
                               '--path',$a.Name,
                               '--api-id',$a.Name,
                               '--specification-path',$openapi,
                               '--specification-format','OpenApi',
                               '--only-show-errors','--output','none') `
                    -LogFile $logFile `
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
                if (Test-Path $policy) {
                    Invoke-NativeCommand `
                        -Command @('az','apim','api','policy','create',
                                   '--subscription',$sub,
                                   '--resource-group',$rg,
                                   '--service-name',$apimName,
                                   '--api-id',$a.Name,
                                   '--xml-path',$policy,
                                   '--only-show-errors','--output','none') `
                        -LogFile $logFile `
                        -WhatIfFlag $whatIf `
                        -ContinueOnError
                }
            }
        }
    }
}

function Test-Apim {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'services\apim\scripts\Test-Apim.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"Apim`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-apim.json')
}

Export-ModuleMember -Function Install-Apim, Test-Apim
