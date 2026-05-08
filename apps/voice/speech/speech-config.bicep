@allowed(['dk','se','no'])
param country string
param location string
param sku string = 'S0'

resource speech 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'udcsp-${country}-speech'
  location: location
  kind: 'SpeechServices'
  sku: {
    name: sku
  }
  properties: {
    publicNetworkAccess: 'Disabled'
  }
}

output speechEndpoint string = speech.properties.endpoint
