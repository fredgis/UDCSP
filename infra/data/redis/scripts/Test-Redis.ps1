param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dk','se','no')]
    [string] $Country,

    [switch] $Offline,

    [string] $ResourceGroup = "udcsp-$Country-data"
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$template = Join-Path $root 'redis-enterprise.bicep'
$params = Join-Path $root "parameters\$Country.bicepparam"

foreach ($path in @($template, $params)) {
    if (-not (Test-Path $path)) { throw "Required file missing: $path" }
}

$content = Get-Content -Path $template -Raw
foreach ($required in @('slot-filling-cache','session-state','application-drafts-ephemeral','minimumTlsVersion','publicNetworkAccess','customerManagedKeyEncryption')) {
    if ($content -notmatch [regex]::Escape($required)) { throw "Template check failed: missing $required" }
}

if (Get-Command az -ErrorAction SilentlyContinue) {
    az bicep build --file $template --stdout 1>$null
    if ($LASTEXITCODE -ne 0) { throw 'Bicep build failed.' }
}

if (-not $Offline) {
    az deployment group what-if --resource-group $ResourceGroup --template-file $template --parameters $params --only-show-errors
    if ($LASTEXITCODE -ne 0) { throw 'Redis what-if failed.' }
    $clusterName = "udcsp-$Country-dev-redis"
    $hostName = az redisenterprise show --resource-group $ResourceGroup --cluster-name $clusterName --query hostName -o tsv 2>$null
    if (-not $hostName) { throw "No hostName returned for $clusterName." }
    "rediss://$hostName`:10000"
}

Write-Host "Redis validation passed for $Country."
exit 0
