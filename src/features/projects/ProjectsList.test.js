/**
 * Test: entfernter Hinweistext (Praxiskorrektur-Sprint, Testfall I).
 * Durchsucht rekursiv src/ nach dem Text, damit er nicht an einer anderen
 * Stelle unbemerkt stehen bleibt.
 * Ausführen: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(dir, "..", "..");
const REMOVED_HINT = "Erfassung am PC. Workflow-Bearbeitung mobil oder am Tablet.";

function collectSourceFiles(startDir) {
  const files = [];
  for (const entry of readdirSync(startDir)) {
    const full = path.join(startDir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(jsx?|css)$/.test(entry) && !entry.endsWith(".test.js")) {
      files.push(full);
    }
  }
  return files;
}

describe("I) Hinweistext 'Erfassung am PC. Workflow-Bearbeitung mobil oder am Tablet.' entfernt", () => {
  it("kommt in keiner produktiven Quelldatei (src/) mehr vor", () => {
    const offenders = collectSourceFiles(srcRoot).filter((file) =>
      readFileSync(file, "utf8").includes(REMOVED_HINT)
    );
    assert.deepEqual(offenders, []);
  });
});
