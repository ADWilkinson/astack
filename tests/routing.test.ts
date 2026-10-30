import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const scorer = resolve(import.meta.dir, "../evals/routing/score.py");
const cases = [{ q: "fix a typo", expect: [] }, { q: "verify a release", expect: ["ship"] }];
function run(result: unknown, baseline?: unknown) {
  const dir = mkdtempSync(resolve(tmpdir(), "astack-routing-"));
  try {
    writeFileSync(resolve(dir, "cases.json"), JSON.stringify(cases));
    writeFileSync(resolve(dir, "run.json"), JSON.stringify(result));
    const args = ["python3", scorer, resolve(dir, "cases.json"), resolve(dir, "run.json")];
    if (baseline !== undefined) {
      writeFileSync(resolve(dir, "before.json"), JSON.stringify(baseline));
      args.push("--compare", resolve(dir, "before.json"));
    }
    return Bun.spawnSync(args);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("routing rejects missing no-skill results instead of counting them as passes", () => {
  expect(run({ "2": ["ship"] }).exitCode).toBe(2);
});
test("routing rejects extra ids and malformed selections", () => {
  expect(run({ "1": [], "2": ["ship"], "3": [] }).exitCode).toBe(2);
  expect(run({ "1": "", "2": ["ship"] }).exitCode).toBe(2);
});
test("a complete correct routing run passes and a wrong selection fails", () => {
  expect(run({ "1": [], "2": ["ship"] }).exitCode).toBe(0);
  expect(run({ "1": ["astack"], "2": ["ship"] }).exitCode).toBe(1);
});
test("equal totals still expose per-task regressions and improvements", () => {
  const result = run({ "1": ["context"], "2": ["ship"] }, { "1": [], "2": [] });
  expect(result.exitCode).toBe(1);
  const text = result.stdout.toString();
  expect(text).toContain("REGRESSED 1");
  expect(text).toContain("IMPROVED 2");
});
