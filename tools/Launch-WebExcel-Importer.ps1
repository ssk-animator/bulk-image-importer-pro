#Requires -Version 5.1
<#
.SYNOPSIS
  Developer/testing launcher: auto-sideload Bulk Image Importer Pro into Excel on the web.

.DESCRIPTION
  Uses ONLY Microsoft's documented Office Add-ins web sideload mechanism
  (office-addin-debugging start <manifest> web --document <url>).
  Eliminates the repeated manual Home > Add-ins > Advanced > Upload My Add-in
  flow during development/testing.

  This is explicitly a DEVELOPMENT/TESTING launcher. A sideloaded add-in is
  stored in browser local storage and is NOT a permanent consumer deployment.
  Production = Marketplace installation link or Microsoft 365 centralized
  deployment. See docs/INSTALLATION.md.

  Uses the production manifest (hosted Cloudflare URLs) by default; refuses
  to sideload a localhost/dev manifest unless -AllowDevManifest is given.

.PARAMETER DocumentUrl
  Excel/OneDrive workbook URL, e.g.
  https://contoso-my.sharepoint.com/.../Test.xlsx
  If omitted, you will be prompted.

.PARAMETER Manifest
  Defaults to release/manifest.xml (production).

.PARAMETER DryRun
  Validate everything and print the exact sideload command without launching.

.EXAMPLE
  powershell -ExecutionPolicy RemoteSigned -File tools\Launch-WebExcel-Importer.ps1 -DryRun
  powershell -ExecutionPolicy RemoteSigned -File tools\Launch-WebExcel-Importer.ps1 -DocumentUrl "https://..."
#>
[CmdletBinding()]
param(
  [string]$DocumentUrl = "",
  [string]$Manifest = "",
  [switch]$DryRun,
  [switch]$AllowDevManifest
)

$ErrorActionPreference = "Stop"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO_ROOT = Split-Path -Parent $SCRIPT_DIR
if ([string]::IsNullOrWhiteSpace($Manifest)) {
  $Manifest = Join-Path $REPO_ROOT "release\manifest.xml"
}

function Fail([string]$msg) { Write-Output "SIDELOAD-FAILED: $msg"; exit 1 }

# 1. Manifest must exist and (by default) be the production one
if (-not (Test-Path $Manifest)) { Fail "Manifest not found: $Manifest" }
$xml = Get-Content $Manifest -Raw
if ($xml -notmatch "VersionOverrides") { Fail "Manifest missing VersionOverrides." }
if (($xml -match "localhost" -or $xml -match "127\.0\.0\.1") -and -not $AllowDevManifest) {
  Fail "Refusing to web-sideload a development (localhost) manifest. Use release/manifest.xml or pass -AllowDevManifest."
}

# 2. Node + debugging tooling must be available
try { $node = (Get-Command node -ErrorAction Stop).Source } catch { Fail "node not found on PATH." }
Write-Output "Node: $node"

# 3. Document URL (prompt if not supplied)
if ([string]::IsNullOrWhiteSpace($DocumentUrl)) {
  if ($DryRun) { $DocumentUrl = "<document-url-not-supplied-dry-run>" }
  else { $DocumentUrl = Read-Host "Excel/OneDrive workbook URL" }
}
if (-not $DryRun -and $DocumentUrl -notmatch "^https://") { Fail "DocumentUrl must be an https:// URL." }

$cmd = "npx --yes office-addin-debugging start `"$Manifest`" web --document `"$DocumentUrl`" --prod"
Write-Output "Manifest: $Manifest"
Write-Output "Command: $cmd"
if ($DryRun) { Write-Output "DRY-RUN-OK: launcher validation passed."; exit 0 }

Write-Output "Starting documented web sideload (first run may ask for Developer Mode)..."
Set-Location $REPO_ROOT
Invoke-Expression "& $cmd"
exit $LASTEXITCODE
