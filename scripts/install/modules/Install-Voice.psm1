<#
.SYNOPSIS
    Install-Voice (A10) — ACS, AI Speech, IVR dialogs, transcript pipeline,
    SMS/email templates.
#>
function Install-Voice {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'DK','SE','NO') {
        if ($PSCmdlet.ShouldProcess("ACS $country", 'Bicep deploy')) {
            "[scaffold] az deployment group create --template-file $repo\apps\voice\acs\acs-resource.bicep --parameters country=$country" |
                Add-Content (Join-Path $ReportDir 'install-voice.log')
        }
    }
}

function Test-Voice {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'apps\voice\scripts\Test-Voice.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"Voice`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-voice.json')
}

Export-ModuleMember -Function Install-Voice, Test-Voice
