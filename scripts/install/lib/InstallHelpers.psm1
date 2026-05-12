<#
.SYNOPSIS
    Shared helpers used by every Install-*.psm1 module to invoke real
    deployments (az CLI, pac CLI, MS Graph, npm, swa, eas, …) with
    consistent logging, idempotency, and -WhatIf support.

.DESCRIPTION
    The historical scaffold modules wrote `[scaffold] az deployment …`
    lines into their report logs without invoking anything. The functions
    below replace that scaffold with real, idempotent invocations and a
    single shared logging convention so the install-report.json picks up
    every command and its exit status.

    Logging convention written to <ReportDir>\install-<phase>.log:
        2026-05-10T00:00:00.000Z [run] az deployment sub create …
        2026-05-10T00:00:00.000Z [exit 0] OK in 12.3 s
        2026-05-10T00:00:00.000Z [exit 1] FAIL in 4.5 s
                                          STDERR: …

    All Install-* modules import this file with:
        Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force
#>

$Script:CliCheckCache = @{}

function Write-Log {
    param([string]$LogFile, [string]$Message)
    if (-not (Test-Path (Split-Path $LogFile -Parent))) {
        New-Item -ItemType Directory -Force -Path (Split-Path $LogFile -Parent) | Out-Null
    }
    "$([DateTime]::UtcNow.ToString('o')) $Message" | Add-Content -Path $LogFile -Encoding UTF8
}

function Test-CliAvailable {
    <#
    .SYNOPSIS
        Returns $true if a CLI is on PATH. Cached per session to avoid
        repeated Get-Command calls.
    #>
    param([Parameter(Mandatory)][string]$Name)
    if ($Script:CliCheckCache.ContainsKey($Name)) { return $Script:CliCheckCache[$Name] }
    $found = [bool](Get-Command $Name -ErrorAction SilentlyContinue)
    $Script:CliCheckCache[$Name] = $found
    return $found
}

function Test-AzLoggedIn {
    <#
    .SYNOPSIS
        Returns the parsed `az account show` JSON object if logged in,
        $null otherwise. Cached per session.
    #>
    if ($Script:CliCheckCache.ContainsKey('__azAccount')) { return $Script:CliCheckCache['__azAccount'] }
    if (-not (Test-CliAvailable -Name 'az')) {
        $Script:CliCheckCache['__azAccount'] = $null
        return $null
    }
    try {
        $json = az account show 2>$null
        if (-not $json) { $Script:CliCheckCache['__azAccount'] = $null; return $null }
        $acct = $json | ConvertFrom-Json
        $Script:CliCheckCache['__azAccount'] = $acct
        return $acct
    } catch {
        $Script:CliCheckCache['__azAccount'] = $null
        return $null
    }
}

function Assert-AzReady {
    <#
    .SYNOPSIS
        Throws a clear, actionable error if az CLI is missing or the
        operator is not logged in. Use at the top of any Install-*
        function that performs az deployment calls.
    #>
    if (-not (Test-CliAvailable -Name 'az')) {
        throw "Azure CLI ('az') is not on PATH. Install: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli, then run 'az login' against the operator tenant."
    }
    $acct = Test-AzLoggedIn
    if (-not $acct) {
        throw "Azure CLI is installed but you are not logged in. Run 'az login' (and 'az account set --subscription <SharedPlatform>') before re-running the installer."
    }
    return $acct
}

