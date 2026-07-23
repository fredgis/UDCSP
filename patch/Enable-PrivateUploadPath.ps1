<#
.SYNOPSIS
    UDCSP — Restore the citizen document-upload path when the data-lake storage
    accounts are locked "private-only" by central (MCAPS) governance.

.DESCRIPTION
    The per-country data-lake storage accounts (udcsp<c>prodlake) are forced to
    `publicNetworkAccess = Disabled` and `allowSharedKeyAccess = false` by the
    MCAPS modify policy `StorageAccount_PublicNetwork_Modify` (assignment
    `MCAPSGovDeployPolicies`). That assignment lives ABOVE the subscription, so
    it cannot be exempted and the storage cannot be flipped back to public.

    The web app uploads documents (payslip on the Child & family benefit page,
    employment contract on the Residency transfer page) through APIM:
        POST /documents/upload-url  ->  APIM authenticates with its managed
        identity and PUTs the blob to udcsp<c>prodlake.blob.core.windows.net.

    APIM was provisioned OUTSIDE the VNet (virtualNetworkType = None), so its
    outbound PUT left over the public internet and the private-only storage
    rejected it => HTTP 403 "upload_failed". It only ever worked because the
    operator manually re-enabled public access, which the policy now reverts.

    This patch wires a fully private path (idempotent, safe to re-run):
      1. Private DNS zones privatelink.blob/.dfs.core.windows.net + VNet links.
      2. A `blob` private endpoint on the storage (only `dfs` existed) + DNS
         zone groups on both the new blob PE and the existing dfs PE.
      3. A dedicated `apim` subnet, an NSG (443/3443/6390) and a Standard
         static public IP (required for stv2 VNet injection).
      4. APIM injected into the VNet in **External** mode — the gateway keeps
         its public ingress and hostname (udcsp-<c>-prod-apim.azure-api.net),
         only its egress now routes through the VNet to the private endpoint.

    Nothing about the public site, APIM routes, products or policies changes.

.PARAMETER SubscriptionId
    Target subscription. Defaults to the UDCSP prod (MngEnvMCAP) subscription.

.PARAMETER Countries
    Which country stamps to patch. Defaults to dk, no, se.

.PARAMETER SkipApimInjection
    Only do the network prep (DNS zones, blob PE, subnet, NSG, PIP) and skip the
    long-running APIM VNet injection.

.EXAMPLE
    ./Enable-PrivateUploadPath.ps1 -Countries no,se

.NOTES
    Requires: Azure CLI (az), logged in to the MngEnvMCAP tenant, with network +
    APIM contributor on the target resource groups. PowerShell 7+.
    APIM VNet injection is asynchronous and typically takes 30-45 minutes per
    instance; the gateway may see brief blips during the switch.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$SubscriptionId = '<SUBSCRIPTION_ID>',
    [ValidateSet('dk', 'no', 'se')]
    [string[]]$Countries = @('dk', 'no', 'se'),
    [switch]$SkipApimInjection
)

$ErrorActionPreference = 'Stop'

# --- Per-country stamp configuration -----------------------------------------
# Everything follows the udcsp-<c>-prod-* naming convention; only the VNet base
# octet, the Azure region and the (globally unique) PIP DNS label differ.
$Stamps = @{
    dk = @{ VnetBase = '10.10'; Location = 'northeurope';   PipDns = 'udcspdkprodapim' }
    no = @{ VnetBase = '10.30'; Location = 'norwayeast';    PipDns = 'udcspnoprodapim' }
    se = @{ VnetBase = '10.20'; Location = 'swedencentral'; PipDns = 'udcspseprodapim' }
}

$BlobZone = 'privatelink.blob.core.windows.net'
$DfsZone  = 'privatelink.dfs.core.windows.net'
$ApiVersion = '2022-08-01'

function Test-AzResource([string]$Cmd) {
    # Runs an `az ... show` style probe, returns $true if the resource exists.
    $null = & cmd /c "$Cmd 1>nul 2>nul"
    return ($LASTEXITCODE -eq 0)
}

