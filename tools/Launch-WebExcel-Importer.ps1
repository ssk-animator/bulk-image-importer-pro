#Requires -Version 5.1
<#
.SYNOPSIS
  One-click Excel Web QA launcher for Bulk Image Importer Pro (testing only).

.DESCRIPTION
  First run: automatically creates an Excel Web QA workbook (Microsoft's own
  excel.new shortcut, observed via the browser debugging protocol only: URL
  observation, no DOM, cookie, or localStorage access), saves its URL locally
  (outside the repo), and opens it in your default browser. You perform the
  one-time Home - Add-ins - Upload My Add-in step in that workbook; the
  manifest path is printed for you (release\manifest.xml).

  Later runs: just opens the saved QA workbook - the sideloaded add-in is
  still there (sideload state persists per browser profile until cache clear).

  This is explicitly DEVELOPMENT/TESTING tooling. Production = Marketplace
  installation link or Microsoft 365 centralized deployment.

.PARAMETER Reset
  Forget the saved QA workbook and create a fresh one.
#>
[CmdletBinding()]
param([switch]$Reset)

$ErrorActionPreference = "Stop"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO_ROOT = Split-Path -Parent $SCRIPT_DIR
$QA_URL_FILE = Join-Path ([Environment]::GetFolderPath("LocalApplicationData")) "BulkImageImporterPro\web-qa-url.txt"
$MANIFEST = Join-Path $REPO_ROOT "release\manifest.xml"

if ($Reset -and (Test-Path $QA_URL_FILE)) { Remove-Item $QA_URL_FILE -Force }

if ((Test-Path $QA_URL_FILE) -and -not $Reset) {
  $url = (Get-Content $QA_URL_FILE -Raw).Trim()
  Write-Output "Opening saved QA workbook..."
  Write-Output "URL: $url"
  Start-Process $url
  Write-Output "If Image Tools is missing, re-do the one-time Upload My Add-in with:"
  Write-Output "  $MANIFEST"
  exit 0
}

Write-Output "Creating Excel Web QA workbook (excel.new)..."
$docUrl = & python3 (Join-Path $SCRIPT_DIR "Get-WebExcel-DocUrl.py") 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Output "WEB-QA-FAILED: could not obtain a workbook URL."
  Write-Output $docUrl
  Write-Output "Likely cause: Microsoft sign-in required - complete sign-in in the opened Edge window and re-run."
  exit 1
}
$docUrl = ($docUrl | Where-Object { $_ -match "^https://" } | Select-Object -Last 1).Trim()
New-Item -ItemType Directory -Path (Split-Path -Parent $QA_URL_FILE) -Force | Out-Null
Set-Content -LiteralPath $QA_URL_FILE -Value $docUrl -NoNewline
Write-Output "Saved QA workbook URL."
Write-Output "URL: $docUrl"
Write-Output "Opening workbook in your default browser..."
Start-Process $docUrl
Write-Output ""
Write-Output "ONE-TIME STEP (only needed once ever in this browser):"
Write-Output "  Home, Add-ins, More Settings, Upload My Add-in, Browse:"
Write-Output "  $MANIFEST"
Write-Output "After that, just re-run this launcher - the add-in will be there."
exit 0
