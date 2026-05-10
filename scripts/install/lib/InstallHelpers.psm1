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
    if ($WhatIfFlag) {
        Write-Log -LogFile $LogFile -Message "[whatif] command not executed (planning mode)"
        return
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $exe = $Command[0]
    $args = if ($Command.Count -gt 1) { $Command[1..($Command.Count - 1)] } else { @() }
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
            if ($ContinueOnError) {
                Write-Warning $msg
            } else {
                throw $msg
            }
        } else {
            Write-Log -LogFile $LogFile -Message "[exit 0] OK in $([Math]::Round($sw.Elapsed.TotalSeconds,1)) s"
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
        [Parameter(Mandatory)][string]$LogFile,
        [string]$DeploymentName,
        [hashtable]$Tags,
        [bool]$WhatIfFlag = $false
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
    Invoke-NativeCommand -Command (@('az') + $args) -LogFile $LogFile -WhatIfFlag $WhatIfFlag
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
        Write-Log -LogFile $LogFile -Message "[graph FAIL] $_"
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
    Invoke-AzGroupDeployment, `
    Invoke-MgGraphIfReady
