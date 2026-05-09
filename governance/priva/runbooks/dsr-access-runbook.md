# DSR access runbook

1. Intake and identity verification are managed in Microsoft Priva.
2. Confirm request type is Article 15 access and the country DPO owner is assigned.
3. Use Purview classifications to scope Dataverse, PostgreSQL, ADLS Gen2 and Fabric gold-layer discovery.
4. Delegate platform extraction to `gdpr-data-export` with `priva-request-id`.
5. Review export package for third-party data, statutory restrictions and security redactions.
6. Approve release in Priva and let Priva issue the completion notice.
7. Retain the Priva audit package for seven years.
