/**
 * Version single source of truth: package.json "version" (semver, e.g. 1.0.0).
 * Propagates to manifest.production.xml <Version>1.0.0.0</Version> (4-part)
 * and installer/BulkImageImporter.iss #define MyAppVersion.
 *
 * Usage: node tools/sync-version.js [--check]
 */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const semver = pkg.version.trim();
const fourPart = semver.split(".").length === 4 ? semver : semver + ".0";

function patch(file, regex, replacement, label) {
  const content = fs.readFileSync(file, "utf8");
  if (!regex.test(content)) throw new Error(`${label}: pattern not found in ${file}`);
  const next = content.replace(regex, replacement);
  if (process.argv.includes("--check")) {
    if (next !== content) {
      console.error(`VERSION CHECK FAILED: ${file} not in sync with package.json ${semver}`);
      process.exitCode = 1;
    }
  } else {
    fs.writeFileSync(file, next);
    console.log(`Synced ${label} -> ${file}`);
  }
}

patch(
  path.join(root, "manifest.production.xml"),
  /<Version>\d+\.\d+\.\d+(\.\d+)?<\/Version>/,
  `<Version>${fourPart}</Version>`,
  `manifest version ${fourPart}`
);
patch(
  path.join(root, "installer", "BulkImageImporter.iss"),
  /#define MyAppVersion "[^"]+"/,
  `#define MyAppVersion "${semver}"`,
  `installer version ${semver}`
);
if (!process.argv.includes("--check")) console.log(`Version source of truth: package.json ${semver}`);
