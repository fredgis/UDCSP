# DSR erasure runbook

## Trigger

Microsoft Priva creates or validates an Article 17 erasure request and delegates technical erasure to `gdpr-data-erase` with the `priva-request-id` header.

## Steps

1. Confirm the Priva request is assigned to the country DPO queue from the citizen country claim.
2. Verify identity assurance evidence is attached to the Priva case.
3. Run the retention-hold check before any destructive action.
4. Apply archive-law hold flow where required:
   - Denmark: Arkivloven DK; route held case files through the existing `services/logic-apps/workflows/archive-handover-dk/` process when operational retention ends.
   - Sweden: Arkivlagen SE; route held case files through `services/logic-apps/workflows/archive-handover-se/` when eligible.
   - Norway: Arkivlova NO; route held case files through `services/logic-apps/workflows/archive-handover-no/` when eligible.
5. Delegate technical cleanup to the Logic App for PostgreSQL drafts, Redis sessions, ADLS Gen2 tombstones, Dataverse, Fabric gold records and App Insights pseudonymisation.
6. Confirm Purview lineage receives the completion event.
7. Let Priva send citizen communications and DPA-ready evidence; do not send separate legacy citizen notices when `priva-request-id` is present.

## Exceptions

If a statutory hold blocks physical erasure, record the legal basis, affected dataset, release date and DPO approval in Priva.
