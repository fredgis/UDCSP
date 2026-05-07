@allowed(['dk','se','no'])
param country string
@allowed(['dev','test','prod'])
param env string
param location string = resourceGroup().location
@secure()
param logicAppWebhookEndpoint string

var tags = {
  country: country
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential'
  owner: 'A7'
}

resource topic 'Microsoft.EventGrid/topics@2023-12-15-preview' = {
  name: 'udcsp-${country}-${env}-domain-events'
  location: location
  tags: tags
}

resource sub 'Microsoft.EventGrid/eventSubscriptions@2023-12-15-preview' = {
  name: 'udcsp-${country}-${env}-logic-sub'
  scope: topic
  properties: {
    destination: {
      endpointType: 'WebHook'
      properties: { endpointUrl: logicAppWebhookEndpoint }
    }
    filter: {
      includedEventTypes: [
        'CitizenApplicationSubmitted'
        'EligibilityAssessed'
        'CaseDecided'
        'AccessRequestCompleted'
        'ContentSafetyHit'
      ]
    }
  }
}

output topicEndpoint string = topic.properties.endpoint

