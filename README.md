<p align="center">
  <img src="./bulk-image-importer-pro_Banner_V2.png" alt="Bulk Image Importer Pro Banner" width="100%">
</p>

# Bulk Image Importer Pro

Bulk Image Importer Pro is an Excel add-in that allows users to quickly import large numbers of images directly into Excel worksheets using multiple layout modes.

## Features

- True Place In Cell image support
- Import single images
- Import entire folders
- Row layout
- Column layout
- Grid layout
- Contact Sheet layout
- Masonry layout
- Cell Anchored layout
- Auto-fit cells
- Preserve aspect ratio
- Batch processing
- Dark UI
- Excel Online support

## Installation — pick ONE scenario

> Sideloading (manual `manifest.xml` upload) is the **development/testing**
> path only. Production uses the installer (Excel Desktop), a Marketplace
> installation link once published, or Microsoft 365 centralized deployment
> for organizations. See `docs/INSTALLATION.md` for the full matrix.

### Scenario 1 — Development (sideload)

1. `npm install && npm run dev`
2. In Excel Desktop or Excel Online: **Insert → Get Add-ins → Manage My
   Add-ins → Upload My Add-in** → select `manifest.xml` (localhost).
3. The **Image Tools** tab appears. Re-upload only when testing manifest changes.

### Scenario 2 — Normal end user (Excel Desktop, one-time install)

1. Download `Bulk-Image-Importer-Pro-Setup-v1.0.0.exe` from the
   [Releases page](https://github.com/ssk-animator/bulk-image-importer-pro/releases).
2. Run it once. It verifies Excel, network access, and the production manifest,
   then registers a per-user trusted catalog — no repeated manifest uploads.
3. Open Excel Desktop → **Insert → Get Add-ins → Shared Folder** →
   **Bulk Image Importer Pro**. The **Image Tools** tab persists across
   Excel/Windows restarts.
4. Repair: re-run the installer or
   `powershell -ExecutionPolicy RemoteSigned -File Install-BulkImageImporter.ps1 -Repair`.
   Uninstall: same script with `-Uninstall`, or Windows Add/Remove Programs.

### Scenario 3 — Organization / Excel Online (production)

A Windows installer **cannot** inject an add-in into Excel Online accounts —
Excel for the web is account/service based. Use a supported path:

- **Microsoft 365 centralized deployment** (admin uploads
  `release/manifest.xml`; commands auto-appear in the ribbon), or
- **Marketplace installation link** after AppSource publication (see
  `docs/MARKETPLACE-CHECKLIST.md`).

Reference: https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish

> **Note:** The add-in is hosted on Cloudflare Pages (`https://bulk-image-importer-pro.pages.dev`) — no local server required in production.

## Supported Formats

- PNG
- JPG
- JPEG
- WEBP
- BMP
- GIF

## Layouts

### Row
Places images horizontally in a single row.

### Column
Places images vertically in a single column.

### Grid
Places images in a configurable grid with adjustable columns.

### Contact Sheet
Places images as uniform square thumbnails in a grid.

### Masonry
Places images in a shortest-column layout for uneven visual distribution.

### Cell Anchored
Places each image in its own cell, preserving calculated dimensions.

## Settings

- Default Width & Height
- Grid Columns
- Batch Size
- Start Cell
- Auto-Fit Cells
- Preserve Aspect Ratio
- Enable True Place In Cell
- Theme Selection (Light / Dark / System)

## Troubleshooting

### Images not importing
Verify the image format is supported (PNG, JPG, WEBP, BMP, GIF).

### Add-in not loading
Refresh Excel and reload the add-in.

### Performance issues
Reduce batch size in Settings.

## Contact

Developer: Sahil G Kamble (SSK)

Email: ssk9096461158@gmail.com

YouTube: https://www.youtube.com/@sskanimator6521

Instagram: https://www.instagram.com/ssk.animations
