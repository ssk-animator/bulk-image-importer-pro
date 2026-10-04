# Installation matrix

| Scenario | Mechanism (supported) | Steps | Persistence |
|---|---|---|---|
| Development | Sideload `manifest.xml` (localhost) | `npm install && npm run dev`, then Insert → Get Add-ins → Upload My Add-in | Until manifest removed / cache cleared |
| Excel Desktop (consumer) | `Bulk-Image-Importer-Pro-Setup-vX.exe` → per-user trusted catalog (`HKCU…\WEF\TrustedCatalogs`) + local `manifest.xml` | Run setup once → Insert → Get Add-ins → Shared Folder | Survives Excel/Windows restart |
| Excel Online (consumer) | Marketplace installation link (after AppSource publication) | Open link → Add | Account-bound, survives browser refresh |
| Organization | Microsoft 365 centralized deployment (admin uploads `release/manifest.xml`) | Admin center → Add-ins → Deploy | Auto-pushed to assigned users |

## Excel Desktop vs Excel Online (mandatory distinction)

- **Excel Desktop** is device-based: the installer CAN register a trusted
  catalog on the machine (HKCU, no admin needed). Excel reads it at startup
  and surfaces the ribbon tab.
- **Excel for the web** is account/service based: a Windows installer CANNOT
  modify the user's cloud account. Claiming otherwise would be an unsupported
  hack (DOM injection / cache manipulation are explicitly out of scope).
  Production for Online = Marketplace or admin deployment.

## Installer behavior

`installer/Install-BulkImageImporter.ps1` (`-Install` default, `-Repair`, `-Uninstall`, `-Verify`):

1. Detect Excel (Office 16.0 keys, ClickToRun config, `EXCEL.EXE` paths).
2. Verify network: `GET https://bulk-image-importer-pro.pages.dev/taskpane.html`.
3. Verify production manifest (must contain `VersionOverrides` + `FunctionFile`, must NOT contain `localhost`).
4. Idempotent install: `AlreadyInstalled` if catalog + manifest verify OK.
5. Status output is always one of: `Installed | AlreadyInstalled | Repaired |
   Uninstalled | NotInstalled | ExcelNotDetected | NetworkOrHostUnreachable |
   ManifestUnavailable | ManifestInvalid | RepairRequired | InstallFailed`.

Failure modes handled gracefully (no partial state left unreported):
Excel missing/unsupported, no internet, Pages down, manifest missing/invalid,
already installed, stale cache (re-register via `-Repair`), non-admin user
(HKCU needs no admin), org-blocked add-ins (installer reports
`AdminDeploymentRequired` guidance), centralized-deployment conflicts.

## Build the setup EXE

Requires Inno Setup 6: `iscc installer\BulkImageImporter.iss`
→ `release/Bulk-Image-Importer-Pro-Setup-v1.0.0.exe`.
Version is synced from `package.json` via `node tools/sync-version.js`.
