// name: phone-numbers | owner agent: A8 | purpose: per-country PSTN number procurement scaffold for the voice channel
//
// docs/biz/voice.md commits to a real toll-free or geographic number per
// country (DK / SE / NO). PSTN numbers cannot be provisioned purely from
// IaC: Microsoft requires a regulatory documentation package (entity proof,
// local presence, intended use) before a number is released. This module
// therefore captures the *intent* declaratively — capability profile, area
// hint, country-pinned ACS resource — and writes the requested-number record
// into a config map that the operator picks up post-procurement to update
// the ACS Communications Service via Microsoft Graph (Communications API)
// or the ACS Number Management portal.
//
// The output `phoneNumberConfig` is consumed by:
//   - apps/voice/acs/acs-resource.bicep (number-to-resource binding)
//   - apps/voice/ivr/<lang>/*.yaml (which announces the number)
//   - infra/observability (number-keyed dashboards)

@allowed([ 'dk', 'se', 'no' ])
@description('Country in which the PSTN number is procured.')
param country string

@allowed([ 'tollFree', 'geographic' ])
@description('Number type. tollFree = 0800-style; geographic = local area code.')
param numberType string = 'tollFree'

@description('Country-localised area-code hint passed to the procurement workflow when numberType = geographic. Ignored otherwise.')
param geographicAreaCodeHint string = ''

@description('Name of the existing ACS resource that should own the procured number (deployed in the same country region).')
param acsResourceName string

@description('Placeholder until the regulatory pack is approved. Use empty string while pending; the post-procurement script substitutes the real E.164 number.')
param assignedNumber string = ''

var countryCode = country == 'dk' ? '+45' : country == 'se' ? '+46' : '+47'

var capabilities = {
  inboundCalling:  true
  outboundCalling: true
  inboundSms:      true
  outboundSms:     true
}

var phoneNumberConfig = {
  country:          country
  countryCode:      countryCode
  numberType:       numberType
  areaCodeHint:     geographicAreaCodeHint
  acsResourceName:  acsResourceName
  capabilities:     capabilities
  assignedNumber:   assignedNumber
  status:           empty(assignedNumber) ? 'pending-regulatory-approval' : 'assigned'
  recordingDisclosurePath: '../recording-consent/recording-disclosure.md'
  ivrEntryPath:     '../ivr/${country == 'dk' ? 'da' : country == 'se' ? 'sv' : 'nb'}/main-menu.yaml'
}

output phoneNumberConfig object = phoneNumberConfig
output procurementChecklist array = [
  'Submit ACS regulatory documentation pack for ${country} via the Azure portal (Communication Services > Phone numbers > Get).'
  'Provide UDCSP entity proof (local registration), intended-use statement (regalian citizen-services voice channel), and a real address in ${country}.'
  'Once the request is approved, update the parameter file with assignedNumber and rerun this Bicep so the output flips to status = assigned.'
  'Run apps/voice/scripts/Bind-AcsNumber.ps1 to bind the number to the ACS resource and to the country IVR entry point.'
  'Notify governance/purview/data-sources/ACS-PhoneNumbers.json with the new E.164 entry so Purview lineage picks it up.'
]

