[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $TenantDomain,
  [string[]] $Policies = @('B2C_1A_SIGNUP_SIGNIN','B2C_1A_PROFILEEDIT','B2C_1A_PASSWORDRESET')
)
$ErrorActionPreference = 'Stop'
foreach ($policy in $Policies) {
  $url = "https://$TenantDomain/$TenantDomain/$policy/v2.0/.well-known/openid-configuration"
  $doc = Invoke-RestMethod -Uri $url -Method Get
  if (-not $doc.authorization_endpoint -or -not $doc.issuer) { throw "Policy $policy discovery missing endpoints" }
  Write-Host "OK $policy $($doc.issuer)"
}
