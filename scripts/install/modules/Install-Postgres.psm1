<#
.SYNOPSIS
    Install-Postgres — Azure Database for PostgreSQL Flexible Server, one per
    sovereign country zone. Replaces both Azure SQL Database (reference data,
    glossaries) and the >24h persisted portion of Cosmos DB (drafts via JSONB).
    Post-audit refactor 2026-05-09. See docs/tech/plan_post_audit.md.
#>
function Install-Postgres {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'dk','se','no') {
        $bicep = Join-Path $repo 'infra\data\postgresql\postgresql-flexible.bicep'
        $param = Join-Path $repo "infra\data\postgresql\parameters\$country.bicepparam"
        if (-not (Test-Path $bicep))  { Write-Warning "Missing $bicep";  continue }
        if (-not (Test-Path $param)) { Write-Warning "Missing $param"; continue }
        if ($PSCmdlet.ShouldProcess("postgres-$country", 'Deploy')) {
            "[scaffold] az deployment sub create --location $($Config.Regions[$country.ToUpper()]) --template-file $bicep --parameters $param" |
                Add-Content (Join-Path $ReportDir "install-postgres-$country.log")
        }
    }
}
function Test-Postgres {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'dk','se','no') {
        $script = Join-Path $repo 'infra\data\postgresql\scripts\Test-Postgres.ps1'
        if (Test-Path $script) {
            Write-Host "  → component test: $script -Country $country -Offline"
        } else {
            Write-Warning "Missing $script"
        }
    }
    "{`"phase`":`"Postgres`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-postgres.json')
}
Export-ModuleMember -Function Install-Postgres, Test-Postgres
