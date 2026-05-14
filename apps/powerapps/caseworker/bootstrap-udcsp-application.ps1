# Provision the udcsp_application custom table in a Dataverse environment
# via the Dataverse Web API. This is the one-shot alternative to clicking
# 30+ columns in make.powerapps.com.
#
# Auth: uses Az CLI's cached token (you must `az login` first and have
# Dataverse user role granted to your account in the target env).
#
# Idempotent: if the table already exists, it skips creation; if a column
# already exists, it skips that column.
#
# Usage:
#   az login
#   .\bootstrap-udcsp-application.ps1 -EnvUrl https://org939d8f07.crm4.dynamics.com
#
# After this runs successfully:
#   1. Open https://make.powerapps.com -> the env -> Tables -> udcsp_application
#   2. New -> Model-driven app -> "UDCSP Caseworker", attach udcsp_application
#   3. Publish -> bookmark the /main.aspx?appid=<GUID> URL
#
# Picklist columns (country, applicationtype, status, decisionoutcome) are
# created as String here for simplicity — convert to Choice in Maker after
# the table exists if you want validation. The SPA already sends string
# values that match the future option labels.

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)] [string] $EnvUrl,
  [string] $SchemaPrefix = 'udcsp',
  [string] $PublisherPrefix = 'udcsp'
)

$ErrorActionPreference = 'Stop'

# ---------- Auth ------------------------------------------------------------
Write-Host "==> Acquiring Dataverse access token via Az CLI"
$tokenJson = az account get-access-token --resource $EnvUrl --output json 2>$null
if (-not $tokenJson) {
  throw "az account get-access-token failed. Run 'az login' first."
}
$token = ($tokenJson | ConvertFrom-Json).accessToken
$headers = @{
  'Authorization'    = "Bearer $token"
  'Accept'           = 'application/json'
  'Content-Type'     = 'application/json; charset=utf-8'
  'OData-MaxVersion' = '4.0'
  'OData-Version'    = '4.0'
}
$ApiBase = "$EnvUrl/api/data/v9.2"

# ---------- Helpers ---------------------------------------------------------
function Invoke-Dv {
  param([string]$Method, [string]$Path, [object]$Body)
  $url = "$ApiBase/$Path"
  $params = @{
    Uri = $url; Method = $Method; Headers = $headers; ErrorAction = 'Stop'
  }
  if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
  try {
    return Invoke-RestMethod @params
  } catch {
    $msg = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $msg = $_.ErrorDetails.Message }
    throw "Dataverse $Method $Path failed: $msg"
  }
}

function Test-EntityExists {
  param([string]$LogicalName)
  try {
    $r = Invoke-Dv GET "EntityDefinitions(LogicalName='$LogicalName')?`$select=LogicalName"
    return $true
  } catch { return $false }
}

function Test-AttributeExists {
  param([string]$EntityLogicalName, [string]$AttrLogicalName)
  try {
    $r = Invoke-Dv GET "EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes(LogicalName='$AttrLogicalName')?`$select=LogicalName"
    return $true
  } catch { return $false }
}

# ---------- 1. Create the table --------------------------------------------
$entityLogical = "${SchemaPrefix}_application"
$entitySchema  = "${SchemaPrefix}_application"

if (Test-EntityExists $entityLogical) {
  Write-Host "==> Entity $entityLogical already exists, skipping creation"
} else {
  Write-Host "==> Creating entity $entityLogical"
  $entityBody = @{
    '@odata.type'                 = 'Microsoft.Dynamics.CRM.EntityMetadata'
    SchemaName                    = $entitySchema
    DisplayName                   = @{ LocalizedLabels = @(@{ Label='Citizen Application'; LanguageCode=1033 }) }
    DisplayCollectionName         = @{ LocalizedLabels = @(@{ Label='Citizen Applications'; LanguageCode=1033 }) }
    Description                   = @{ LocalizedLabels = @(@{ Label='Citizen application case backing every UDCSP flow'; LanguageCode=1033 }) }
    OwnershipType                 = 'UserOwned'
    HasActivities                 = $false
    HasNotes                      = $true
    IsActivity                    = $false
    Attributes                    = @(
      @{
        '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
        SchemaName    = "${SchemaPrefix}_name"
        IsPrimaryName = $true
        RequiredLevel = @{ Value='ApplicationRequired' }
        MaxLength     = 200
        FormatName    = @{ Value='Text' }
        DisplayName   = @{ LocalizedLabels = @(@{ Label='Case title'; LanguageCode=1033 }) }
      }
    )
  }
  Invoke-Dv POST 'EntityDefinitions' $entityBody | Out-Null
  Write-Host "    created."
  Start-Sleep -Seconds 4
}

