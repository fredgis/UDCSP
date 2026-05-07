[CmdletBinding()]
param([Parameter(Mandatory)] [string] $SubscriptionId)
$ErrorActionPreference = 'Stop'
az account set --subscription $SubscriptionId
$plans = az security pricing list --query "value[].{name:name,tier:pricingTier}" -o json | ConvertFrom-Json
$policy = az policy state summarize --subscription $SubscriptionId -o json | ConvertFrom-Json
[pscustomobject]@{ DefenderPlans = $plans; PolicySummary = $policy.results }
