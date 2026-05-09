# DDoS Protection

This module creates one dedicated Azure DDoS Protection Plan in the shared `westeurope` hub and associates it with the DK, SE and NO VNets.

Front Door protects HTTP(S) traffic at layer 7, but it does not replace dedicated layer 3/4 protection for volumetric TCP/UDP floods, reflection attacks and attacks against private or regional endpoints. UDCSP is a public-service platform for 2.1M citizens, so NIS2-aligned resilience expectations require network-layer mitigation, telemetry and incident evidence in addition to application-layer WAF controls.

`vnet-association.bicep` intentionally requires the existing VNet address space and subnet array. Azure VNets are updated by PUT, so callers must pass the current landing-zone VNet shape to avoid drift while enabling DDoS.

## Test

```powershell
.\scripts\Test-Ddos.ps1 -Offline
```

