/**
 * Sync semantic version across package.json, tauri.conf.json, and Cargo.toml.
 * Usage: node scripts/bump-version.mjs 0.1.13
 *        npm run version:bump -- 0.1.13
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2]?.trim();

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node scripts/bump-version.mjs <MAJOR.MINOR.PATCH>");
  console.error("Example: node scripts/bump-version.mjs 0.1.13");
  process.exit(1);
}

function updatePackageJson() {
  const path = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.version = version;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`Updated ${path}`);
}

function updateTauriConf() {
  const path = join(root, "src-tauri", "tauri.conf.json");
  const conf = JSON.parse(readFileSync(path, "utf8"));
  conf.version = version;
  writeFileSync(path, `${JSON.stringify(conf, null, 2)}\n`);
  console.log(`Updated ${path}`);
}

function updateCargoToml() {
  const path = join(root, "src-tauri", "Cargo.toml");
  let text = readFileSync(path, "utf8");
  const next = text.replace(/^version = ".*"$/m, `version = "${version}"`);
  if (next === text) {
    console.error(`Failed to update version in ${path}`);
    process.exit(1);
  }
  writeFileSync(path, next);
  console.log(`Updated ${path}`);
}

updatePackageJson();
updateTauriConf();
updateCargoToml();
console.log(`Version set to ${version} in all targets.`);
