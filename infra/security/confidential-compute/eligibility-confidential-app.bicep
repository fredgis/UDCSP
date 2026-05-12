// name: eligibility-confidential-app | owner agent: A3 | purpose: TEE wrapper for Foundry Eligibility inference calls

targetScope = 'resourceGroup'

param appName string = 'udcsp-eligibility-tee'
param location string = resourceGroup().location
param managedEnvironmentId string
param workloadProfileName string = 'Consumption'
param image string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
@secure()
param foundryEndpoint string = ''
param tags object = {
  purpose: 'eligibility-tee'
  costCenter: 'UDCSP'
  owner: 'A3'
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: managedEnvironmentId
    workloadProfileName: workloadProfileName
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 8080
        transport: 'auto'
      }
      secrets: empty(foundryEndpoint) ? [] : [
        {
          name: 'foundry-endpoint'
          value: foundryEndpoint
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'eligibility-tee'
          image: image
          env: empty(foundryEndpoint) ? [
            {
              name: 'REQUIRE_ATTESTATION'
              value: 'true'
            }
          ] : [
            {
              name: 'FOUNDRY_ENDPOINT'
              secretRef: 'foundry-endpoint'
            }
            {
              name: 'REQUIRE_ATTESTATION'
              value: 'true'
            }
          ]
          resources: {
            cpu: json('2.0')
            memory: '4Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

output appId string = app.id
output principalId string = app.identity.principalId
output latestRevisionFqdn string = app.properties.latestRevisionFqdn

