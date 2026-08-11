# Observability workbooks

Three Azure Monitor workbooks per country (DK · SE · NO), deployed onto the
per-country Application Insights instance:

| File | What it shows |
|---|---|
| `platform-health.json` | Request volume, p50/p95/p99 latency, dependency success and failure, exceptions, Azure OpenAI tokens by model deployment |
| `citizen-journey-funnel.json` | The funnel through the case-open path, activity per language, channel mix |
| `ai-decision-traces.json` | Every AI verdict with confidence, decision, locale, channel, agent, and an `operation_Id` that drills to Transaction Search |

## Before you deploy: substitute `<SUBSCRIPTION_ID>`

These definitions contain cross-resource KQL of the form:

```kusto
workspace("/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/udcsp-no-observability-rg/providers/Microsoft.OperationalInsights/workspaces/udcsp-no-prod-law")
```

The subscription id is a placeholder on purpose: a real one does not belong in a
public repository. Replace it at deploy time with the target subscription.

```powershell
$sub = (az account show --query id -o tsv)
Get-ChildItem *.json | ForEach-Object {
    (Get-Content $_.FullName -Raw).Replace('<SUBSCRIPTION_ID>', $sub) |
        Set-Content "$($_.BaseName).deploy.json" -NoNewline -Encoding utf8
}
```

Then PUT the substituted file. Do not commit the `*.deploy.json` output.

## Deployment note

These workbooks are applied by direct ARM PUT rather than by the installer,
because the `application-insights` az extension (1.2.3) silently drops
`--kind shared`. See `docs/tech/monitoring.md` for the current per-country
population state: the Norwegian instance receives live data, Denmark and Sweden
stay empty by design until a country-specific orchestrator or browser
instrumentation exists.
