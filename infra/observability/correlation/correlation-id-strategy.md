# Correlation ID Strategy

UDCSP uses W3C Trace Context (`traceparent`, `tracestate`) end-to-end. Channel apps create or preserve `traceparent`; APIM validates it and copies the trace ID to `x-correlation-id` for services that do not yet support W3C natively.

Flow: channels → APIM → Logic Apps → Foundry → D365 → Fabric. Logic Apps stores the value in workflow run tracked properties; Foundry tool calls receive it as metadata; D365 plugins persist it on the case; Fabric ingestion keeps it as a fact-table key.

Logs must include `country`, `env`, `workload`, `citizenJourney`, and `correlationId`. Alerts and workbooks join on this value to prove a single request path across sovereign zones without copying raw PII.