# ---------- 2. Add columns --------------------------------------------------
# Schema: name -> [type, options]
#   String  : @{ MaxLength = 200 }
#   Memo    : @{ MaxLength = 4000 }
#   DateTime: @{ Format = 'DateAndTime' }
#   Decimal : @{ Precision = 2; MinValue = 0; MaxValue = 99999999 }
#   Integer : @{ MinValue = 0; MaxValue = 999999 }
#   Boolean : @{}
$columns = @(
  @{ name='country';                type='String';   max=10;   label='Origin country' },
  @{ name='destinationcountry';     type='String';   max=10;   label='Destination country' },
  @{ name='applicationtype';        type='String';   max=40;   label='Application type' },
  @{ name='status';                 type='String';   max=40;   label='Status' },
  @{ name='crossborder';            type='Boolean';            label='Cross-border' },
  @{ name='correlationid';          type='String';   max=80;   label='Correlation Id' },
  @{ name='traceparent';            type='String';   max=120;  label='Traceparent' },
  @{ name='aiactregistryid';        type='String';   max=80;   label='AI Act registry Id' },

  @{ name='citizenid';              type='String';   max=80;   label='Citizen Id (masked)' },
  @{ name='citizenupn';             type='String';   max=200;  label='Citizen UPN' },
  @{ name='citizengivenname';       type='String';   max=80;   label='Citizen given name' },
  @{ name='citizenfamilyname';      type='String';   max=80;   label='Citizen family name' },
  @{ name='citizenlanguage';        type='String';   max=10;   label='Citizen language' },
  @{ name='citizenemail';           type='String';   max=200;  label='Citizen email' },

  @{ name='movedate';               type='DateTime';           label='Move date' },
  @{ name='destinationaddress';     type='String';   max=400;  label='Destination address' },
  @{ name='dependents';             type='Integer';            label='Dependents' },
  @{ name='employername';           type='String';   max=200;  label='Employer name' },
  @{ name='employercountry';        type='String';   max=10;   label='Employer country' },
  @{ name='passportref';            type='String';   max=80;   label='Passport ref' },

  @{ name='children';               type='Integer';            label='Children' },
  @{ name='childrennames';          type='Memo';               label='Children names' },
  @{ name='youngestdob';            type='DateTime';           label='Youngest DOB' },
  @{ name='monthlyincomeeur';       type='Decimal';            label='Monthly income (EUR)' },
  @{ name='adultsinhousehold';      type='Integer';            label='Adults in household' },
  @{ name='residence';              type='String';   max=40;   label='Residence' },

  @{ name='documentbloburl';        type='String';   max=500;  label='Document blob URL' },
  @{ name='documentblobname';       type='String';   max=200;  label='Document blob name' },
  @{ name='storageaccount';         type='String';   max=120;  label='Storage account' },
  @{ name='extractedfieldsjson';    type='Memo';               label='Extracted fields (JSON)' },
  @{ name='documentsummary';        type='Memo';               label='Document summary' },

  @{ name='aidecision';             type='String';   max=40;   label='AI decision' },
  @{ name='aiconfidence';           type='Decimal';            label='AI confidence' },
  @{ name='aireasoning';            type='Memo';               label='AI reasoning' },
  @{ name='estimateddecisiondate';  type='DateTime';           label='Estimated decision date' },
  @{ name='workflowstepsjson';      type='Memo';               label='Workflow steps (JSON)' },

  @{ name='claimsenvelope';         type='String';   max=120;  label='Claims envelope' },
  @{ name='purviewlabel';           type='String';   max=120;  label='Purview label' },

  @{ name='consentcrossborder';     type='DateTime';           label='Consent cross-border' },
  @{ name='consentclaimsmediation'; type='DateTime';           label='Consent claims mediation' },
  @{ name='consentnotifications';   type='DateTime';           label='Consent notifications' },
  @{ name='consentaiassistant';     type='DateTime';           label='Consent AI assistant' },

  @{ name='caseworkernotes';        type='Memo';               label='Caseworker notes' },
  @{ name='decisionmadeon';         type='DateTime';           label='Decision made on' },
  @{ name='decisionoutcome';        type='String';   max=40;   label='Decision outcome' }
)

