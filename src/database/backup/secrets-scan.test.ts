import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const SCAN_DIRS = ["src", "src-tauri/src"];
const SECRET_PATTERNS = [
  /R2_ACCESS_KEY_ID/i,
  /R2_SECRET_ACCESS_KEY/i,
  /AWS_SECRET_ACCESS_KEY/i,
  /AWS_ACCESS_KEY_ID/i,
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx|rs|json)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("frontend bundle secret scan", () => {
  it("does not contain cloud credential env keys in app sources", () => {
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      const fullDir = path.join(ROOT, dir);
      for (const file of walk(fullDir)) {
        const content = readFileSync(file, "utf8");
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            offenders.push(path.relative(ROOT, file));
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
