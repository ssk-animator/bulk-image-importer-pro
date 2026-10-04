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
- [ ] Publish `dist/` to Cloudflare Pages; confirm all 33 icon URLs return 200.
      Helper: `tools/deploy-pages.ps1` (reads token from local file/env, never commits it).
      Status 2026-10-04: live host serves taskpane/commands + old icons, but
      `/assets/icons/*` = 404 and `/support`, `/privacy`, `/terms` = 404.
      Deployment blocked on a valid token (saved token rejected: API 400/9106).
- [ ] Privacy URL + Terms URL (required by AppSource; currently only SupportUrl exists,
      and it 404s on the live host as of 2026-10-04).
- [ ] Publisher profile + support contact in Partner Center.
- [ ] Screenshots (1280x720, incl. ribbon with DISTINCT icons + taskpane).
- [ ] Test notes: fresh M365 account, Excel Desktop + Excel Online.
- [ ] Submit via Partner Center (NOT automated here).

Known platform limitation (documented, not worked around): consumer
one-click silent install into arbitrary M365 accounts is not a supported
deployment; Marketplace link / admin deployment is the production path.
