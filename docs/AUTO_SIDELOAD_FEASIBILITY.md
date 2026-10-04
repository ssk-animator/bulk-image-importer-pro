# Cross-Browser Auto-Sideload — Feasibility Research (Phase 0)

Scope: Windows-side automation that makes the EXISTING Bulk Image Importer Pro
Office add-in (`release/manifest.xml` + Cloudflare app) available in Excel Web
across Chrome, Edge, Brave — without manual Upload every time.

Out of scope (explicit): AppSource/Partner Center, Marketplace Asset IDs,
`AutoInstallAddins`, localStorage/IndexedDB/cookie/cache manipulation, Office
binary modification, DOM injection intended to fake installation.

Machine inventory (verified 2026-10-04): Chrome (Program Files), Brave
(Program Files), Edge (x86) installed. Brave = user's daily session (add-in
present there); Chrome = fresh session (absent). Consistent with Microsoft's
documented per-browser localStorage sideload state.

## Prior empirical evidence (already gathered on this machine)

| # | Finding | Status |
|---|---|---|
| E1 | Excel Desktop UIA tree exposes only File/Home + empty panes; Insert tab not actionable | UNRELIABLE for UIA driving |
| E2 | SendKeys do not reach Excel from an agent session (Alt+N screenshot still on Home) | BLOCKED (this session type) |
| E3 | CDP `/json/list` URL observation works on Edge (doc URLs + iframe URLs captured repeatedly) | SUPPORTED |
| E4 | `office-addin-debugging start ... web` rejects non-localhost SourceLocation | BLOCKED for prod manifests |
| E5 | Legacy `wdaddin*` doc-URL params ignored by current Excel Web (zero manifest fetches) | BLOCKED |
| E6 | Excel Web AX tree via CDP is empty (cross-origin iframe isolation) | UNRELIABLE for AX driving |
| E7 | `excel.new` auto-creates a workbook + yields its URL via observation (3x proven) | SUPPORTED |
| E8 | Sideload state is per-browser localStorage (Microsoft docs + Brave-vs-Chrome observation) | SUPPORTED (constraint) |

## Architecture verdicts

### A. Browser extension only
Detection of Excel URLs: POSSIBLE. Installation: BLOCKED — no Office install
API exists; the only remaining levers are forbidden storage manipulation.
Verdict: INSUFFICIENT BY ITSELF.

### B. Extension + Native Messaging
Plumbing (extension ↔ native host via stdin/stdout; Edge registry
registration): SUPPORTED per vendor docs. But the native host still has no
supported install primitive to invoke — it ends at the same UI-driving or
forbidden-storage choice. Plus unsolved extension distribution (store/policy).
Verdict: POSSIBLE plumbing, INSTALL STEP UNRELIABLE.

### C. Native Windows UIA only
UIA is legitimate for automated testing, but E1 shows Excel surfaces are
not reliably exposed; E2 shows keystrokes don't land from here. The one
UIA-friendly piece is the NATIVE file picker (standard Open dialog), which
only helps if the Upload dialog can be opened first.
Verdict: UNRELIABLE end-to-end (pending lab TESTs 5-8 for final confirmation).

### D. Extension + Native Host + UIA
Inherits C's dialog-driving weakness; adds distribution + maintenance cost
for no proven gain.
Verdict: UNRELIABLE (same pending confirmation).

## Lab results (tools/browser-auto-install-lab/) — TESTED 2026-10-04

- TEST 1 (detect Excel tab): PASS Edge/Chrome/Brave via CDP `/json/list`
  (`test_detect.py`). Excel host match list is configurable in the script.
- TEST 2 (identify browser): PASS (per-instance binary/profile/port mapping).
- TEST 3 (doc URL): PASS Edge + Chrome via `excel.new` observation; Brave
  stops at Microsoft sign-in (fresh profile) — user session required.
- TEST 4 (presence via taskpane-iframe URL observation): signal implemented;
  fresh profiles correctly report MISSING (no false positives). Positive
  control pending a sideloaded session.
- TEST 5 (drive UI via CDP input): PARTIAL — key/mouse events land
  (`test_uidrive.py`, `test_search2.py` + CDP screenshots as evidence);
  SendKeys/OS-level keys do NOT land from an agent session (prior finding).
- TEST 6 (reach Upload My Add-in): FAIL — command search shows only
  Functions/feedback entries, no Upload shortcut (`lab-search2.png`,
  `lab-suggest.png`, `lab-dialog.png`). No keyboard path exists; remaining
  option is coordinate clicking, which is prohibited as the primary method.
- TEST 7-8 (pick manifest / submit): NOT REACHABLE without TEST 6.
- TEST 9 (verify Image Tools): signal defined (TEST 4), end-to-end pending.

## Standing hypothesis (to confirm or refute in lab)

The only remaining automatable seam is driving Excel Web's OWN Upload dialog
through legitimate input (CDP keyboard/mouse, which unlike SendKeys lands in
the page) + UIA for the native file picker, with presence verified by iframe
observation. If TESTs 5-8 fail, the honest conclusion is: one manual Upload
per browser (then persistent), and engineering effort should go to AppSource
instead of automation.
