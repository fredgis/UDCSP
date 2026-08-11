<#
.SYNOPSIS
    Install-Security — Defender for Cloud (incl. Defender for APIs pricing tier),
    Sentinel workspace, Azure Policy baseline initiative + assignment, DPIA artefacts.
    Real Bicep + az CLI deployments per subscription. Defender for APIs collection
    onboarding (which requires APIM to exist) runs in Phase 18 (Install-Apim).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Get-BuiltInPolicyRoleCatalog {
    param([Parameter(Mandatory)][string]$Subscription)

    $raw = (& az policy definition list `
        --subscription $Subscription `
        --query '[].{id:id,name:name,displayName:displayName,roles:policyRule.then.details.roleDefinitionIds}' `
        --output json `
        --only-show-errors 2>$null) -join [Environment]::NewLine
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "Could not read Azure built-in policy definitions needed to calculate remediation roles."
    }

    $catalog = @{}
    foreach ($definition in @($raw | ConvertFrom-Json)) {
        $roles = @($definition.roles | Where-Object { $_ })
        if ($roles.Count -eq 0) { continue }

        $entry = [pscustomobject]@{
            DisplayName = if ($definition.displayName) { [string]$definition.displayName } else { [string]$definition.name }
            Roles       = @($roles)
        }
        $id = ([string]$definition.id).ToLowerInvariant()
        $name = ([string]$definition.name).ToLowerInvariant()
        if ($id) { $catalog[$id] = $entry }
        if ($name) { $catalog[$name] = $entry }
    }
    return $catalog
}

function Get-PolicySetRemediationRoles {
    param(
        [Parameter(Mandatory)][string]$PolicySetName,
        [Parameter(Mandatory)][string]$Subscription,
        [Parameter(Mandatory)][hashtable]$RoleCatalog
    )

    $raw = (& az policy set-definition show `
        --name $PolicySetName `
        --subscription $Subscription `
        --output json `
        --only-show-errors 2>$null) -join [Environment]::NewLine
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "Could not read built-in policy initiative '$PolicySetName' to calculate remediation roles."
    }

    $policySet = $raw | ConvertFrom-Json
    $references = if ($policySet.policyDefinitions) {
        @($policySet.policyDefinitions)
    } else {
        @($policySet.properties.policyDefinitions)
    }
    $rolesById = @{}
    foreach ($reference in $references) {
        $definitionId = ([string]$reference.policyDefinitionId).ToLowerInvariant()
        $baseDefinitionId = $definitionId -replace '/versions/[^/]+$', ''
        $definitionName = ($baseDefinitionId -split '/')[-1]

        $entry = $null
        foreach ($lookupKey in @($definitionId, $baseDefinitionId, $definitionName)) {
            if ($lookupKey -and $RoleCatalog.ContainsKey($lookupKey)) {
                $entry = $RoleCatalog[$lookupKey]
                break
            }
        }
        if (-not $entry) { continue }

        foreach ($roleDefinitionId in @($entry.Roles)) {
            $roleId = ([string]$roleDefinitionId -split '/')[-1].ToLowerInvariant()
            if (-not $roleId) { continue }
            $rolesById[$roleId] = @($rolesById[$roleId]) + $entry.DisplayName
        }
    }
    return $rolesById
}

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
    $builtInPolicyRoleCatalog = $null
    $policySetRoleCache = @{}
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
        if ($PSCmdlet.ShouldProcess("$scope sentinel", 'az deployment group create')) {
            $sentinelRg = "udcsp-$($scope.ToLower())-sentinel-rg"
            Invoke-AzGroupDeployment `
                -Subscription $sub -ResourceGroup $sentinelRg -Location $region `
                -TemplateFile $sentinel `
                -Parameters @{ country = $scope.ToLower() } `
                -LogFile $logFile `
                -DeploymentName "udcsp-sentinel-$($scope.ToLower())" `
                -Tags $Config.Tags `
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

            # Built-in regulatory initiatives cannot be nested as references
            # inside our custom initiative (Azure rejects PolicySetDefinition
            # references inside policySetDefinitions.policyDefinitions),
            # so we assign them directly at subscription scope. Idempotent:
            # 'az policy assignment create' is a PUT, second call is a no-op.
            # We pass the GUID short-name (not the full /providers/... path)
            # because the Windows az.cmd shim mangles forward-slash arguments
            # on some builds and returns InvalidRequestUri.
            foreach ($builtin in $initiative.properties._referencedBuiltInInitiatives) {
                $guid = ($builtin.id -split '/')[-1]
                $assignName = "udcsp-$($builtin.name)-$($scope.ToLower())"
                $remediationRoles = $null
                if (-not $whatIf) {
                    if (-not $builtInPolicyRoleCatalog) {
                        $builtInPolicyRoleCatalog = Get-BuiltInPolicyRoleCatalog -Subscription $sub
                    }
                    if (-not $policySetRoleCache.ContainsKey($guid)) {
                        $policySetRoleCache[$guid] = Get-PolicySetRemediationRoles `
                            -PolicySetName $guid `
                            -Subscription $sub `
                            -RoleCatalog $builtInPolicyRoleCatalog
                    }
                    $remediationRoles = $policySetRoleCache[$guid]
                }

                $assignmentCommand = @('az','policy','assignment','create',
                                       '--name', $assignName,
                                       '--subscription', $sub,
                                       '--policy-set-definition', $guid,
                                       '--scope', "/subscriptions/$sub")
                # A managed identity is required only when a referenced policy
                # documents a Modify/DeployIfNotExists remediation role.
                if ($whatIf -or ($remediationRoles -and $remediationRoles.Count -gt 0)) {
                    $assignmentCommand += @('--mi-system-assigned','--location',$region)
                }
                $assignmentCommand += @('--only-show-errors','--output','none')
                Invoke-NativeCommand `
                    -Command $assignmentCommand `
                    -LogFile $logFile `
                    -WhatIfFlag $whatIf `
                    -ContinueOnError

                # The initiatives span current and future resource groups, so
                # their only complete common scope is the subscription. The
                # privilege is narrowed to the exact roleDefinitionIds declared
                # by each referenced policy; Contributor is granted only when
                # a built-in policy explicitly documents that requirement.
                if (-not $whatIf -and $remediationRoles.Count -gt 0) {
                    $miPrincipalId = (& az policy assignment show --name $assignName --scope "/subscriptions/$sub" --subscription $sub --query identity.principalId -o tsv --only-show-errors 2>$null)
                    if ($miPrincipalId) {
                        foreach ($roleId in $remediationRoles.Keys) {
                            $policyNames = @($remediationRoles[$roleId] | Sort-Object -Unique)
                            if ($roleId -eq 'b24988ac-6180-42a0-ab88-20f7382dd24c') {
                                Write-Log -LogFile $logFile -Message "[least-privilege] Contributor retained only because these policies declare it: $($policyNames -join '; ')"
                            }
                            Invoke-NativeCommand `
                                -Command @('az','role','assignment','create',
                                           '--assignee-object-id', $miPrincipalId.Trim(),
                                           '--assignee-principal-type','ServicePrincipal',
                                           '--role',$roleId,
                                           '--scope', "/subscriptions/$sub",
                                           '--subscription', $sub,
                                           '--only-show-errors','--output','none') `
                                -LogFile $logFile `
                                -WhatIfFlag $whatIf `
                                -ContinueOnError
                        }
                    }
                }
            }
        }
    }
}

function Test-Security {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $required = @(
        'infra\security\defender\defender-for-cloud.bicep',
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
