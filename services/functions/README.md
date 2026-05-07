# UDCSP Functions and Container Apps (A7)

## Purpose
Integration compute for document virus scanning, trace-context enrichment, and deterministic eligibility rules used alongside the Foundry eligibility agent.

## Deploy
Deploy `functions.bicep` after agent-platform supplies Container Apps environment, storage, Key Vault, and managed identity permissions.

## Test
Post synthetic Event Grid/HTTP payloads to function endpoints; run the Container App image locally for `/evaluate` rules checks.

## Tear-down
Delete the function apps and container app deployment stack.

## Owner
A7 Integration & Workflow.
