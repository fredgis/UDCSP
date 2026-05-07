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

# Bicep CLI via Az CLI
try { az bicep upgrade --quiet } catch { Write-Warning "Could not upgrade bicep — install az CLI from https://aka.ms/installazurecli." }

# Node + Python sanity check
foreach ($t in 'node','python','git','az') {
    $cmd = Get-Command $t -ErrorAction SilentlyContinue
    if ($cmd) { Write-Host "$t -> $($cmd.Source)" -ForegroundColor DarkGray }
    else { Write-Warning "$t not on PATH — install before running the installer." }
}

if ($IncludePowerPlatformCli) {
    if (-not (Get-Command pac -ErrorAction SilentlyContinue)) {
        Write-Host "Install Power Platform CLI: dotnet tool install --global Microsoft.PowerApps.CLI.Tool" -ForegroundColor Yellow
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
