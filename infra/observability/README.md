# UDCSP Observability (A5)

## Purpose
Per-country Azure Monitor baseline: Log Analytics, Application Insights, DCRs, workbooks, alerts, and W3C trace-context correlation strategy.

## Deploy
Deploy `log-analytics.bicep` per country, then `app-insights.bicep` per workload and import DCR/workbook/alert JSON with Azure Monitor APIs.

## Test
```powershell
.\scripts\Test-Observability.ps1 -BaseUrl https://example.contoso -CorrelationId (New-Guid)
```

## Tear-down
Disable alert rules/action groups, remove App Insights instances, then delete country Log Analytics workspaces after retention/export obligations are met.

## Owner
A5 — Observability.
