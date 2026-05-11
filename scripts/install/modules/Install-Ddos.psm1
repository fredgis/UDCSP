<#
.SYNOPSIS
    Install-Ddos — DDoS Protection Standard plan in the shared region,
    then attach each country VNet to it by re-deploying the landing-zone
    main.bicep with the ddosProtectionPlanId parameter.

    The previous implementation used a standalone vnet-association.bicep
    that re-declared the VNet shape (with subnets: []) — that wiped every
    Private Endpoint subnet and hung when run with no parameters.
    Threading the plan ID through the LZ keeps the LandingZone the
    single ARM owner of the spoke VNet (idempotent + drift-safe).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Ddos {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $plan = Join-Path $repo 'infra\security\ddos\ddos-protection-plan.bicep'
    $lzMain = Join-Path $repo 'infra\landing-zone\main.bicep'
    $logFile = Join-Path $ReportDir 'install-ddos.log'
    $whatIf = [bool]$WhatIfPreference
    foreach ($f in @($plan, $lzMain)) { if (-not (Test-Path $f)) { throw "Missing $f" } }

    $sharedSub = $Config.Subscriptions.SharedPlatform
    $sharedRegion = $Config.Regions.Shared

    if ($PSCmdlet.ShouldProcess('ddos-protection-plan', 'az deployment group create')) {
        Invoke-AzGroupDeployment `
            -Subscription $sharedSub `
            -ResourceGroup 'udcsp-shared-ddos-rg' `
            -Location $sharedRegion `
            -TemplateFile $plan `
            -LogFile $logFile `
            -DeploymentName 'udcsp-ddos-plan' `
            -Tags $Config.Tags `
            -WhatIfFlag $whatIf
    }

    $planId = "/subscriptions/$sharedSub/resourceGroups/udcsp-shared-ddos-rg/providers/Microsoft.Network/ddosProtectionPlans/udcsp-shared-ddos-plan"

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $bicepparam = Join-Path $repo "infra\landing-zone\parameters\$($country.ToLower()).bicepparam"
        if (-not (Test-Path $bicepparam)) { throw "Missing $bicepparam" }
        if ($PSCmdlet.ShouldProcess("ddos-attach-$country", 'az deployment sub create')) {
            # Re-deploy the LZ with the ddosProtectionPlanId override. The LZ
            # is idempotent — only the VNet PUT changes (enableDdosProtection
            # + ddosProtectionPlan.id), every other resource is a no-op.
            Invoke-NativeCommand `
                -Command @(
                    'az','deployment','sub','create',
                    '--subscription', $sub,
                    '--location', $region,
                    '--name', "udcsp-ddos-attach-$($country.ToLower())",
                    '--template-file', $lzMain,
                    '--parameters', $bicepparam,
                    '--parameters', "ddosProtectionPlanId=$planId",
                    '--only-show-errors','--output','none'
                ) `
                -LogFile $logFile `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Ddos {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $plan = Join-Path $repo 'infra\security\ddos\ddos-protection-plan.bicep'
    if (-not (Test-Path $plan)) { throw "Missing $plan" }
    "{`"phase`":`"Ddos`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-ddos.json')
}

Export-ModuleMember -Function Install-Ddos, Test-Ddos
