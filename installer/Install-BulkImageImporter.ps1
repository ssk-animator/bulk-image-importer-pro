#Requires -Version 5.1
<#
.SYNOPSIS
  Bulk Image Importer Pro — supported deployment bootstrapper (Excel Desktop).

.DESCRIPTION
  Uses ONLY Microsoft-supported mechanisms:
   - Excel Desktop: registers a per-user Trusted Catalog (documented sideload/
     trusted-folder path) pointing at a local catalog folder containing the
     production manifest. This is the same mechanism behind
     "Shared Folder" trusted catalogs — no undocumented Office internals,
     no browser DOM injection, no cache deletion.
   - Excel for the web: CANNOT be modified by a Windows installer because it
     is account/service based. This script detects that case and prints the
     supported path (manual upload for testing, Marketplace link or M365
     admin/centralized deployment for production) instead of pretending.

  Modes: -Install (default, idempotent), -Repair, -Uninstall, -Verify
  Never leaves partial state unreported. No execution-policy bypass needed.

.EXAMPLE
  powershell -ExecutionPolicy RemoteSigned -File Install-BulkImageImporter.ps1 -Install
#>
[CmdletBinding()]
param(
  [switch]$Install,
  [switch]$Repair,
  [switch]$Uninstall,
  [switch]$Verify,
  [string]$CatalogDir = (Join-Path $env:ProgramData "BulkImageImporterPro\Catalog"),
  [string]$ManifestSource = "",
  [string]$ProdHost = "https://bulk-image-importer-pro.pages.dev"
)

$ErrorActionPreference = "Stop"
$CATALOG_GUID = "{B71C4E2A-9F0D-4A5B-8C3E-1F2A3B4C5D6E}"
$TRUSTED_CATALOGS = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs"
# Script-scope path (must be captured here: $MyInvocation inside a function
# refers to the function, not the script file).
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Status([string]$Status, [string]$Detail = "") {
  Write-Output "STATUS: $Status"
  if ($Detail) { Write-Output "DETAIL: $Detail" }
}

function Test-ExcelInstalled {
  # Returns version string or $null
  $candidates = @(
    "HKLM:\SOFTWARE\Microsoft\Office\16.0\Excel\InstallRoot",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Office\16.0\Excel\InstallRoot",
    "HKCU:\SOFTWARE\Microsoft\Office\16.0\Excel",
    "HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $true }
  }
  $appPaths = @(
    "$env:ProgramFiles\Microsoft Office\root\Office16\EXCEL.EXE",
    "${env:ProgramFiles(x86)}\Microsoft Office\root\Office16\EXCEL.EXE"
  )
  foreach ($a in $appPaths) { if (Test-Path $a) { return $true } }
  try {
    $cmd = Get-Command excel.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $true }
  } catch { }
  return $false
}

function Test-UrlReachable {
  param([string]$Url)
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 5
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) { return $true }
    return $false
  } catch {
    # Windows PowerShell 5.1 throws on 308; a redirect from the host still
    # proves the host is up (Cloudflare Pages strips ".html" -> 308).
    $msg = $_.Exception.Message
    if ($msg -match "\(30[187]\)" -or $msg -match "\(301\)" -or $msg -match "\(302\)") { return $true }
    Write-Verbose "URL check failed for $Url : $msg"
    return $false
  }
}

function Test-NetworkAndManifest {
  param([string]$HostUrl)
  # Try the exact manifest-referenced URL first, then the extensionless
  # variant (Cloudflare Pages may 308-redirect .html -> extensionless).
  if (Test-UrlReachable -Url "$HostUrl/taskpane.html") { return $true }
  if (Test-UrlReachable -Url "$HostUrl/taskpane") { return $true }
  return $false
}

function Get-DeployedManifestPath {
  return (Join-Path $CatalogDir "manifest.xml")
}

function Test-AddInDeployed {
  $mp = Get-DeployedManifestPath
  if (-not (Test-Path $mp)) { return $false }
  try {
    $content = Get-Content $mp -Raw
    if ($content -notmatch "VersionOverrides") { return $false }
    if ($content -notmatch "FunctionFile") { return $false }
    if ($content -match "localhost") { return $false }  # dev manifest must never ship
  } catch { return $false }
  try {
    $key = Join-Path $TRUSTED_CATALOGS $CATALOG_GUID
    if (-not (Test-Path $key)) { return $false }
    $url = (Get-ItemProperty $key -ErrorAction Stop).Url
    if (-not $url) { return $false }
  } catch { return $false }
  return $true
}

