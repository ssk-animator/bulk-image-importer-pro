# Architecture

```text
                 BULK IMAGE IMPORTER PRO
                         │
          ┌──────────────┴──────────────┐
          │                             │
   Windows Installer              Office Add-in
   (deployment layer)             (manifest + hosted web app)
          │                             │
   Install / Repair              manifest.production.xml (source of truth)
   Detect Excel                  taskpane.html / commands.html (dist/)
   Trusted-catalog bootstrap     Excel JavaScript API
          │                             │
          └──────────────┬──────────────┘
                         ▼
                  Microsoft Excel
                  (Desktop: trusted catalog;
                   Web/Org: Marketplace or centralized deployment)
```

- `manifest.production.xml` is the ONE production source of truth.
  `manifest.xml` = dev (localhost). `release/manifest.xml` = generated copy
  (`node tools/sync-manifest.js`). Never edit the copy by hand.
- Icons: `src/assets/icons/<slug>-<16|32|80>.png`, 11 slugs
  (import-images, import-folder, import-row, import-column, import-grid,
  contact-sheet, clear-images, settings, group-import, group-layout,
  group-tools). Product brand icons `src/assets/icon-*.png` retained untouched.
  `tools/validate-manifest.js` fails the build on duplicate/shared assets or
  missing files (incl. PNG dimension check).
- Version: `package.json` → manifests + Inno script via `tools/sync-version.js`.
- App logic (`src/services`, `src/components`, `src/commands.ts`,
  `src/taskpane.ts`) is UNCHANGED by this hardening pass (no regressions).
