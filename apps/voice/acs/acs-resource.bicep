@allowed(['dk','se','no'])
param country string
param location string
param tags object = {}

resource acs 'Microsoft.Communication/communicationServices@2023-04-01-preview' = {
  name: 'udcsp-${country}-acs'
  location: 'Global'
  tags: tags
  properties: {
    dataLocation: location
  }
}

output acsId string = acs.id
