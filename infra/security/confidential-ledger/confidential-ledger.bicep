// name: confidential-ledger | owner agent: A3 | purpose: EU AI Act immutable eligibility inference registry

targetScope = 'resourceGroup'

param ledgerName string = 'udcsp-ai-act-ledger'
param location string = 'westeurope'
param logAnalyticsWorkspaceId string
param writerPrincipalIds array = []
param auditorReaderPrincipalIds array = []

var tags = {
  purpose: 'ai-act-registry'
  costCenter: 'UDCSP'
  owner: 'A3'
}

var writerPrincipals = [for principalId in writerPrincipalIds: {
  principalId: principalId
  tenantId: tenant().tenantId
  ledgerRoleName: 'Contributor'
}]

var readerPrincipals = [for principalId in auditorReaderPrincipalIds: {
  principalId: principalId
  tenantId: tenant().tenantId
  ledgerRoleName: 'Reader'
}]

resource ledger 'Microsoft.ConfidentialLedger/ledgers@2023-06-28-preview' = {
  name: ledgerName
  location: location
  tags: tags
  properties: {
    ledgerType: 'Public'
    ledgerSku: 'Standard'
    aadBasedSecurityPrincipals: concat(writerPrincipals, readerPrincipals)
    certBasedSecurityPrincipals: []
  }
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-log-analytics'
  scope: ledger
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'ApplicationLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output ledgerId string = ledger.id
output ledgerUri string = ledger.properties.ledgerUri
output identityServiceUri string = ledger.properties.identityServiceUri

