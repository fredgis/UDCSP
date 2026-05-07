[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $TenantDomain,
  [string[]] $UserFlows = @('SignUpSignIn','ProfileEdit','PasswordReset')
)
$ErrorActionPreference = 'Stop'
foreach ($flow in $UserFlows) {
  # Microsoft Entra External ID OIDC discovery (CIAM tenant). The legacy Azure AD B2C ?p=<policy> query
  # parameter is replaced by appending the user-flow name as a path segment.
  $url = "https://$TenantDomain/$TenantDomain/$flow/v2.0/.well-known/openid-configuration"
  $doc = Invoke-RestMethod -Uri $url -Method Get
  if (-not $doc.authorization_endpoint -or -not $doc.issuer) { throw "User flow $flow discovery missing endpoints" }
  Write-Host "OK $flow $($doc.issuer)"
}
