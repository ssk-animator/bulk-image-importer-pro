# Cloudflare Pages deployment (requires a valid token — NOT committed)
# The token file must contain ONLY the raw API token on a single line.
# Usage:
#   1. Save a valid Cloudflare API token (Pages:Edit scope) as a single line in
#      "$env:USERPROFILE\Downloads\cloudflare_API Token.txt" or set CLOUDFLARE_API_TOKEN.
#   2. powershell -ExecutionPolicy RemoteSigned -File tools/deploy-pages.ps1
# The token is used in memory only and never written to the repo.

param(
  [string]$Project = "bulk-image-importer-pro",
  [string]$DistDir = (Join-Path (Split-Path -Parent $PSScriptRoot) "dist"),
  [string]$TokenFile = (Join-Path ([Environment]::GetFolderPath("UserProfile")) "Downloads\cloudflare_API Token.txt")
$ErrorActionPreference = "Stop"
if (-not $env:CLOUDFLARE_API_TOKEN) {
  if (Test-Path $TokenFile) {
    $raw = Get-Content $TokenFile -Raw
    # Accept either a bare token or a pasted token-creation screen: pick the
    # first single-line value that looks like a Cloudflare API token.
    $candidate = ($raw -split "`r?`n" | Where-Object { $_ -match '^(cfat_|^[A-Za-z0-9_-]{30,})' } | Select-Object -First 1)
    if (-not $candidate) { $candidate = $raw.Trim() -split "`r?`n" | Select-Object -First 1 }
    $env:CLOUDFLARE_API_TOKEN = $candidate.Trim()
  } else {
    throw "CLOUDFLARE_API_TOKEN not set and token file not found: $TokenFile"
  }
}
npm run build
npx --yes wrangler pages deploy $DistDir --project-name $Project
Remove-Item Env:\CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
Write-Output "Deploy finished. Verify: https://$Project.pages.dev/taskpane"
