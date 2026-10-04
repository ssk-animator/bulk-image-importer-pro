# Changelog

## v1.0.0 (finalization + deployment hardening)

### Fixed

- Every ribbon command now has its own distinct icon set (16/32/80 PNG,
  `src/assets/icons/`): previously all 11 buttons pointed at the same
  `icon-16/32/80.png`. Desktop + Web form factors remapped.
- `release/manifest.xml` previously shipped the DEV (localhost) manifest —
  it is now a generated copy of `manifest.production.xml`
  (`node tools/sync-manifest.js`).
- `vite.config.ts` asset plugin now copies `src/assets/` recursively, so
  `dist/assets/icons/` deploys to Cloudflare Pages.

### Added

- `tools/validate-manifest.js`: fails build on duplicate/shared icons,
  missing assets, HTTP URLs, wrong host, missing FunctionFile/taskpane refs.
- `tools/sync-version.js`: `package.json` is the version source of truth.
- `installer/Install-BulkImageImporter.ps1` (`-Install/-Repair/-Uninstall/-Verify`)
  + `installer/BulkImageImporter.iss` (Inno Setup): one-time Excel Desktop
  trusted-catalog bootstrap with Excel/network/manifest detection and honest
  Excel-Online limitation messaging. No registry hacks, no DOM injection.
  Tested 2026-10-04: full cycle passes on this machine (Verify→Install→
  Verify→Repair→EXE silent install→uninstaller→Verify clean; Excel Safe-mode
  launch/restart keeps catalog registered). Fixed during testing: script-scope
  path resolution bug and Cloudflare 308 (`.html`→extensionless) handling in
  the network check.
- `tools/deploy-pages.ps1`: one-command Pages deploy reading the token from
  memory/env only (never committed).
- `docs/INSTALLATION.md`, `docs/MARKETPLACE-CHECKLIST.md`, `docs/ARCHITECTURE.md`;
  README rewritten around Development / End-user / Organization scenarios.

### Preserved (no regressions)

- All import/layout/preview/export/settings/clear functionality untouched
  (`src/commands.ts`, `src/taskpane.ts`, services, components).

## v1.0.0

Initial public release.

### Features

- Import Images
- Import Folder
- Row Layout
- Column Layout
- Grid Layout
- Contact Sheet Layout
- Masonry Layout
- Cell Anchored Layout
- True Place In Cell support (beta Office.js)
- Multiple image format support (PNG, JPG, WEBP, BMP, GIF)
- Automatic format conversion for unsupported types
- Auto-fit cells
- Preserve aspect ratio
- Batch processing with progress tracking
- Smart image sizing
- Dark / Light / System theme
- Settings persistence
- Creator information panel
- Export functionality
