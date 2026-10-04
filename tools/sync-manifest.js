/**
 * Single source of truth: manifest.production.xml
 * Generates release/manifest.xml (production copy).
 * Dev manifest (manifest.xml, localhost) is left untouched.
 *
 * Usage: node tools/sync-manifest.js [--check]
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "manifest.production.xml");
const dest = path.join(root, "release", "manifest.xml");

const checkOnly = process.argv.includes("--check");
const srcContent = fs.readFileSync(src, "utf8");

if (checkOnly) {
  if (!fs.existsSync(dest)) {
    console.error("CHECK FAILED: release/manifest.xml does not exist. Run node tools/sync-manifest.js");
    process.exit(1);
  }
  const destContent = fs.readFileSync(dest, "utf8");
  if (destContent !== srcContent) {
    console.error("CHECK FAILED: release/manifest.xml differs from manifest.production.xml. Run node tools/sync-manifest.js");
    process.exit(1);
  }
  console.log("release/manifest.xml is in sync with manifest.production.xml");
} else {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, srcContent);
  console.log("Synced manifest.production.xml -> release/manifest.xml");
}
