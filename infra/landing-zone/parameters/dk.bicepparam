using '../main.bicep'

param country = 'dk'
param env = 'prod'
param location = 'northeurope'
param addressPrefix = '10.10.0.0/16'
param hubVnetId = '' // TODO: case-study scaffold — replace with real values when deploying
