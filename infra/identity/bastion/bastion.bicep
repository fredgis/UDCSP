// name: bastion | owner agent: SA-3 | purpose: country-scoped Azure Bastion Standard host without jump-box public IPs
// One country per deployment — the installer (Install-Bastion.psm1) loops over DK/SE/NO and calls this template once per country in the right RG/sub/region.

targetScope = 'resourceGroup'

@description('Country code (lowercase): dk | se | no.')
@allowed(['dk', 'se', 'no'])
param country string

@description('Existing VNet name in this resource group (created by LandingZone).')
param vnetName string = 'udcsp-${country}-prod-vnet'

@description('CIDR for the AzureBastionSubnet (must be /26 or larger and inside the VNet address space).')
param bastionSubnetPrefix string = country == 'dk' ? '10.10.250.0/26' : country == 'se' ? '10.20.250.0/26' : '10.30.250.0/26'

@description('Optional NSG to attach to AzureBastionSubnet. Leave empty for the Azure-managed default rules.')
param bastionNsgId string = ''

@description('Deployment region.')
param location string = resourceGroup().location

@description('Deployment environment name.')
param env string = 'prod'

@description('Common tags applied to Bastion resources.')
param tags object = {
  workload: 'identity'
  capability: 'bastion'
  sovereigntyPolicy: 'bastion-public-ip-only'
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' existing = {
  name: vnetName
}

resource publicIp 'Microsoft.Network/publicIPAddresses@2023-09-01' = {
  name: 'udcsp-${country}-${env}-bastion-pip'
  location: location
  tags: union(tags, {
    country: country
    publicIpException: 'azure-bastion-only'
  })
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
  }
}

resource bastionSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' = {
  parent: vnet
  name: 'AzureBastionSubnet'
  properties: {
    addressPrefix: bastionSubnetPrefix
    networkSecurityGroup: empty(bastionNsgId) ? null : {
      id: bastionNsgId
    }
  }
}

resource bastion 'Microsoft.Network/bastionHosts@2023-09-01' = {
  name: 'udcsp-${country}-${env}-bastion'
  location: location
  tags: union(tags, {
    country: country
  })
  sku: {
    name: 'Standard'
  }
  properties: {
    enableIpConnect: true
    enableTunneling: true
    ipConfigurations: [
      {
        name: 'bastion-ipconfig'
        properties: {
          subnet: {
            id: bastionSubnet.id
          }
          publicIPAddress: {
            id: publicIp.id
          }
        }
      }
    ]
  }
}

output bastionHostId string = bastion.id
output bastionPublicIpId string = publicIp.id
