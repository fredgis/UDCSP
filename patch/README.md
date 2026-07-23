# UDCSP patches

Operational fixes applied to the running UDCSP environment that are not (yet)
part of the declarative IaC. Each script is **idempotent** and safe to re-run.

## `Enable-PrivateUploadPath.ps1`

Restores the citizen **document-upload** path (payslip on the *Child & family
benefit* page, employment contract on the *Residency transfer* page) after the
data-lake storage accounts were locked private-only by central governance.

### Why the upload broke (HTTP `403 upload_failed`)

- The per-country data lakes (`udcsp<c>prodlake`) are forced to
  `publicNetworkAccess = Disabled` + `allowSharedKeyAccess = false` by the MCAPS
  modify policy `StorageAccount_PublicNetwork_Modify` (assignment
  `MCAPSGovDeployPolicies`). That assignment is **above the subscription**, so it
  cannot be exempted and the account cannot be flipped back to public — any
  `az storage account update --public-network-access Enabled` reports success but
  is silently reverted.
- Uploads do **not** use a public blob link. The web app calls
  `POST /documents/upload-url` on APIM; APIM authenticates with its **managed
  identity** and PUTs the blob server-side to
  `udcsp<c>prodlake.blob.core.windows.net`
  (`services/apim/apis/documents/operations/post-documents-upload-url.xml`).
- APIM was provisioned **outside** the VNet (`virtualNetworkType = None`), so its
  outbound PUT went over the public internet and the private-only storage
  rejected it. It only ever worked while public access was manually (and
  temporarily) re-enabled.

### What the script does (per country, all idempotent)

1. Private DNS zones `privatelink.blob.core.windows.net` +
   `privatelink.dfs.core.windows.net`, linked to the country VNet.
2. A **blob** private endpoint on the storage (only a `dfs` PE existed) and DNS
   zone groups on both the new blob PE and the existing dfs PE.
3. A dedicated `apim` subnet (`<vnetbase>.6.0/24`), an NSG (inbound 443/3443/6390)
   and a **Standard static public IP** (required for stv2 VNet injection).
4. APIM injected into the VNet in **External** mode — the gateway keeps its
   public ingress and hostname (`udcsp-<c>-prod-apim.azure-api.net`); only its
   **egress** now routes through the VNet to the storage private endpoint.

Nothing about the public website, APIM routes, products or policies changes.

### VNet address spaces

| Country | VNet base    | Region          | APIM PIP DNS label |
|---------|--------------|-----------------|--------------------|
| dk      | `10.10.0.0/16` | `northeurope`   | `udcspdkprodapim`  |
| no      | `10.30.0.0/16` | `norwayeast`    | `udcspnoprodapim`  |
| se      | `10.20.0.0/16` | `swedencentral` | `udcspseprodapim`  |

### Usage

```powershell
# All three countries (default):
./Enable-PrivateUploadPath.ps1

# A subset, or network prep only (skip the ~30-45 min APIM injection):
./Enable-PrivateUploadPath.ps1 -Countries no,se
./Enable-PrivateUploadPath.ps1 -Countries se -SkipApimInjection

# Preview without making changes:
./Enable-PrivateUploadPath.ps1 -WhatIf
```

Requires Azure CLI logged into the MngEnvMCAP tenant with network + APIM
contributor on the target resource groups, and PowerShell 7+.

APIM VNet injection is **asynchronous** (~30-45 min per instance); poll with:

```powershell
az apim show -n udcsp-<c>-prod-apim -g udcsp-<c>-apim-rg `
  --query "{s:provisioningState,v:virtualNetworkType}" -o json
```

Then retest the upload button on the *Child & family benefit* /
*Residency transfer* pages.
