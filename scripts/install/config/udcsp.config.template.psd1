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
}
