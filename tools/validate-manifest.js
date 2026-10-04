/**
 * Manifest audit for Bulk Image Importer Pro.
 * Fails the build on: invalid XML, missing elements, duplicate IDs,
 * missing/incorrect icon mappings, HTTP URLs, wrong host, missing
 * taskpane/FunctionFile references, or missing asset files.
 *
 * Usage: node tools/validate-manifest.js [manifestPath] [--assets src/assets]
 */
const fs = require("fs");
const path = require("path");

const manifestPath = process.argv[2] || path.join(__dirname, "..", "manifest.production.xml");
const assetsDir = process.argv.includes("--assets")
  ? process.argv[process.argv.indexOf("--assets") + 1]
  : path.join(__dirname, "..", "src", "assets");

const PROD_HOST = "https://bulk-image-importer-pro.pages.dev";
const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

let xml;
try {
  xml = fs.readFileSync(manifestPath, "utf8");
} catch (e) {
  console.error(`VALIDATION FAILED: cannot read ${manifestPath}: ${e.message}`);
  process.exit(1);
}

// 1. XML well-formedness (lightweight check via balanced tags for key elements)
for (const tag of ["OfficeApp", "VersionOverrides", "Hosts", "Resources", "bt:Images", "bt:Urls"]) {
  const open = (xml.match(new RegExp(`<${tag}[\\s>]`, "g")) || []).length;
  const close = (xml.match(new RegExp(`</${tag}>`, "g")) || []).length;
  if (open === 0) fail(`Missing element <${tag}>`);
  else if (open !== close) fail(`Unbalanced <${tag}>: ${open} open vs ${close} close`);
}

// 2. Required top-level elements
for (const needle of ["<Id>", "<Version>", "<ProviderName>", "<DisplayName", "<Description",
  "<IconUrl", "<HighResolutionIconUrl", "<SupportUrl", "<AppDomains", "<Hosts>",
  "<Requirements", "<Permissions>", "<DefaultSettings>", "FunctionFile"]) {
  if (!xml.includes(needle)) fail(`Missing required element/content: ${needle}`);
}

// 3. No HTTP (non-TLS) URLs in DefaultValue
const urlValues = [...xml.matchAll(/DefaultValue="(https?:[^"]+)"/g)].map((m) => m[1]);
const httpUrls = urlValues.filter((u) => u.startsWith("http://"));
if (httpUrls.length) fail(`Insecure HTTP URLs found: ${httpUrls.join(", ")}`);

// 4. Production host check (only enforced for production manifest)
if (manifestPath.includes("production") || manifestPath.includes("release")) {
  const offHost = urlValues.filter((u) => u.startsWith("https://") && !u.startsWith(PROD_HOST));
  if (offHost.length) fail(`URLs not on production host ${PROD_HOST}: ${offHost.join(", ")}`);
}

// 5. Resource IDs: duplicates
const imageIds = [...xml.matchAll(/<bt:Image id="([^"]+)"/g)].map((m) => m[1]);
const seen = new Set();
for (const id of imageIds) {
  if (seen.has(id)) fail(`Duplicate bt:Image id: ${id}`);
  seen.add(id);
}
const urlIds = [...xml.matchAll(/<bt:Url id="([^"]+)"/g)].map((m) => m[1]);
if (!urlIds.includes("Taskpane.Url")) fail("Missing bt:Url Taskpane.Url");
if (!urlIds.includes("Commands.Url")) fail("Missing bt:Url Commands.Url (FunctionFile)");

// 6. Every resid referenced by Desktop/WebFormFactor must exist in Resources
const resids = [...xml.matchAll(/resid="([^"]+)"/g)].map((m) => m[1]);
const defined = new Set([...imageIds, ...urlIds,
  ...[...xml.matchAll(/<bt:String id="([^"]+)"/g)].map((m) => m[1])]);
for (const r of new Set(resids)) {
  if (!defined.has(r)) fail(`resid referenced but not defined in Resources: ${r}`);
}

// 7. Icon mapping checks
const imageUrlById = {};
for (const m of xml.matchAll(/<bt:Image id="([^"]+)" DefaultValue="([^"]+)"/g)) {
  imageUrlById[m[1]] = m[2];
}
const commandPrefixes = ["ImportImages", "ImportFolder", "ImportRow", "ImportColumn",
  "ImportGrid", "ImportContactSheet", "ClearImages", "Settings"];
for (const prefix of commandPrefixes) {
  for (const size of ["16", "32", "80"]) {
    const id = `${prefix}.Icon${size}`;
    if (!imageUrlById[id]) fail(`Missing icon resource: ${id}`);
  }
}
// Distinctness: no two commands may share the same asset (unless explicitly intended)
const urlToPrefixes = {};
for (const prefix of [...commandPrefixes, "ImportGroup", "LayoutGroup", "ToolsGroup"]) {
  const u16 = imageUrlById[`${prefix}.Icon16`];
  if (u16) {
    urlToPrefixes[u16] = urlToPrefixes[u16] || [];
    urlToPrefixes[u16].push(prefix);
  }
}
for (const [url, prefixes] of Object.entries(urlToPrefixes)) {
  if (prefixes.length > 1) {
    fail(`Duplicate icon asset shared by ${prefixes.join(", ")}: ${url}`);
  }
}
// Each icon URL must end with the expected per-command filename
const expectedFile = {
  ImportImages: "import-images", ImportFolder: "import-folder", ImportRow: "import-row",
  ImportColumn: "import-column", ImportGrid: "import-grid",
  ImportContactSheet: "contact-sheet", ClearImages: "clear-images", Settings: "settings",
  ImportGroup: "group-import", LayoutGroup: "group-layout", ToolsGroup: "group-tools",
};
for (const [prefix, slug] of Object.entries(expectedFile)) {
  for (const size of ["16", "32", "80"]) {
    const url = imageUrlById[`${prefix}.Icon${size}`];
    if (url && !url.endsWith(`/assets/icons/${slug}-${size}.png`)) {
      fail(`${prefix}.Icon${size} points to ${url}, expected */assets/icons/${slug}-${size}.png`);
    }
  }
}

// 8. Referenced icon files must exist on disk
for (const [id, url] of Object.entries(imageUrlById)) {
  const m = url.match(/\/assets\/(.+)$/);
  if (m) {
    const local = path.join(assetsDir, m[1].replace(/\//g, path.sep));
    if (!fs.existsSync(local)) fail(`Icon resource ${id} -> missing file: ${local} (URL ${url})`);
    else {
      // verify PNG dimensions match the declared size
      try {
        const buf = fs.readFileSync(local);
        // minimal PNG IHDR parse (width/height at bytes 16..24)
        if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
          const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
          const mSize = id.match(/Icon(16|32|80)$/);
          if (mSize && (w !== +mSize[1] || h !== +mSize[1])) {
            fail(`Icon ${id} file is ${w}x${h}, expected ${mSize[1]}x${mSize[1]}: ${local}`);
          }
        }
      } catch (e) { warn(`Could not verify dimensions of ${local}: ${e.message}`); }
    }
  }
}

// Report
for (const w of warnings) console.warn("WARNING: " + w);
if (errors.length) {
  console.error(`\nMANIFEST VALIDATION FAILED (${errors.length} error(s)) — ${manifestPath}`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
} else {
  console.log(`Manifest validation passed: ${manifestPath}`);
  console.log(`  images: ${imageIds.length}, urls: ${urlIds.length}, distinct icon assets: ${Object.keys(urlToPrefixes).length}`);
}