function Install-AddIn {
  param([bool]$IsRepair = $false)
  if (-not (Test-ExcelInstalled)) {
    Write-Status "ExcelNotDetected" "Microsoft Excel desktop was not found. Install Microsoft 365 / Office 2016+ first."
    return 2
  }
  if (-not (Test-NetworkAndManifest -HostUrl $ProdHost)) {
    Write-Status "NetworkOrHostUnreachable" "Cannot reach $ProdHost. Check internet connection and Cloudflare Pages deployment."
    return 3
  }
  $already = Test-AddInDeployed
  if ($already -and -not $IsRepair) {
    Write-Status "AlreadyInstalled" "Catalog $CatalogDir already registered and manifest verified. No changes made."
    return 0
  }
  if ([string]::IsNullOrWhiteSpace($ManifestSource)) {
    foreach ($cand in @(
      (Join-Path $SCRIPT_DIR "..\release\manifest.xml"),
      (Join-Path $SCRIPT_DIR "manifest.xml"),
      (Join-Path $SCRIPT_DIR "..\manifest.production.xml"))) {
      if (Test-Path $cand) { $ManifestSource = $cand; break }
    }
  }
  if (-not (Test-Path $ManifestSource)) {
    Write-Status "ManifestUnavailable" "Production manifest not found next to installer ($ManifestSource)."
    return 4
  }
  $src = Get-Content $ManifestSource -Raw
  if ($src -match "localhost") {
    Write-Status "ManifestInvalid" "Refusing to deploy a development (localhost) manifest to production catalog."
    return 5
  }
  if ($src -notmatch "VersionOverrides" -or $src -notmatch "FunctionFile") {
    Write-Status "ManifestInvalid" "Manifest is missing VersionOverrides/FunctionFile."
    return 5
  }
  try {
    New-Item -ItemType Directory -Path $CatalogDir -Force | Out-Null
    Copy-Item -LiteralPath $ManifestSource -Destination (Get-DeployedManifestPath) -Force
    New-Item -Path (Join-Path $TRUSTED_CATALOGS $CATALOG_GUID) -Force | Out-Null
    $fileUrl = "file:///" + ($CatalogDir -replace "\\", "/")
    New-ItemProperty -Path (Join-Path $TRUSTED_CATALOGS $CATALOG_GUID) -Name "Url" -Value $fileUrl -PropertyType String -Force | Out-Null
    New-ItemProperty -Path (Join-Path $TRUSTED_CATALOGS $CATALOG_GUID) -Name "Flags" -Value 1 -PropertyType DWord -Force | Out-Null
  } catch {
    Write-Status "InstallFailed" $_.Exception.Message
    return 6
  }
  if (-not (Test-AddInDeployed)) {
    Write-Status "RepairRequired" "Files written but verification failed. Re-run with -Repair."
    return 7
  }
  if ($IsRepair) { Write-Status "Repaired" "Trusted catalog re-registered at $CatalogDir." }
  else { Write-Status "Installed" "Add-in catalog registered at $CatalogDir. Open Excel Desktop: Insert > Get Add-ins > Shared Folder > Bulk Image Importer Pro." }
  Write-Output "NOTE: Excel for the web (Excel Online) is account/service based and cannot be provisioned by this installer."
  Write-Output "      For Excel Online use: Marketplace installation link (after publication) or Microsoft 365 admin centralized deployment."
  Write-Output "      Docs: https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish"
  return 0
}

function Uninstall-AddIn {
  $removed = @()
  try {
    $key = Join-Path $TRUSTED_CATALOGS $CATALOG_GUID
    if (Test-Path $key) { Remove-Item $key -Recurse -Force; $removed += "trusted-catalog-registration" }
    $mp = Get-DeployedManifestPath
    if (Test-Path $mp) { Remove-Item $mp -Force; $removed += "catalog-manifest" }
    # Only remove catalog dir if it is ours and now empty of foreign files
    if ((Test-Path $CatalogDir) -and -not (Get-ChildItem $CatalogDir -Force | Where-Object { $_.Name -ne "." })) {
      Remove-Item $CatalogDir -Force; $removed += "catalog-dir"
    }
  } catch {
    Write-Status "UninstallFailed" $_.Exception.Message
    return 6
  }
  if ($removed.Count -eq 0) { Write-Status "NotInstalled" "No Bulk Image Importer Pro catalog registration found." }
  else { Write-Status "Uninstalled" ("Removed: " + ($removed -join ", ")) }
  Write-Output "NOTE: this removes the local Desktop trusted-catalog layer only. Add-ins deployed via Microsoft 365 centralized deployment or Marketplace must be removed there by the admin/user."
  return 0
}

# ---- entry point ----
if ($Uninstall) { exit (Uninstall-AddIn) }
elseif ($Repair) { exit (Install-AddIn -IsRepair $true) }
elseif ($Verify) {
  if (-not (Test-ExcelInstalled)) { Write-Status "ExcelNotDetected"; exit 2 }
  if (Test-AddInDeployed) { Write-Status "Installed" "Deployment verified."; exit 0 }
  else { Write-Status "RepairRequired" "Catalog registration or manifest missing/invalid."; exit 7 }
}
else { exit (Install-AddIn -IsRepair $false) }
