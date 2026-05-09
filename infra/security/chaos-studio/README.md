# Chaos Studio

Chaos Studio experiments validate the architecture's 99.9% citizen-channel SLO claim before production incidents do. The baseline covers:

- `apim-region-failure`
- `postgres-failover`
- `redis-cache-eviction-storm`

Targets include APIM, Container Apps, PostgreSQL, Redis and D365 mock endpoints. Experiments are intended for off-production subscriptions, with blast radius controlled by resource IDs and RBAC.

## CI integration

Run weekly from CI against off-prod after smoke tests:

1. Deploy/update targets and experiments.
2. Start one experiment at a time.
3. Gate on synthetic citizen journey success, APIM availability, queue drain time and restore/failover telemetry.
4. Export results to Log Analytics/Sentinel as ISO 27001 and NIS2 resilience evidence.

## Test

```powershell
.\scripts\Test-ChaosStudio.ps1 -Offline
```

