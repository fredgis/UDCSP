param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dk','se','no')]
    [string] $Country,

    [switch] $Offline,

    [string] $ResourceGroup = "udcsp-$Country-data"
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$template = Join-Path $root 'postgresql-flexible.bicep'
$params = Join-Path $root "parameters\$Country.bicepparam"

foreach ($path in @($template, $params)) {
    if (-not (Test-Path $path)) { throw "Required file missing: $path" }
}

$content = Get-Content -Path $template -Raw
foreach ($required in @('udcsp_reference','udcsp_drafts','udcsp_glossaries','pg_partman','passwordAuth','PostgreSQLLogs')) {
    if ($content -notmatch [regex]::Escape($required)) { throw "Template check failed: missing $required" }
}

if (Get-Command az -ErrorAction SilentlyContinue) {
    az bicep build --file $template --stdout 1>$null
    if ($LASTEXITCODE -ne 0) { throw 'Bicep build failed.' }
}

if (-not $Offline) {
    az deployment group what-if --resource-group $ResourceGroup --template-file $template --parameters $params --only-show-errors
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL what-if failed.' }
    $serverName = "udcsp-$Country-dev-postgres"
    $fqdn = az postgres flexible-server show --resource-group $ResourceGroup --name $serverName --query fullyQualifiedDomainName -o tsv 2>$null
    if (-not $fqdn) { throw "No FQDN returned for $serverName." }
    "Host=$fqdn;Database=udcsp_reference;Authentication=Active Directory Default;Ssl Mode=Require;"
}

Write-Host "PostgreSQL validation passed for $Country."
exit 0
