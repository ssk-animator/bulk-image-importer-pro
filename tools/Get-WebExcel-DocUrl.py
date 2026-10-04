"""Create (once) an Excel Web QA workbook via excel.new and print its document URL.

Uses only legitimate browser automation: launches Edge with a dedicated test
profile + remote-debugging port, navigates to Microsoft's own excel.new
shortcut, and OBSERVES the resulting document URL via the DevTools HTTP
endpoint. No DOM access, no cookie/localStorage access, no page modification.
"""
import json, subprocess, time, urllib.request, os, shutil, sys
EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
PROFILE = os.path.join(os.environ.get("TEMP", r"C:\Temp"), "bip-edge-qa-profile")
PORT = 19322
EDGE = next((p for p in EDGE_CANDIDATES if os.path.exists(p)), None)
if not EDGE:
    print("QA-DOC-ERROR: Microsoft Edge not found.", file=sys.stderr)
    sys.exit(3)
os.makedirs(PROFILE, exist_ok=True)
subprocess.Popen([EDGE, "--user-data-dir=" + PROFILE,
                  "--remote-debugging-port=%d" % PORT,
                  "--no-first-run", "--no-default-browser-check", "about:blank"],
                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def cdp(path, method="GET"):
    req = urllib.request.Request("http://127.0.0.1:%d%s" % (PORT, path), method=method)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())
for _ in range(30):
    try:
        cdp("/json/list"); break
    except Exception:
        time.sleep(1)
else:
    print("QA-DOC-ERROR: DevTools endpoint did not come up.", file=sys.stderr)
    sys.exit(4)
cdp("/json/new?https://excel.new", "PUT")
doc = None
for _ in range(24):
    time.sleep(5)
    try:
        tgts = cdp("/json/list")
    except Exception:
        continue
    for t in tgts:
        u = t.get("url", "")
        if t.get("type") == "page" and "excel.cloud.microsoft/open/onedrive" in u and "docId" in u:
            doc = u; break
    if doc:
        break
if not doc:
    print("QA-DOC-ERROR: no workbook URL appeared (sign-in may be required in the opened window).",
          file=sys.stderr)
    sys.exit(5)
print(doc)
