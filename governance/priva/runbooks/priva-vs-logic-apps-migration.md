# Priva vs Logic Apps migration

## Target model

Microsoft Priva is the primary DSR orchestrator for intake, identity evidence, SLA clocks, DPA reporting, citizen communications and regulator-ready evidence. Logic Apps become technical sub-processors for UDCSP-specific export and erasure operations.

## Transitional side-by-side period

During migration, both paths remain available:

- Requests with `priva-request-id` are Priva-owned. Logic Apps execute delegated technical tasks only and skip citizen communications where Priva owns them.
- Requests without `priva-request-id` follow the legacy Logic Apps flow for backward compatibility.

## Migration controls

1. Enable Priva policies and route country DPO queues.
2. Validate Purview classifications cover each RoPA activity.
3. Smoke-test the Logic Apps delegation headers.
4. Reconcile Priva evidence packs against Logic App audit records weekly.
5. Retire direct legacy intake only after DPO sign-off and two clean reporting cycles.
