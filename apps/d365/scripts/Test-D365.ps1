param([Parameter(Mandatory)] [string]$EnvironmentUrl,[Parameter(Mandatory)] [string]$AccessToken)
$ErrorActionPreference = 'Stop'
$headers = @{ Authorization = "Bearer $AccessToken"; 'Content-Type' = 'application/json'; Prefer = 'return=representation' }
$body = @{ udcsp_name='Synthetic A8 application'; udcsp_country='dk'; udcsp_applicationtype='residency'; udcsp_traceparent='00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00' } | ConvertTo-Json
$app = Invoke-RestMethod -Method Post -Uri "$EnvironmentUrl/api/data/v9.2/udcsp_applications" -Headers $headers -Body $body
if (-not $app.udcsp_applicationid) { throw 'Application create failed' }
Write-Host 'Created synthetic application; validate BPF active stage and SLA KPI in tenant-specific harness.'