function Invoke-NativeCommand {
    <#
    .SYNOPSIS
        Runs an external command (az, pac, swa, npm, eas, func, …),
        captures stdout+stderr to the phase log, throws on non-zero exit
        unless -ContinueOnError is set. Honours -WhatIf at the caller
        level: if $WhatIfFlag is true the command is only logged, never
        executed.
    .PARAMETER Command
        Argument vector — first element is the executable, rest are args.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string[]]$Command,
        [Parameter(Mandatory)][string]$LogFile,
        [bool]$WhatIfFlag = $false,
        [switch]$ContinueOnError
    )
    $cmdLine = ($Command | ForEach-Object { if ($_ -match '\s|"') { '"' + ($_ -replace '"','\"') + '"' } else { $_ } }) -join ' '
    Write-Log -LogFile $LogFile -Message "[run] $cmdLine"
    # Compact human-readable label for console (no -Verbose required)
    $label = & {
        if ($Command[0] -ne 'az') { return "$($Command[0]) $($Command[1])" }
        $verb = ($Command[1..([Math]::Min(3,$Command.Count-1))]) -join ' '
        $nameIdx = [Array]::IndexOf($Command, '--name')
        if ($nameIdx -lt 0) { $nameIdx = [Array]::IndexOf($Command, '-n') }
        $name = if ($nameIdx -ge 0 -and $nameIdx + 1 -lt $Command.Count) { " $($Command[$nameIdx + 1])" } else { '' }
        "az $verb$name"
    }
    Write-Host ("    ↳ {0,-90} " -f $label) -NoNewline -ForegroundColor DarkGray
    if ($WhatIfFlag) {
        Write-Log -LogFile $LogFile -Message "[whatif] command not executed (planning mode)"
        Write-Host "[whatif]" -ForegroundColor Yellow
        return
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $exe = $Command[0]
    $rawArgs = if ($Command.Count -gt 1) { $Command[1..($Command.Count - 1)] } else { @() }
    # Windows: Start-Process can't launch .cmd/.bat shims (npm, swa, eas, pac,
    # func, etc.) directly — it tries to load them as PE images and fails with
    # "%1 is not a valid Win32 application." Resolve the command via Get-Command
    # and, when the resolved path is a script shim, run it through cmd.exe /c.
    if ($IsWindows -or $env:OS -eq 'Windows_NT') {
        $resolved = Get-Command $exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($resolved -and $resolved.Source -match '\.(cmd|bat)$') {
            $rawArgs = @('/d','/c',$resolved.Source) + $rawArgs
            $exe = 'cmd.exe'
        } elseif ($resolved) {
            $exe = $resolved.Source
        }
    }
    # Start-Process -ArgumentList is broken for args containing whitespace:
    # PS joins the array with single spaces, the child re-tokenises, and
    # arguments like --description "foo bar" arrive as 2+ positional args.
    # Quote-and-escape each arg that contains whitespace, double-quote, or
    # is empty, so the child's CRT re-parsing reconstructs the original.
    $args = $rawArgs | ForEach-Object {
        $a = [string]$_
        if ($a -eq '' -or $a -match '\s|"') {
            '"' + ($a -replace '\\(?=("|$))','\\' -replace '"','\"') + '"'
        } else { $a }
    }
    $tmpOut = [IO.Path]::GetTempFileName()
    $tmpErr = [IO.Path]::GetTempFileName()
    try {
        $proc = Start-Process -FilePath $exe -ArgumentList $args -NoNewWindow -PassThru -Wait `
                              -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr
        $exit = $proc.ExitCode
        $sw.Stop()
        $stdout = Get-Content $tmpOut -Raw -ErrorAction SilentlyContinue
        $stderr = Get-Content $tmpErr -Raw -ErrorAction SilentlyContinue
        if ($stdout) { Write-Log -LogFile $LogFile -Message "[stdout]`n$stdout" }
        if ($stderr) { Write-Log -LogFile $LogFile -Message "[stderr]`n$stderr" }
        if ($exit -ne 0) {
            $msg = "[exit $exit] FAIL in $([Math]::Round($sw.Elapsed.TotalSeconds,1)) s : $cmdLine"
            Write-Log -LogFile $LogFile -Message $msg
            Write-Host ("✗ {0}s" -f [Math]::Round($sw.Elapsed.TotalSeconds,1)) -ForegroundColor Red
            if ($ContinueOnError) {
                $shortMsg = "[exit $exit] $($Command[0]) $($Command[1]) (continued; see $LogFile)"
                Write-Warning $shortMsg
            } else {
                throw $msg
            }
        } else {
            Write-Log -LogFile $LogFile -Message "[exit 0] OK in $([Math]::Round($sw.Elapsed.TotalSeconds,1)) s"
            Write-Host ("✓ {0}s" -f [Math]::Round($sw.Elapsed.TotalSeconds,1)) -ForegroundColor Green
        }
    } finally {
        Remove-Item -Path $tmpOut, $tmpErr -ErrorAction SilentlyContinue
    }
}

