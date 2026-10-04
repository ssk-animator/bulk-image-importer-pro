/**
 * Mock-Excel benchmark for the batched importer (tools/benchmark-batching.js).
 *
 * Stubs the Office/Excel globals with call counting + small simulated
 * round-trip latency, compiles the real src/services/excel-service.ts with
 * tsc, and runs 10/20/50-image imports through the REAL insertImages code.
 *
 * Asserts the architectural guarantees:
 *  - Excel.run calls == number of batches (NOT number of images)
 *  - context.sync calls == 2 per batch (NOT 2 per image)
 *  - no 250ms per-image delay (wall time bounded)
 *  - oversize images fall back to single-image batches without failing
 *
 * Honest scope: this measures request-architecture (call counts) and JS-side
 * timing with simulated latency. Real wall-clock in Excel is logged by the
 * in-app benchmark (console) and must be confirmed in Excel.
 *
 * Usage: node tools/benchmark-batching.js
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(__dirname, ".bench-tmp");
const SYNC_LATENCY_MS = 5; // simulated Excel round-trip per sync

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  // 1. Compile the real service to CommonJS.
  fs.rmSync(OUT, { recursive: true, force: true });
  execSync(
    `npx tsc src/services/excel-service.ts --outDir tools/.bench-tmp ` +
    `--module commonjs --target es2020 --skipLibCheck --declaration false ` +
    `--sourceMap false --noUnusedLocals false --noUnusedParameters false`,
    { cwd: ROOT, stdio: "pipe" }
  );

  // 2. Stub globals BEFORE requiring the compiled module.
  const stats = { runs: 0, syncs: 0, addImageCalls: 0 };
  const fakeCell = () => ({ left: 0, top: 0, width: 200, height: 200, load() {} });
  const fakeShape = () => ({ placement: 0, left: 0, top: 0, width: 0, height: 0 });
  globalThis.Excel = {
    Placement: { twoCell: 1 },
    ShapeType: { image: "Image" },
    run: async (fn) => {
      stats.runs++;
      const context = {
        workbook: {
          worksheets: {
            getActiveWorksheet: () => ({
              shapes: { addImage: () => { stats.addImageCalls++; return fakeShape(); } },
              getCell: () => fakeCell(),
            }),
          },
        },
        sync: async () => { stats.syncs++; await sleep(SYNC_LATENCY_MS); },
      };
      return fn(context);
    },
  };
  globalThis.Office = {};
  globalThis.window = { setInterval: setInterval, clearInterval: clearInterval };

  const svc = require(path.join(OUT, "services", "excel-service.js"));
  const prog = require(path.join(OUT, "services", "progress-service.js"));
  const { ExcelService, MAX_BATCH_PAYLOAD_CHARS } = svc;

  const makeImages = (n, base64Chars, oversizeIndexes = []) =>
    Array.from({ length: n }, (_, i) => ({
      item: {
        dataUrl: "data:image/png;base64," + "A".repeat(oversizeIndexes.includes(i) ? MAX_BATCH_PAYLOAD_CHARS + 100 : base64Chars),
        metaData: { filename: `img-${i}.png` },
      },
      width: 100, height: 100, offsetRow: i, offsetCol: 0,
      totalWidth: 100, totalHeight: 100,
    }));

  const results = [];
  for (const n of [10, 20, 50]) {
    for (const mode of ["shapes", "cell"]) {
      stats.runs = 0; stats.syncs = 0; stats.addImageCalls = 0;
      const service = new ExcelService();
      const ps = new prog.ProgressService();
      ps.start(n);
      const images = makeImages(n, 60000, n === 50 ? [49] : []);
      const t0 = Date.now();
      const res = await service.insertImages(images, 10, ps, mode === "cell");
      const wallMs = Date.now() - t0;
      const maxRuns = Math.ceil(n / 10) + 1; // batches + per-image fallback headroom (none expected)
      const passRuns = stats.runs <= maxRuns;
      const passSyncs = stats.syncs <= maxRuns * 2;
      const passDelay = wallMs < n * 250; // old code guaranteed >= n*250ms of pure sleep
      const pass = res.success === n && passRuns && passSyncs && passDelay;
      results.push({ n, mode, wallMs, runs: stats.runs, syncs: stats.syncs, ...res, pass });
      console.log(
        `${pass ? "PASS" : "FAIL"} n=${n} mode=${mode} wall=${wallMs}ms ` +
        `runs=${stats.runs} syncs=${stats.syncs} success=${res.success} failed=${res.failed}`
      );
    }
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  if (results.some((r) => !r.pass)) { console.error("BENCHMARK FAILED"); process.exit(1); }
  const worst = Math.max(...results.map((r) => r.wallMs / r.n));
  console.log(`All benchmarks pass. Worst mock avg: ${worst.toFixed(1)}ms/image (incl. simulated latency).`);
  process.exit(0); // ProgressService intervals would otherwise keep node alive
}

main().catch((e) => { console.error(e); process.exit(1); });
