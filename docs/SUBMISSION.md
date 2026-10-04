# AppSource Submission Guide — Bulk Image Importer Pro

Reference: https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish-office-add-ins-to-appsource

## What to submit

In Partner Center, create an Office Add-in offer and upload the production
manifest:

```text
release/manifest.xml   (identical to manifest.production.xml — verified by tools/sync-manifest.js --check)
```

Manifest pre-validation already automated:
`npm run validate` + `npm run validate:release`, plus string-length,
placeholder-text, trademark, and URL checks (see `docs/MARKETPLACE-CHECKLIST.md`).

## Store listing values (use verbatim)

- Name: `Bulk Image Importer Pro`
- Description: `Import hundreds of images into Excel with advanced layout controls. Supports row, column, grid, masonry, and contact sheet layouts.`
- Support URL: `https://bulk-image-importer-pro.pages.dev/support` (live, 200)
- Privacy URL: `https://bulk-image-importer-pro.pages.dev/privacy` (live, 200)
- Terms URL: `https://bulk-image-importer-pro.pages.dev/terms` (live, 200)
- Hosts: Excel (Desktop + Web). Permissions: ReadWriteDocument (required to insert images and fit cells — state this in the submission test notes).

## Test notes for the certification team (paste into submission)

1. Deploy via sideload of `release/manifest.xml` (Insert → Get Add-ins → Upload My Add-in).
2. The `Image Tools` tab appears with 8 commands, each with a distinct icon.
3. Import Images / Import Folder with PNG, JPG, JPEG, WEBP, BMP, GIF.
4. Try Row, Column, Grid, Contact Sheet layouts; Clear Images removes shapes; Settings persists theme and defaults.
5. Support/Privacy/Terms pages are linked from the Support page and reachable at the URLs above.

## Screenshots (required by the store)

Provide 1280x720 captures showing: (1) the Excel ribbon with the distinct
Image Tools icons, (2) the taskpane Import tab, (3) a grid import result.
These must be taken from a real Excel run after the one-time Shared Folder /
Upload add (automated capture is not possible from CI — see docs). Save final
files as `docs/store-assets/*.png` (not yet present — add before submitting).

## After approval — the Asset ID integration (do NOT invent this)

Partner Center issues a Marketplace asset ID (`WAxxxxxxxx`). Only then:

1. Installer: add the documented step to `installer/Install-BulkImageImporter.ps1`:
   - check Office build ≥ 16.0.18227 (current test machine is 16.0.17932 — must update Office first),
   - check store not disabled (`HKCU\...\Wef\AutoInstallAddins` → no `StoreDisabled=1`),
   - write `HKCU\Software\Microsoft\Office\16.0\Wef\AutoInstallAddins\Excel\BulkImageImporterPro`
     with `AssetIds="<WA id>"` (+ `HasPrivacyLink` handling per certification terms).
2. Rebuild the EXE, clean-machine test (installer → Office pulls from store → Desktop + Web), update `docs/INSTALLATION.md`, cut a new release (e.g. v1.1.0 via `node tools/sync-version.js` after bumping `package.json`).
3. Optional follow-up: Microsoft 365 developer certification for fully silent install (otherwise the user sees one approve prompt inside our installer — still supported).
