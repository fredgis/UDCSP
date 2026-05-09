// name: event-grid-incoming-call | owner agent: A10 | purpose: subscribes the voice orchestrator to ACS Microsoft.Communication.IncomingCall events.
//
// Without this subscription the orchestrator never receives a call.
// One subscription per country, scoped to the country ACS resource, with
// dead-lettering to the country-pinned diagnostics storage account so
// undeliverable IncomingCall events are not silently lost.
//
// EventGrid → POST https://{orchestratorFqdn}/api/acs/eventgrid

@description('Name of the country ACS resource (e.g. udcsp-no-acs).')
param acsResourceName string

@description('FQDN of the voice orchestrator Container App, used to build the webhook URL.')
param orchestratorFqdn string

@description('Resource ID of the diagnostics storage account holding the dead-letter container.')
param deadLetterStorageAccountId string

@description('Container name in the dead-letter storage account.')
param deadLetterContainerName string = 'voice-deadletter'

@description('Subscription name suffix; defaults to incoming-call.')
param subscriptionName string = 'incoming-call'

resource acs 'Microsoft.Communication/communicationServices@2023-04-01' existing = {
  name: acsResourceName
}

resource subscription 'Microsoft.EventGrid/eventSubscriptions@2024-12-15-preview' = {
  name: '${acsResourceName}-${subscriptionName}'
  scope: acs
  properties: {
    destination: {
      endpointType: 'WebHook'
      properties: {
        #disable-next-line use-secure-value-for-secure-inputs
        endpointUrl: 'https://${orchestratorFqdn}/api/acs/eventgrid'
        maxEventsPerBatch: 1
        preferredBatchSizeInKilobytes: 64
      }
    }
    filter: {
      includedEventTypes: [
        'Microsoft.Communication.IncomingCall'
      ]
      enableAdvancedFilteringOnArrays: true
    }
    eventDeliverySchema: 'EventGridSchema'
    retryPolicy: {
      maxDeliveryAttempts: 30
      eventTimeToLiveInMinutes: 1440
    }
    deadLetterDestination: {
      endpointType: 'StorageBlob'
      properties: {
        resourceId: deadLetterStorageAccountId
        blobContainerName: deadLetterContainerName
      }
    }
  }
}

output subscriptionName string = subscription.name
