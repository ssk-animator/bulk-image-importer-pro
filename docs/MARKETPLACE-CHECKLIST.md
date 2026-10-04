# Marketplace readiness checklist (AppSource)

Reference: https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish-office-add-ins-to-appsource

- [x] Production manifest validates (`npm run validate`): IDs, Version,
      ProviderName, DisplayName, Description, IconUrl/HighResolutionIconUrl
      (HTTPS), SupportUrl (HTTPS), AppDomains, Hosts=Workbook,
      Requirements ExcelApi, Permissions=ReadWriteDocument,
      VersionOverrides with Desktop + Web form factors, FunctionFile.
- [x] All HTTPS, single production host `https://bulk-image-importer-pro.pages.dev`.
- [x] 8 command icons + 3 group icons, each 16/32/80 PNG, distinct, Office-style.
- [x] Taskpane + commands pages build (`npm run build` → `dist/`).
- [x] Publish `dist/` to Cloudflare Pages; all 33 icon URLs return 200.
      Deployed 2026-10-04 via `wrangler pages deploy` (OAuth) to the existing
      `bulk-image-importer-pro` project. Verified 39/39 live URLs 200:
      `/`, `/taskpane`, `/commands`, `/support`, `/privacy`, `/terms`,
      all 33 `/assets/icons/*`.
- [x] Privacy URL + Terms URL: live at `/privacy` and `/terms` (simple,
      product-appropriate pages; no unverified compliance claims).
      Support page live at `/support` (matches manifest SupportUrl).
- [ ] Publisher profile + support contact in Partner Center.
- [ ] Screenshots (1280x720, incl. ribbon with DISTINCT icons + taskpane).
- [ ] Test notes: fresh M365 account, Excel Desktop + Excel Online.
- [ ] Submit via Partner Center (NOT automated here).

Known platform limitation (documented, not worked around): consumer
one-click silent install into arbitrary M365 accounts is not a supported
deployment; Marketplace link / admin deployment is the production path.
