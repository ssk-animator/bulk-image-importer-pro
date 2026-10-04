"""LAB TEST 6: press Down + Enter on the search suggestion, screenshot result."""
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
        i = 400
        async def cmd(m, p=None):
            nonlocal i
            i += 1
            await ws.send(json.dumps({"id": i, "method": m, "params": p or {}}))
            return json.loads(await ws.recv())
        async def press(vk, key, code):
            await cmd("Input.dispatchKeyEvent", {"type": "keyDown", "key": key, "code": code,
                      "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk})
            await asyncio.sleep(0.2)
            await cmd("Input.dispatchKeyEvent", {"type": "keyUp", "key": key, "code": code,
                      "windowsVirtualKeyCode": vk, "nativeVirtualKeyCode": vk})
            await asyncio.sleep(0.5)
        await press(40, "ArrowDown", "ArrowDown")
        await press(40, "ArrowDown", "ArrowDown")
        r = await cmd("Page.captureScreenshot", {"format": "png"})
        open(r"C:\Users\ssk90\AppData\Local\Temp\opencode\lab-suggest.png", "wb").write(
            base64.b64decode(r["result"]["data"]))
        print("SUGGEST-SAVED")
        await press(13, "Enter", "Enter")
        await asyncio.sleep(6)
        r = await cmd("Page.captureScreenshot", {"format": "png"})
        open(r"C:\Users\ssk90\AppData\Local\Temp\opencode\lab-dialog.png", "wb").write(
            base64.b64decode(r["result"]["data"]))
        print("DIALOG-SAVED")
asyncio.run(go())
print("DONE")
