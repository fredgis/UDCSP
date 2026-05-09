# Defender

`defender-for-cloud.bicep` enables the baseline Microsoft Defender for Cloud plans at subscription scope.

`defender-for-apis.bicep` adds Defender for APIs:

- Enables the `Microsoft.Security/pricings` plan named `Api` with `pricingTier='Standard'`.
- Onboards APIs from an existing Azure API Management instance through `Microsoft.Security/apiCollections`.
- Keeps the APIM instance parameterised via `apimResourceId`; individual API revisions are supplied through `apiIds`.

Deploy at subscription scope after APIM APIs exist.