function New-AzResourceGroupIfNeeded {
    <#
    .SYNOPSIS
        Idempotent `az group create`. Safe to call before every group-
        scoped deployment.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Subscription,
        [Parameter(Mandatory)][string]$ResourceGroup,
        [Parameter(Mandatory)][string]$Location,
        [Parameter(Mandatory)][string]$LogFile,
        [hashtable]$Tags,
        [bool]$WhatIfFlag = $false
    )
    $args = @('group','create','--subscription',$Subscription,'--name',$ResourceGroup,'--location',$Location,'--only-show-errors','--output','none')
    if ($Tags) {
        $tagPairs = $Tags.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
        $args += @('--tags') + $tagPairs
    }
    Invoke-NativeCommand -Command (@('az') + $args) -LogFile $LogFile -WhatIfFlag $WhatIfFlag
}

function Invoke-AzSubDeployment {
    <#
    .SYNOPSIS
        Idempotent subscription-scope Bicep deployment.
        Emits the deployment name into the report log for traceability.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Subscription,
        [Parameter(Mandatory)][string]$Location,
        [Parameter(Mandatory)][string]$TemplateFile,
        [string]$ParametersFile,
        [Parameter(Mandatory)][string]$LogFile,
        [string]$DeploymentName,
        [bool]$WhatIfFlag = $false
    )
    if (-not (Test-Path $TemplateFile)) { throw "Template not found: $TemplateFile" }
    if (-not $DeploymentName) {
        $base = (Split-Path $TemplateFile -LeafBase) -replace '[^\w\-]','-'
        $DeploymentName = "udcsp-$base-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))"
    }
    $args = @('deployment','sub','create',
              '--subscription',$Subscription,
              '--location',$Location,
              '--name',$DeploymentName,
              '--template-file',$TemplateFile,
              '--only-show-errors','--output','none')
    if ($ParametersFile) {
        if (-not (Test-Path $ParametersFile)) { throw "Parameters file not found: $ParametersFile" }
        $args += @('--parameters', $ParametersFile)
    }
    Invoke-NativeCommand -Command (@('az') + $args) -LogFile $LogFile -WhatIfFlag $WhatIfFlag
}

function Resolve-BicepParamSubscriptionTokens {
    <#
    .SYNOPSIS
        Substitute {{dk-subscription-id}} / {{se-subscription-id}} /
        {{no-subscription-id}} / {{shared-subscription-id}} placeholders in a
        .bicepparam file with the real GUIDs from $Config.Subscriptions, then
        write the resolved file under $OutputDir so the original (under source
        control) stays untouched. Returns the path of the resolved file.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$SourceFile,
        [Parameter(Mandatory)][hashtable]$Subscriptions,
        [Parameter(Mandatory)][string]$OutputDir,
        [Parameter(Mandatory)][string]$Tag
    )
    if (-not (Test-Path $SourceFile)) { throw "Bicepparam not found: $SourceFile" }
    if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }
    $content = Get-Content -Path $SourceFile -Raw
    $map = @{
        '{{dk-subscription-id}}'     = $Subscriptions['DK']
        '{{se-subscription-id}}'     = $Subscriptions['SE']
        '{{no-subscription-id}}'     = $Subscriptions['NO']
        '{{shared-subscription-id}}' = $Subscriptions['SharedPlatform']
    }
    foreach ($k in $map.Keys) {
        if ($map[$k]) {
            $content = $content.Replace($k, $map[$k])
        }
    }
    $leaf = [System.IO.Path]::GetFileNameWithoutExtension($SourceFile)
    # Bicep parser rejects Windows-absolute paths in `using` (treats `C:` as
    # a module scheme), so we cannot rewrite the using to an absolute path.
    # Instead, write the resolved .bicepparam next to the SOURCE bicepparam
    # (same directory) so the original relative `using '../X.bicep'` keeps
    # resolving as authored. Mirror a copy into OutputDir for the install
    # report and return the deployed file path for `az`.
    $sourceDir = Split-Path $SourceFile -Parent
    $deployedParam = Join-Path $sourceDir ("{0}.{1}.resolved.bicepparam" -f $leaf, $Tag)
    $reportCopy    = Join-Path $OutputDir ("{0}.{1}.bicepparam" -f $leaf, $Tag)
    $content | Set-Content -Path $deployedParam -Encoding utf8
    Copy-Item -Path $deployedParam -Destination $reportCopy -Force
    return $deployedParam
}

