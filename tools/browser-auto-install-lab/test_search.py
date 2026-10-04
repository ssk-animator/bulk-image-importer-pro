"""LAB TEST 5 probe: Alt+Q search -> type command -> screenshot suggestions."""
import asyncio, json, urllib.request, base64, sys
import websockets
PORT = 19332
tgts = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/json/list" % PORT, timeout=10).read().decode())
doc = [x for x in tgts if x.get("type") == "page" and "excel.cloud.microsoft/open/onedrive" in x.get("url", "")]
if not doc:
    print("NO-DOC-TAB"); sys.exit(2)
t = doc[0]
async def go():
    async with websockets.connect(t["webSocketDebuggerUrl"], max_size=50 * 1024 * 1024) as ws:
        i = 200
        async def cmd(m, p=None):
            nonlocal i
            i += 1
            await ws.send(json.dumps({"id": i, "method": m, "params": p or {}}))
            return json.loads(await ws.recv())
        async def key(typ, text="", code="", vk=0):
            await cmd("Input.dispatchKeyEvent", {"type": typ, "text": text or None,
                      "unmodifiedText": text or None, "code": code, "key": text,
                      "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk})
        async def shot(name):
            r = await cmd("Page.captureScreenshot", {"format": "png"})
            open(r"C:\Users\ssk90\AppData\Local\Temp\opencode\lab-" + name + ".png", "wb").write(
                base64.b64decode(r["result"]["data"]))
            print(name.upper() + "-SAVED")
        # Alt+Q to focus search
        await cmd("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Alt", "code": "AltLeft",
                  "windowsVirtualKeyCode": 18, "modifiers": 1})
        await key("char", "q", "KeyQ", 81)
        await cmd("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Alt", "code": "AltLeft",
                  "windowsVirtualKeyCode": 18})
        await asyncio.sleep(3)
        for ch in "Upload My Add-in":
            await key("char", ch)
            await asyncio.sleep(0.05)
        await asyncio.sleep(4)
        await shot("search")
asyncio.run(go())
print("DONE")
