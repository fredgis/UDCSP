param([Parameter(Mandatory=$true)][string]$BaselineVersion,[Parameter(Mandatory=$true)][string]$CandidateVersion,[string]$GatesPath='tests/eval/quality-gates/gates.yaml')
# TODO: case-study scaffold. Query Foundry eval runs and compare deltas against declarative gates.
[pscustomobject]@{baseline=$BaselineVersion;candidate=$CandidateVersion;gates=$GatesPath;decision='manual-review-required'} | ConvertTo-Json