function Invoke-AzTenantDeployment {
    <#
    .SYNOPSIS
        Idempotent tenant-scope Bicep deployment. Used for cross-
        subscription / cross-tenant resources such as Entra Permissions
        Management onboarding.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Location,
        [Parameter(Mandatory)][string]$TemplateFile,
        [string]$ParametersFile,
        [Parameter(Mandatory)][string]$LogFile,
        [string]$DeploymentName,
        [bool]$WhatIfFlag = $false
    )
    if (-not (Test-Path $TemplateFile)) { throw "Template not found: $TemplateFile" }
    if (-not $DeploymentName) {
        $base = (Split-Path $TemplateFile -LeafBase) -replace '[^\w\-]','-'
        $DeploymentName = "udcsp-$base-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))"
    }
    $args = @('deployment','tenant','create',
              '--location',$Location,
              '--name',$DeploymentName,
              '--template-file',$TemplateFile,
              '--only-show-errors','--output','none')
    if ($ParametersFile) {
        if (-not (Test-Path $ParametersFile)) { throw "Parameters file not found: $ParametersFile" }
        $args += @('--parameters', $ParametersFile)
    }
    Invoke-NativeCommand -Command (@('az') + $args) -LogFile $LogFile -WhatIfFlag $WhatIfFlag
}

function Invoke-AzGroupDeployment {
    <#
    .SYNOPSIS
        Idempotent resource-group-scope Bicep deployment. Ensures the RG
        exists first.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Subscription,
        [Parameter(Mandatory)][string]$ResourceGroup,
        [Parameter(Mandatory)][string]$Location,
        [Parameter(Mandatory)][string]$TemplateFile,
        [string]$ParametersFile,
        [hashtable]$Parameters,
        [Parameter(Mandatory)][string]$LogFile,
        [string]$DeploymentName,
        [hashtable]$Tags,
        [bool]$WhatIfFlag = $false,
        [switch]$ContinueOnError
    )
    if (-not (Test-Path $TemplateFile)) { throw "Template not found: $TemplateFile" }
    if (-not $DeploymentName) {
        $base = (Split-Path $TemplateFile -LeafBase) -replace '[^\w\-]','-'
        $DeploymentName = "udcsp-$base-$([DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'))"
    }
    New-AzResourceGroupIfNeeded -Subscription $Subscription -ResourceGroup $ResourceGroup -Location $Location -LogFile $LogFile -Tags $Tags -WhatIfFlag $WhatIfFlag
    $args = @('deployment','group','create',
              '--subscription',$Subscription,
              '--resource-group',$ResourceGroup,
              '--name',$DeploymentName,
              '--template-file',$TemplateFile,
              '--only-show-errors','--output','none')
    if ($ParametersFile) {
        if (-not (Test-Path $ParametersFile)) { throw "Parameters file not found: $ParametersFile" }
        $args += @('--parameters', $ParametersFile)
    }
    if ($Parameters -and $Parameters.Count -gt 0) {
        $args += '--parameters'
        foreach ($k in $Parameters.Keys) {
            $v = $Parameters[$k]
            $args += "$k=$v"
        }
    }
    Invoke-NativeCommand -Command (@('az') + $args) -LogFile $LogFile -WhatIfFlag $WhatIfFlag -ContinueOnError:$ContinueOnError
}

