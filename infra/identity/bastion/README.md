# Azure Bastion for sovereign administration

`bastion.bicep` deploys one Standard Azure Bastion host per country VNet. Bastion is the only permitted public IP exception for sovereign administration; VMs and jump boxes remain private and are reached through Azure Bastion IP-based connection or native client tunneling.

## Access pattern

1. Caseworkers and administrators activate privileged roles through Microsoft Entra PIM.
2. Conditional Access verifies compliant device and strong authentication.
3. The operator connects through the country Bastion host to private RDP/SSH endpoints.
4. Session activity is logged through Azure control-plane telemetry and host audit logs.

`nsg-bastion.bicep` contains the Azure Bastion subnet rules: HTTPS from Internet, GatewayManager control traffic including 4443, Azure Load Balancer probes, Bastion host communication and private SSH/RDP outbound only to the VNet.

Run `scripts/Test-Bastion.ps1 -Offline` to validate local assets without Azure access.
