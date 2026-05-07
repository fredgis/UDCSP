# UDCSP Dynamics 365 Customer Service (A8)

## Purpose
Unmanaged D365 solution skeletons for shared application case tables, BPF, queues, SLAs, Copilot for Service, Power Automate, and Dataverse-to-Fabric mirroring.

## Deploy
Run `scripts\Deploy-D365.ps1 -EnvironmentUrl <url> -SolutionPath solutions\UDCSP_Core` after `pac auth create`.

## Test
Run `scripts\Test-D365.ps1 -EnvironmentUrl <url> -AccessToken <token>` to create a synthetic application and validate BPF/SLA wiring.

## Tear-down
Delete imported unmanaged solutions or reset the sandbox environment.

## Owner
A8 Case Management.