function Invoke-MgGraphIfReady {
    <#
    .SYNOPSIS
        Best-effort MS Graph invocation. If the Microsoft.Graph PowerShell
        SDK is not installed or the operator is not connected, the call is
        logged and skipped (with a clear warning). Used by Identity (user
        flows, custom auth extensions), Verified ID (credential contracts),
        and Priva (config) phases — none of which have a stable Bicep
        provider yet.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Method,
        [Parameter(Mandatory)][string]$Uri,
        $Body,
        [Parameter(Mandatory)][string]$LogFile,
        [bool]$WhatIfFlag = $false
    )
    Write-Log -LogFile $LogFile -Message "[graph $Method] $Uri"
    if ($WhatIfFlag) {
        Write-Log -LogFile $LogFile -Message "[whatif] graph call not executed"
        return
    }
    if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
        Write-Log -LogFile $LogFile -Message "[skip] Microsoft.Graph.Authentication module not installed (Install-Module Microsoft.Graph). Call recorded for manual replay."
        return
    }
    Import-Module Microsoft.Graph.Authentication -ErrorAction SilentlyContinue
    try { $ctx = Get-MgContext -ErrorAction Stop } catch { $ctx = $null }
    if (-not $ctx) {
        Write-Log -LogFile $LogFile -Message "[skip] Not connected to MS Graph. Run 'Connect-MgGraph -Scopes ...' before re-running. Call recorded for manual replay."
        return
    }
    try {
        if ($Body) {
            $resp = Invoke-MgGraphRequest -Method $Method -Uri $Uri -Body ($Body | ConvertTo-Json -Depth 12) -ContentType 'application/json'
        } else {
            $resp = Invoke-MgGraphRequest -Method $Method -Uri $Uri
        }
        Write-Log -LogFile $LogFile -Message "[graph 200] $($resp | ConvertTo-Json -Depth 6 -Compress)"
    } catch {
        $msg = "$_"
        # Auth/permission/tenant-missing failures are NOT fatal: many Graph
        # payloads target separate Entra tenants (External ID, Verified ID
        # issuer tenant) that operators provision manually via portal. If
        # the current Graph context cannot reach the target tenant or
        # lacks the right scope, log the call for manual replay and let
        # the rest of the phase continue.
        $skippable = @(
            'DeviceCodeCredential authentication failed',
            'InteractiveBrowserCredential authentication failed',
            'Object reference not set to an instance of an object',
            'AADSTS', # any AAD auth error (consent, scope, tenant)
            'Authorization_RequestDenied',
            'Insufficient privileges',
            'Forbidden',
            'NotFound',
            'tenant cannot be found'
        )
        $isSkippable = $false
        foreach ($needle in $skippable) {
            if ($msg -like "*$needle*") { $isSkippable = $true; break }
        }
        if ($isSkippable) {
            Write-Log -LogFile $LogFile -Message "[graph SKIP] $Method $Uri — $msg. Recorded for manual replay (likely target tenant not yet provisioned or current Graph token lacks scope/tenant access)."
            return
        }
        Write-Log -LogFile $LogFile -Message "[graph FAIL] $msg"
        throw
    }
}

Export-ModuleMember -Function `
    Write-Log, `
    Test-CliAvailable, `
    Test-AzLoggedIn, `
    Assert-AzReady, `
    Invoke-NativeCommand, `
    New-AzResourceGroupIfNeeded, `
    Invoke-AzSubDeployment, `
    Invoke-AzTenantDeployment, `
    Invoke-AzGroupDeployment, `
    Resolve-BicepParamSubscriptionTokens, `
    Invoke-MgGraphIfReady
