# DSR portability runbook

1. Validate that the request is an Article 20 portability request in Priva.
2. Collect structured records from Dataverse, PostgreSQL and Fabric gold-layer tables.
3. Package machine-readable exports as JSON by default and XML when the citizen or receiving controller requests XML.
4. Include schema metadata, field descriptions, extraction timestamp and controller identity.
5. Exclude bronze-layer transient data and security telemetry that is not provided under portability.
6. Store the export package in the Priva-controlled evidence location and issue a time-limited download link.
7. Record completion and any lawful exclusions in Priva.