function Write-Step([string]$Msg) { Write-Host "  -> $Msg" -ForegroundColor Cyan }
function Write-Skip([string]$Msg) { Write-Host "  = $Msg (already present)" -ForegroundColor DarkGray }

Write-Host "Selecting subscription $SubscriptionId" -ForegroundColor Green
az account set --subscription $SubscriptionId | Out-Null

foreach ($c in $Countries) {
    $s = $Stamps[$c]
    $rg        = "udcsp-$c-prod-platform-rg"
    $apimRg    = "udcsp-$c-apim-rg"
    $vnet      = "udcsp-$c-prod-vnet"
    $apimName  = "udcsp-$c-prod-apim"
    $storage   = "udcsp${c}prodlake"
    $blobPe    = "udcsp-$c-prod-lake-blob-pe"
    $dfsPe     = "udcsp-$c-prod-lake-pe"
    $nsg       = "udcsp-$c-prod-apim-nsg"
    $pip       = "udcsp-$c-prod-apim-pip"
    $apimSubnetPrefix = "$($s.VnetBase).6.0/24"
    $loc       = $s.Location

    $vnetId    = "/subscriptions/$SubscriptionId/resourceGroups/$rg/providers/Microsoft.Network/virtualNetworks/$vnet"
    $storageId = "/subscriptions/$SubscriptionId/resourceGroups/$rg/providers/Microsoft.Storage/storageAccounts/$storage"
    $apimId    = "/subscriptions/$SubscriptionId/resourceGroups/$apimRg/providers/Microsoft.ApiManagement/service/$apimName"

    Write-Host "`n=== $($c.ToUpper()) : $storage / $apimName ===" -ForegroundColor Yellow

    # 1) Private DNS zones + VNet links -------------------------------------
    foreach ($zone in @($BlobZone, $DfsZone)) {
        if (Test-AzResource "az network private-dns zone show -g $rg -n $zone") { Write-Skip "DNS zone $zone" }
        elseif ($PSCmdlet.ShouldProcess($zone, 'create private DNS zone')) {
            Write-Step "create DNS zone $zone"; az network private-dns zone create -g $rg -n $zone -o none
        }
    }
    $links = @{ $BlobZone = 'blob-link'; $DfsZone = 'dfs-link' }
    foreach ($zone in $links.Keys) {
        $link = $links[$zone]
        if (Test-AzResource "az network private-dns link vnet show -g $rg -z $zone -n $link") { Write-Skip "VNet link $link on $zone" }
        elseif ($PSCmdlet.ShouldProcess($link, "link VNet to $zone")) {
            Write-Step "link VNet to $zone"; az network private-dns link vnet create -g $rg -n $link -z $zone -v $vnetId -e false -o none
        }
    }

    # 2) blob private endpoint + DNS zone groups ----------------------------
    if (Test-AzResource "az network private-endpoint show -g $rg -n $blobPe") { Write-Skip "blob private endpoint $blobPe" }
    elseif ($PSCmdlet.ShouldProcess($blobPe, 'create blob private endpoint')) {
        Write-Step "create blob private endpoint $blobPe"
        az network private-endpoint create -g $rg -n $blobPe --vnet-name $vnet --subnet data `
            --private-connection-resource-id $storageId --group-id blob --connection-name "udcsp-$c-prod-lake-blob-plc" -o none
    }
    if (Test-AzResource "az network private-endpoint dns-zone-group show -g $rg --endpoint-name $blobPe -n default") { Write-Skip "blob PE dns-zone-group" }
    elseif ($PSCmdlet.ShouldProcess($blobPe, 'attach blob dns-zone-group')) {
        Write-Step "attach dns-zone-group (blob) to $blobPe"
        az network private-endpoint dns-zone-group create -g $rg --endpoint-name $blobPe -n default --private-dns-zone $BlobZone --zone-name blob -o none
    }
    if (Test-AzResource "az network private-endpoint dns-zone-group show -g $rg --endpoint-name $dfsPe -n default") { Write-Skip "dfs PE dns-zone-group" }
    elseif ($PSCmdlet.ShouldProcess($dfsPe, 'attach dfs dns-zone-group')) {
        Write-Step "attach dns-zone-group (dfs) to $dfsPe"
        az network private-endpoint dns-zone-group create -g $rg --endpoint-name $dfsPe -n default --private-dns-zone $DfsZone --zone-name dfs -o none
    }

    # 3) APIM subnet + NSG + Standard public IP -----------------------------
    if (Test-AzResource "az network nsg show -g $rg -n $nsg") { Write-Skip "NSG $nsg" }
    elseif ($PSCmdlet.ShouldProcess($nsg, 'create APIM NSG')) {
        Write-Step "create NSG $nsg"
        az network nsg create -g $rg -n $nsg -l $loc -o none
        az network nsg rule create -g $rg --nsg-name $nsg -n Allow-Client-443 --priority 100 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes Internet          --destination-address-prefixes VirtualNetwork --destination-port-ranges 443  -o none
        az network nsg rule create -g $rg --nsg-name $nsg -n Allow-Mgmt-3443  --priority 110 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes ApiManagement     --destination-address-prefixes VirtualNetwork --destination-port-ranges 3443 -o none
        az network nsg rule create -g $rg --nsg-name $nsg -n Allow-LB-6390    --priority 120 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes AzureLoadBalancer --destination-address-prefixes VirtualNetwork --destination-port-ranges 6390 -o none
    }
    if (Test-AzResource "az network vnet subnet show -g $rg --vnet-name $vnet -n apim") { Write-Skip "subnet apim" }
    elseif ($PSCmdlet.ShouldProcess('apim', 'create APIM subnet')) {
        Write-Step "create subnet apim ($apimSubnetPrefix)"
        az network vnet subnet create -g $rg --vnet-name $vnet -n apim --address-prefixes $apimSubnetPrefix --network-security-group $nsg -o none
    }
    if (Test-AzResource "az network public-ip show -g $rg -n $pip") { Write-Skip "public IP $pip" }
    elseif ($PSCmdlet.ShouldProcess($pip, 'create Standard public IP')) {
        Write-Step "create Standard static public IP $pip"
        az network public-ip create -g $rg -n $pip --sku Standard --allocation-method Static --dns-name $($s.PipDns) -l $loc -o none
    }

    # 4) APIM VNet injection (External) -------------------------------------
    if ($SkipApimInjection) { Write-Host "  (skipping APIM injection as requested)" -ForegroundColor DarkGray; continue }

    $vnetType = az apim show -n $apimName -g $apimRg --query virtualNetworkType -o tsv
    if ($vnetType -eq 'External') { Write-Skip "APIM already VNet-injected (External)" ; continue }

    if ($PSCmdlet.ShouldProcess($apimName, 'inject APIM into VNet (External)')) {
        Write-Step "inject APIM $apimName into VNet (External) — async, ~30-45 min"
        $subnetId = "$vnetId/subnets/apim"
        $pipId    = "/subscriptions/$SubscriptionId/resourceGroups/$rg/providers/Microsoft.Network/publicIPAddresses/$pip"
        $body = @{ properties = @{
            virtualNetworkType          = 'External'
            virtualNetworkConfiguration = @{ subnetResourceId = $subnetId }
            publicIpAddressId           = $pipId
        } } | ConvertTo-Json -Depth 6
        $tmp = Join-Path ([IO.Path]::GetTempPath()) "apim-vnet-$c.json"
        $body | Out-File -FilePath $tmp -Encoding ascii
        $url = 'https://management.azure.com' + $apimId + '?api-version=' + $ApiVersion
        az rest --method patch --url $url --headers 'Content-Type=application/json' --body "@$tmp" `
            --query "{name:name, provisioningState:properties.provisioningState}" -o json
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

Write-Host "`nDone. If APIM injection was triggered, poll until Succeeded:" -ForegroundColor Green
Write-Host '  az apim show -n udcsp-<c>-prod-apim -g udcsp-<c>-apim-rg --query "{s:provisioningState,v:virtualNetworkType}" -o json' -ForegroundColor DarkGray
Write-Host "Then retest the upload button on the Child & family benefit / Residency transfer pages." -ForegroundColor Green
