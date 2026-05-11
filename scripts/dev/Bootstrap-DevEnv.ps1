<#
.SYNOPSIS
    UDCSP — Bootstrap an operator workstation with the tooling the installer
    expects.
#>
[CmdletBinding()]
param([switch]$IncludePowerPlatformCli)

$ErrorActionPreference = 'Stop'

function Ensure-Module([string]$Name) {
    if (-not (Get-Module -ListAvailable -Name $Name)) {
        Write-Host "Installing PowerShell module $Name" -ForegroundColor Cyan
        Install-Module -Name $Name -Scope CurrentUser -Force -AllowClobber
    } else {
        Write-Host "Module $Name already installed" -ForegroundColor DarkGray
    }
}

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw 'PowerShell 7+ required. Install from https://aka.ms/powershell-release.'
}

Ensure-Module 'Az'
Ensure-Module 'Microsoft.Graph'
Ensure-Module 'Pester'
Ensure-Module 'powershell-yaml'  # required by Install-Voice (parses apps/voice/acs/phone-number-bindings.yaml)

# Bicep CLI via Az CLI (--only-show-errors silences info banners; --quiet is not a valid flag here)
try { az bicep upgrade --only-show-errors 2>$null | Out-Null } catch { Write-Warning "Could not upgrade bicep — install az CLI from https://aka.ms/installazurecli." }

# Node + Python sanity check
foreach ($t in 'node','python','git','az') {
    $cmd = Get-Command $t -ErrorAction SilentlyContinue
    if ($cmd) { Write-Host "$t -> $($cmd.Source)" -ForegroundColor DarkGray }
    else { Write-Warning "$t not on PATH — install before running the installer." }
}

if ($IncludePowerPlatformCli) {
    if (-not (Get-Command pac -ErrorAction SilentlyContinue)) {
        if (Get-Command dotnet -ErrorAction SilentlyContinue) {
            Write-Host "Installing Power Platform CLI via dotnet tool…" -ForegroundColor Yellow
            dotnet tool install --global Microsoft.PowerApps.CLI.Tool 2>&1 | Out-Host
            $env:PATH += ";$env:USERPROFILE\.dotnet\tools"
            if (Get-Command pac -ErrorAction SilentlyContinue) {
                Write-Host "pac installed -> $((Get-Command pac).Source)" -ForegroundColor DarkGray
            } else {
                Write-Warning "pac install attempted but command still not on PATH. Open a new shell, or run: `$env:PATH += `";`$env:USERPROFILE\.dotnet\tools`""
            }
        } else {
            Write-Warning "dotnet SDK not found. Install .NET 6+ then run: dotnet tool install --global Microsoft.PowerApps.CLI.Tool"
        }
    } else {
        Write-Host "pac -> $((Get-Command pac).Source)" -ForegroundColor DarkGray
    }
}

# Initialise config from template if needed
$cfg = Join-Path $PSScriptRoot '..\install\config\udcsp.config.psd1'
$tpl = Join-Path $PSScriptRoot '..\install\config\udcsp.config.template.psd1'
if (-not (Test-Path $cfg) -and (Test-Path $tpl)) {
    Copy-Item $tpl $cfg
    Write-Host "Copied config template → $cfg. Edit before running Install-UDCSP.ps1." -ForegroundColor Yellow
}

Write-Host "`nBootstrap complete." -ForegroundColor Green
