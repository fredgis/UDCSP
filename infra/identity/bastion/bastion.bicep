// name: bastion | owner agent: SA-3 | purpose: country-scoped Azure Bastion Standard hosts without jump-box public IPs

targetScope = 'resourceGroup'

@description('Three country VNet definitions. Each VNet receives one Standard Azure Bastion host.')
param countries array = [
  {
    country: 'dk'
    location: 'northeurope'
    vnetName: 'udcsp-dk-prod-vnet'
    bastionSubnetPrefix: '10.10.250.0/26'
    bastionNsgId: ''
  }
  {
    country: 'se'
    location: 'swedencentral'
    vnetName: 'udcsp-se-prod-vnet'
    bastionSubnetPrefix: '10.20.250.0/26'
    bastionNsgId: ''
  }
  {
    country: 'no'
    location: 'norwayeast'
    vnetName: 'udcsp-no-prod-vnet'
    bastionSubnetPrefix: '10.30.250.0/26'
    bastionNsgId: ''
  }
]

@description('Deployment environment name.')
param env string = 'prod'

@description('Common tags applied to Bastion resources.')
param tags object = {
  workload: 'identity'
  capability: 'bastion'
  sovereigntyPolicy: 'bastion-public-ip-only'
}

resource vnets 'Microsoft.Network/virtualNetworks@2023-09-01' existing = [for country in countries: {
  name: country.vnetName
}]

resource publicIps 'Microsoft.Network/publicIPAddresses@2023-09-01' = [for country in countries: {
  name: 'udcsp-${country.country}-${env}-bastion-pip'
  location: country.location
  tags: union(tags, {
    country: country.country
    publicIpException: 'azure-bastion-only'
  })
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
  }
}]

resource bastionSubnets 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' = [for (country, i) in countries: {
  parent: vnets[i]
  name: 'AzureBastionSubnet'
  properties: {
    addressPrefix: country.bastionSubnetPrefix
    networkSecurityGroup: empty(country.bastionNsgId) ? null : {
      id: country.bastionNsgId
    }
  }
}]

resource bastions 'Microsoft.Network/bastionHosts@2023-09-01' = [for (country, i) in countries: {
  name: 'udcsp-${country.country}-${env}-bastion'
  location: country.location
  tags: union(tags, {
    country: country.country
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
            id: bastionSubnets[i].id
          }
          publicIPAddress: {
            id: publicIps[i].id
          }
        }
      }
    ]
  }
}]

output bastionHostIds array = [for (country, i) in countries: bastions[i].id]
output bastionPublicIpIds array = [for (country, i) in countries: publicIps[i].id]
