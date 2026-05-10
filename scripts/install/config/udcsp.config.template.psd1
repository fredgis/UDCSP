@{
    # ----------------------------------------------------------------------
    # UDCSP installer configuration template
    # Copy to udcsp.config.psd1 and fill in your tenant values.
    # NEVER commit udcsp.config.psd1 — it is gitignored.
    # ----------------------------------------------------------------------
    TenantId = '<entra-tenant-guid>'

    Environment = 'dev'   # dev | test | preprod | prod

    Subscriptions = @{
        SharedPlatform = '<sub-guid>'
        DK             = '<sub-guid>'
        SE             = '<sub-guid>'
        NO             = '<sub-guid>'
    }

    Regions = @{
        DK     = 'northeurope'
        SE     = 'swedencentral'
        NO     = 'norwayeast'
        Shared = 'westeurope'
    }

    ExternalIdTenants = @{
        DK = 'udcspdk.onmicrosoft.com'
        SE = 'udcspse.onmicrosoft.com'
        NO = 'udcspno.onmicrosoft.com'
    }

    D365EnvironmentUrls = @{
        DK = 'https://udcspdk.crm4.dynamics.com'
        SE = 'https://udcspse.crm4.dynamics.com'
        NO = 'https://udcspno.crm4.dynamics.com'
    }

    FoundryWorkspace = @{
        Subscription  = '<sub-guid>'
        ResourceGroup = 'udcsp-shared-foundry'
        Name          = 'udcsp-foundry'
        Region        = 'swedencentral'
    }

    PurviewAccount = @{
        Subscription  = '<sub-guid>'
        ResourceGroup = 'udcsp-shared-governance'
        Name          = 'udcsp-purview'
    }

    KeyVaults = @{
        Bootstrap = 'udcsp-bootstrap-kv'
    }

    Tags = @{
        costCenter         = 'UDCSP'
        owner              = 'platform-team'
        dataResidency      = 'EU'
        dataClassification = 'Restricted'
    }

    Languages = @('da','sv','nb','nn','se','en','de','fr','pl','ar','uk','fi')

    # ----------------------------------------------------------------------
    # Post-audit refactor 2026-05-09 — new resources
    # ----------------------------------------------------------------------
    Postgres = @{
        SkuDev    = 'Standard_B2s'
        SkuProd   = 'Standard_D4ds_v5'
        Version   = '16'
        HaProd    = 'ZoneRedundant'
        HaDev     = 'Disabled'
    }

    Redis = @{
        SkuDev  = 'Balanced_B5'
        SkuProd = 'Enterprise_E10'
        Tls     = '1.2'
    }

    VerifiedId = @{
        DidMethod   = 'web'  # 'web' for dev, 'ion' for prod
        IssuerName  = 'udcsp-issuer'
    }

    Priva = @{
        DsrSlaDays            = 30
        DsrComplexExtensionDays = 60
        AuditLogRetentionYears  = 7
    }

    ConfidentialLedger = @{
        Sku    = 'Public'
        Region = 'westeurope'
    }

    ConfidentialCompute = @{
        WorkloadProfile = 'Confidential-Standard-NC8as-T4-v5'
        FallbackProfile = 'D4as_v5'
    }

    Ddos = @{
        PlanLocation = 'westeurope'
    }

    BackupAsr = @{
        VaultStorageType = 'GeoRedundant'  # 'ZoneRedundant' for dev
        SoftDeleteDays   = 14
    }

    ChaosStudio = @{
        WeeklyExperimentEnabled = $true
        ExperimentScope         = 'preprod'  # never 'prod'
    }

    Bastion = @{
        Sku = 'Standard'
    }

    Apim = @{
        PublisherEmail = '<apim-publisher-email@example.org>'
        PublisherName  = 'UDCSP Platform'
    }

    Fabric = @{
        CapacitySku  = 'F64'           # F2 for dev sandbox, F64+ for prod
        WorkspaceIds = @{
            DK = '<workspace-guid-dk>'
            SE = '<workspace-guid-se>'
            NO = '<workspace-guid-no>'
        }
        Token        = '<service-principal-or-managed-identity-token>'
    }

    # ----------------------------------------------------------------------
    # Voice channel (A10) — one block per sovereign country.
    # Read by scripts/install/modules/Install-Voice.psm1; field names match
    # the parameters of apps/voice/scripts/Deploy-Voice.ps1 (camelCase here,
    # PascalCase on the .ps1 — psd1 keys are case-insensitive).
    # Replace placeholders with values produced by the prerequisite phases
    # (LandingZone → Container Apps env, Identity → UAMI, Foundry → Azure
    # OpenAI, Apim → APIM base URL, Observability → App Insights, D365 →
    # transfer/queue ids).
    # ----------------------------------------------------------------------
    Voice = @{
        dk = @{
            env                          = 'dev'
            resourceGroup                = 'udcsp-dk-voice'
            location                     = 'northeurope'
            containerAppsEnvironmentId   = '<aca-env-resource-id>'
            userAssignedIdentityId       = '<uami-resource-id>'
            image                        = '<acr-name>.azurecr.io/udcsp/voice-orchestrator:latest'
            azureOpenAiAccountName       = 'udcsp-dk-aoai'
            azureOpenAiEndpoint          = 'https://udcsp-dk-aoai.openai.azure.com/'
            apimBaseUrl                  = 'https://api.udcsp.dk'
            cognitiveServicesEndpoint    = 'https://udcsp-dk-speech.cognitiveservices.azure.com/'
            acsConnectionStringSecretUri = 'https://udcsp-dk-kv.vault.azure.net/secrets/acs-connection-string'
            voiceClientSecretUri         = 'https://udcsp-dk-kv.vault.azure.net/secrets/voice-client-secret'
            voiceClientId                = '<voice-app-client-id>'
            appInsightsConnectionString  = '<appinsights-connection-string>'
            publicHostname               = 'voice-dk.udcsp.dk'
            d365TransferTargetId         = '<d365-transfer-target-guid>'
            d365VoiceQueueId             = '<d365-voice-queue-guid>'
            deadLetterStorageAccountId   = '<storage-account-resource-id>'
            acsResourceName              = 'udcsp-dk-acs'
        }
        se = @{
            env                          = 'dev'
            resourceGroup                = 'udcsp-se-voice'
            location                     = 'swedencentral'
            containerAppsEnvironmentId   = '<aca-env-resource-id>'
            userAssignedIdentityId       = '<uami-resource-id>'
            image                        = '<acr-name>.azurecr.io/udcsp/voice-orchestrator:latest'
            azureOpenAiAccountName       = 'udcsp-se-aoai'
            azureOpenAiEndpoint          = 'https://udcsp-se-aoai.openai.azure.com/'
            apimBaseUrl                  = 'https://api.udcsp.se'
            cognitiveServicesEndpoint    = 'https://udcsp-se-speech.cognitiveservices.azure.com/'
            acsConnectionStringSecretUri = 'https://udcsp-se-kv.vault.azure.net/secrets/acs-connection-string'
            voiceClientSecretUri         = 'https://udcsp-se-kv.vault.azure.net/secrets/voice-client-secret'
            voiceClientId                = '<voice-app-client-id>'
            appInsightsConnectionString  = '<appinsights-connection-string>'
            publicHostname               = 'voice-se.udcsp.se'
            d365TransferTargetId         = '<d365-transfer-target-guid>'
            d365VoiceQueueId             = '<d365-voice-queue-guid>'
            deadLetterStorageAccountId   = '<storage-account-resource-id>'
            acsResourceName              = 'udcsp-se-acs'
        }
        no = @{
            env                          = 'dev'
            resourceGroup                = 'udcsp-no-voice'
            location                     = 'norwayeast'
            containerAppsEnvironmentId   = '<aca-env-resource-id>'
            userAssignedIdentityId       = '<uami-resource-id>'
            image                        = '<acr-name>.azurecr.io/udcsp/voice-orchestrator:latest'
            azureOpenAiAccountName       = 'udcsp-no-aoai'
            azureOpenAiEndpoint          = 'https://udcsp-no-aoai.openai.azure.com/'
            apimBaseUrl                  = 'https://api.udcsp.no'
            cognitiveServicesEndpoint    = 'https://udcsp-no-speech.cognitiveservices.azure.com/'
            acsConnectionStringSecretUri = 'https://udcsp-no-kv.vault.azure.net/secrets/acs-connection-string'
            voiceClientSecretUri         = 'https://udcsp-no-kv.vault.azure.net/secrets/voice-client-secret'
            voiceClientId                = '<voice-app-client-id>'
            appInsightsConnectionString  = '<appinsights-connection-string>'
            publicHostname               = 'voice-no.udcsp.no'
            d365TransferTargetId         = '<d365-transfer-target-guid>'
            d365VoiceQueueId             = '<d365-voice-queue-guid>'
            deadLetterStorageAccountId   = '<storage-account-resource-id>'
            acsResourceName              = 'udcsp-no-acs'
        }
    }
}