foreach ($c in $columns) {
  $logical = "${SchemaPrefix}_$($c.name)"
  $schema  = "${SchemaPrefix}_$($c.name)"
  if (Test-AttributeExists $entityLogical $logical) {
    Write-Host "    [skip] $logical already exists"
    continue
  }
  $attr = switch ($c.type) {
    'String'   { @{ '@odata.type'='Microsoft.Dynamics.CRM.StringAttributeMetadata';   SchemaName=$schema; MaxLength=$c.max; FormatName=@{Value='Text'};       DisplayName=@{LocalizedLabels=@(@{Label=$c.label;LanguageCode=1033})}; RequiredLevel=@{Value='None'} } }
    'Memo'    { @{ '@odata.type'='Microsoft.Dynamics.CRM.MemoAttributeMetadata';     SchemaName=$schema; MaxLength=4000;   Format='TextArea';                  DisplayName=@{LocalizedLabels=@(@{Label=$c.label;LanguageCode=1033})}; RequiredLevel=@{Value='None'} } }
    'DateTime'{ @{ '@odata.type'='Microsoft.Dynamics.CRM.DateTimeAttributeMetadata'; SchemaName=$schema; Format='DateAndTime';                                DisplayName=@{LocalizedLabels=@(@{Label=$c.label;LanguageCode=1033})}; RequiredLevel=@{Value='None'} } }
    'Decimal' { @{ '@odata.type'='Microsoft.Dynamics.CRM.DecimalAttributeMetadata';  SchemaName=$schema; Precision=2; MinValue=0; MaxValue=99999999;          DisplayName=@{LocalizedLabels=@(@{Label=$c.label;LanguageCode=1033})}; RequiredLevel=@{Value='None'} } }
    'Integer' { @{ '@odata.type'='Microsoft.Dynamics.CRM.IntegerAttributeMetadata';  SchemaName=$schema; MinValue=0;  MaxValue=999999;                        DisplayName=@{LocalizedLabels=@(@{Label=$c.label;LanguageCode=1033})}; RequiredLevel=@{Value='None'} } }
    'Boolean' { @{ '@odata.type'='Microsoft.Dynamics.CRM.BooleanAttributeMetadata';  SchemaName=$schema; DefaultValue=$false;
                   OptionSet=@{ '@odata.type'='Microsoft.Dynamics.CRM.BooleanOptionSetMetadata';
                     TrueOption =@{ Value=1; Label=@{LocalizedLabels=@(@{Label='Yes';LanguageCode=1033})} };
                     FalseOption=@{ Value=0; Label=@{LocalizedLabels=@(@{Label='No';LanguageCode=1033})} } };
                   DisplayName=@{LocalizedLabels=@(@{Label=$c.label;LanguageCode=1033})}; RequiredLevel=@{Value='None'} } }
  }
  Write-Host "    [add ] $logical ($($c.type))"
  try {
    Invoke-Dv POST "EntityDefinitions(LogicalName='$entityLogical')/Attributes" $attr | Out-Null
  } catch {
    Write-Warning "      ! $logical failed: $($_.Exception.Message)"
  }
  Start-Sleep -Milliseconds 250
}

Write-Host "`n==> Done. Now go to https://make.powerapps.com, switch to the right env,"
Write-Host "    open Tables -> udcsp_application to verify, then create the model-driven app."
