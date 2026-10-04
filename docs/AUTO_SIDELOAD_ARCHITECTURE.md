# Cross-Browser Auto-Sideload — Chosen Architecture (Phase 2)

Date: 2026-10-04. Basis: `docs/AUTO_SIDELOAD_FEASIBILITY.md` + lab evidence
(`tools/browser-auto-install-lab/`, screenshots in the agent work log).

## Decision

**Selected: QA Launcher + ManualFallbackStrategy as the shipped architecture.
No extension. No native-messaging host. No UIA dialog driver.**

Rationale, per the selection rules (minimize permissions, fragility,
maintenance, interaction):

- Detection (TESTs 1-4) is SOLVED and reliable: CDP URL observation finds
  Excel tabs, identifies the browser, captures doc URLs, and reports
  PRESENT/MISSING without touching storage or DOM.
- The install step (TESTs 5-8) has NO reliable mechanism: the Upload dialog
  has no keyboard path (proven), coordinate clicking is prohibited as the
  primary method, `office-addin-debugging` is localhost-only (proven),
  `wdaddin*` URL params are ignored (proven), and storage manipulation is
  forbidden. Approaches A-D therefore all fail at the same step, and D
  (the previously recommended hybrid) adds distribution cost for zero gain.
- Shipping a fragile click-bot would be worse than the honest manual step:
  it breaks silently on every Excel Web UI change and teaches users to
  distrust the installer.

## What ships (already implemented)

`tools/Launch-WebExcel-Importer.ps1` + `tools/Get-WebExcel-DocUrl.py`:
auto-create workbook, capture URL, reopen saved QA workbook (add-in persists
per browser profile). One Upload click per browser, once ever. See
`docs/INSTALLATION.md`.

## State machine (as implemented)

- EXCEL_DETECTED → CHECKING (iframe observation) → PRESENT → DONE, or
  MISSING → MANUAL_FALLBACK (open QA workbook + print manifest path).
- INSTALLING/SUCCESS states are reserved for a future validated mechanism;
  the launcher NEVER claims an install it did not verify.

## What would change this decision (one specific next action)

If Microsoft documents (or the lab discovers) a *keyboard- or URL-driven*
path to the Upload dialog — or after AppSource publication enables the
installation-link / `AutoInstallAddins` flows — re-run lab TESTs 5-9 and
revisit. Until then, engineering effort belongs to AppSource submission
(`docs/SUBMISSION.md`), which is the only supported zero-click path.
