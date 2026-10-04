"""LAB TESTs 5-6 probe: can CDP keyboard input drive Excel Web UI?
Captures screenshots via CDP (immune to GPU-compositing black frames),
sends Alt+H, captures again. Saves both PNGs for inspection.
"""
import asyncio, json, urllib.request, base64, sys
import websockets
PORT = 19332
tgts = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/json/list" % PORT, timeout=10).read().decode())
doc = [x for x in tgts if x.get("type") == "page" and "excel.cloud.microsoft/open/onedrive" in x.get("url", "")]
if not doc:
    print("NO-DOC-TAB"); sys.exit(2)
t = doc[0]
OUT = r"C:\Users\ssk90\AppData\Local\Temp\opencode\lab-shot-{}.png"
async def go():
    async with websockets.connect(t["webSocketDebuggerUrl"], max_size=50 * 1024 * 1024) as ws:
        i = 100
        async def cmd(m, p=None):
            nonlocal i
            i += 1
            await ws.send(json.dumps({"id": i, "method": m, "params": p or {}}))
            return json.loads(await ws.recv())
        r = await cmd("Page.captureScreenshot", {"format": "png"})
        open(OUT.format("before"), "wb").write(base64.b64decode(r["result"]["data"]))
        print("BEFORE-SAVED")
        # Alt+H (Home tab keytip entry)
        for typ, code, key in [("keyDown", 18, "Alt"), ("keyDown", 72, "h"),
                               ("keyUp", 72, "h"), ("keyUp", 18, "Alt")]:
            await cmd("Input.dispatchKeyEvent", {
                "type": typ, "key": key, "code": "AltLeft" if code == 18 else "KeyH",
                "windowsVirtualKeyCode": code, "nativeVirtualKeyCode": code,
                "modifiers": 1 if "keyDown" in typ and code != 18 else (1 if typ == "keyDown" else 0)})
        import time as _t
        await asyncio.sleep(4)
        r = await cmd("Page.captureScreenshot", {"format": "png"})
        open(OUT.format("after"), "wb").write(base64.b64decode(r["result"]["data"]))
        print("AFTER-SAVED")
asyncio.run(go())
print("DONE")
