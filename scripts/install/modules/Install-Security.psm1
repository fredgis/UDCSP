<#
.SYNOPSIS
    Install-Security — Defender for Cloud (incl. Defender for APIs pricing tier),
    Sentinel workspace, Azure Policy baseline initiative + assignment, DPIA artefacts.
    Real Bicep + az CLI deployments per subscription. Defender for APIs collection
    onboarding (which requires APIM to exist) runs in Phase 18 (Install-Apim).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Security {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $defender = Join-Path $repo 'infra\security\defender\defender-for-cloud.bicep'
    $sentinel = Join-Path $repo 'infra\security\sentinel\sentinel-workspace.bicep'
    $policyInitiative = Join-Path $repo 'infra\security\azure-policy\baseline-initiative.json'
    $logFile  = Join-Path $ReportDir 'install-security.log'
    $whatIf   = [bool]$WhatIfPreference
    foreach ($f in @($defender, $sentinel, $policyInitiative)) { if (-not (Test-Path $f)) { throw "Missing $f" } }

    $initiative = Get-Content $policyInitiative -Raw | ConvertFrom-Json
    $defsFile = Join-Path $ReportDir 'baseline-initiative-definitions.json'
    @($initiative.properties.policyDefinitions) | ConvertTo-Json -Depth 10 | Set-Content $defsFile

    foreach ($scope in 'DK','SE','NO','SharedPlatform') {
        $sub = $Config.Subscriptions[$scope]
        if (-not $sub) { continue }
        $region = if ($scope -eq 'SharedPlatform') { $Config.Regions.Shared } else { $Config.Regions[$scope] }
        if ($PSCmdlet.ShouldProcess("$scope defender", 'az deployment sub create')) {
            Invoke-AzSubDeployment `
                -Subscription $sub -Location $region `
                -TemplateFile $defender `
                -LogFile $logFile `
                -DeploymentName "udcsp-defender-$($scope.ToLower())" `
                -WhatIfFlag $whatIf
        }
        if ($PSCmdlet.ShouldProcess("$scope sentinel", 'az deployment sub create')) {
            Invoke-AzSubDeployment `
                -Subscription $sub -Location $region `
                -TemplateFile $sentinel `
                -LogFile $logFile `
                -DeploymentName "udcsp-sentinel-$($scope.ToLower())" `
                -WhatIfFlag $whatIf
        }
        if ($PSCmdlet.ShouldProcess("$scope azure-policy initiative", 'az policy set-definition create + assignment')) {
            Invoke-NativeCommand `
                -Command @('az','policy','set-definition','create',
                           '--name', $initiative.name,
                           '--subscription', $sub,
                           '--definitions', $defsFile,
                           '--display-name', $initiative.properties.displayName,
                           '--description', $initiative.properties.description,
                           '--only-show-errors','--output','none') `
                -LogFile $logFile `
                -WhatIfFlag $whatIf `
                -ContinueOnError
            Invoke-NativeCommand `
                -Command @('az','policy','assignment','create',
                           '--name', "udcsp-baseline-$($scope.ToLower())",
                           '--subscription', $sub,
                           '--policy-set-definition', $initiative.name,
                           '--scope', "/subscriptions/$sub",
                           '--only-show-errors','--output','none') `
                -LogFile $logFile `
                -WhatIfFlag $whatIf `
                -ContinueOnError
        }
    }
}

function Test-Security {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $required = @(
        'infra\security\defender\defender-for-cloud.bicep',
        'infra\security\defender\defender-for-apis.bicep',
        'infra\security\defender\defender-for-apis-onboarding.bicep',
        'infra\security\sentinel\sentinel-workspace.bicep',
        'infra\security\azure-policy\baseline-initiative.json',
        'governance\dpia\dpia-template.md',
        'governance\dpia\dpia-eligibility-model.md'
    )
    foreach ($r in $required) {
        $p = Join-Path $repo $r
        if (-not (Test-Path $p)) { throw "Missing security artefact: $r" }
    }
    "{`"phase`":`"Security`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-security.json')
}

Export-ModuleMember -Function Install-Security, Test-Security
