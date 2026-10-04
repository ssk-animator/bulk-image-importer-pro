"""LAB TEST 5b: CDP mouse click into search box, type, screenshot suggestions."""
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
        i = 300
        async def cmd(m, p=None):
            nonlocal i
            i += 1
            await ws.send(json.dumps({"id": i, "method": m, "params": p or {}}))
            return json.loads(await ws.recv())
        # clear cell A1 edit state first: Escape, then click search box (~590,24)
        await cmd("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Escape", "code": "Escape",
                  "windowsVirtualKeyCode": 27})
        await cmd("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Escape", "code": "Escape",
                  "windowsVirtualKeyCode": 27})
        await asyncio.sleep(1)
        for typ in ("mousePressed", "mouseReleased"):
            await cmd("Input.dispatchMouseEvent", {"type": typ, "x": 590, "y": 24, "button": "left",
                      "clickCount": 1})
            await asyncio.sleep(0.3)
        await asyncio.sleep(2)
        for ch in "Upload My Add-in":
            await cmd("Input.dispatchKeyEvent", {"type": "char", "text": ch, "unmodifiedText": ch,
                      "key": ch, "windowsVirtualKeyCode": ord(ch.upper()) if ch.isalpha() else 0})
            await asyncio.sleep(0.05)
        await asyncio.sleep(4)
        r = await cmd("Page.captureScreenshot", {"format": "png"})
        open(r"C:\Users\ssk90\AppData\Local\Temp\opencode\lab-search2.png", "wb").write(
            base64.b64decode(r["result"]["data"]))
        print("SEARCH2-SAVED")
asyncio.run(go())
print("DONE")
