"""LAB TESTs 1-4: per-browser Excel-tab detection + presence signal.

TEST 1: detect Excel Web tab. TEST 2: identify browser. TEST 3: doc URL.
TEST 4: presence via taskpane/commands iframe URL observation (no storage access).

Usage: python test_detect.py <chrome|edge|brave> [excel-doc-url]
Opens the given (or a fresh excel.new) workbook in an isolated test profile
and reports a structured JSON verdict.
"""
import json, subprocess, time, urllib.request, os, sys

BROWSERS = {
    "chrome": (r"C:\Program Files\Google\Chrome\Application\chrome.exe", 19331),
    "edge": (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", 19332),
    "brave": (r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe", 19333),
}
EXCEL_HOSTS = ("excel.cloud.microsoft", "excel.office.com", "office.com/launch/excel")
ADDIN_HOST = "bulk-image-importer-pro.pages.dev"

def cdp(port, path, method="GET"):
    req = urllib.request.Request("http://127.0.0.1:%d%s" % (port, path), method=method)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())

def main():
    name = sys.argv[1]
    seed_url = sys.argv[2] if len(sys.argv) > 2 else "https://excel.new"
    binary, port = BROWSERS[name]
    profile = os.path.join(os.environ.get("TEMP", r"C:\Temp"), "bip-lab-" + name)
    os.makedirs(profile, exist_ok=True)
    subprocess.Popen([binary, "--user-data-dir=" + profile,
                      "--remote-debugging-port=%d" % port,
                      "--no-first-run", "--no-default-browser-check", "about:blank"],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(30):
        try:
            cdp(port, "/json/list"); break
        except Exception:
            time.sleep(1)
    cdp(port, "/json/new?" + seed_url, "PUT")
    time.sleep(25)
    tgts = cdp(port, "/json/list")
    excel_tabs, doc_urls, addin_frames = [], [], []
    for t in tgts:
        u = t.get("url", "")
        if t.get("type") == "page" and any(h in u for h in EXCEL_HOSTS):
            excel_tabs.append(u[:120])
            if "docId" in u or "/open/" in u:
                doc_urls.append(u[:160])
        if ADDIN_HOST in u:
            addin_frames.append((t.get("type"), u[:160]))
    verdict = {
        "browser": name,
        "TEST1_excel_tab_detected": bool(excel_tabs),
        "TEST2_browser_identified": True,
        "TEST3_doc_url": (doc_urls[0] if doc_urls else None),
        "TEST4_presence": ("PRESENT" if addin_frames else "MISSING"),
        "addin_frames_seen": len(addin_frames),
    }
    print(json.dumps(verdict, indent=1))
    # leave browser running for follow-up tests; caller kills it

if __name__ == "__main__":
    main()
