#Requires -Version 7
# refresh -> build -> gate. Exits non-zero on failure. Deployment is done by the owner/parent.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
pnpm refresh;  if ($LASTEXITCODE -ne 0) { Write-Error 'refresh failed'; exit 1 }
pnpm test;     if ($LASTEXITCODE -ne 0) { Write-Error 'tests failed'; exit 1 }
pnpm build;    if ($LASTEXITCODE -ne 0) { Write-Error 'build failed'; exit 1 }
pnpm gate;     if ($LASTEXITCODE -ne 0) { Write-Error 'gate failed'; exit 1 }
Write-Host 'refresh-build OK'
exit 0
