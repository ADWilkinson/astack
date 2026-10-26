import { lstatSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inside, validatePackage } from "./package";

export function auditNpmFiles(root: string, files: string[], tracked: Set<string>): string[] {
  const errors: string[] = [];
  for (const file of files) {
    const path = resolve(root, file);
    if (!inside(root, path) || /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.npmrc|node_modules)(?:\/|$)/.test(file)) {
      errors.push(`Unsafe npm entry: ${file}`); continue;
    }
    if (!tracked.has(file) && file !== "dist/astack.mjs") errors.push(`Uncommitted npm entry: ${file}`);
    if (!lstatSync(path, { throwIfNoEntry: false })?.isFile()) errors.push(`Npm entry must be a regular file: ${file}`);
  }
  if (!files.includes("dist/astack.mjs")) errors.push("Missing compiled CLI");
  return errors;
}

export function prepareNpm(root: string): void {
  const run = (cmd: string[]) => {
    const result = Bun.spawnSync(cmd, { cwd: root, stdout: "pipe", stderr: "pipe" });
    if (result.exitCode !== 0) throw new Error(result.stderr.toString() || `${cmd[0]} failed`);
    return result.stdout.toString();
  };
  const findings = validatePackage(root);
  if (findings.length) throw new Error(findings.map(x => `${x.file}: ${x.message}`).join("\n"));
  if (run(["git", "status", "--porcelain", "--untracked-files=normal"]).trim())
    throw new Error("Commit intended changes before packing npm; the checkout must be clean");
  const tracked = new Set(run(["git", "ls-files", "-z"]).split("\0").filter(Boolean));
  run(["bun", "run", "build"]);
  const pack = JSON.parse(run(["npm", "pack", "--dry-run", "--ignore-scripts", "--json"]));
  const errors = auditNpmFiles(root, pack[0].files.map((x: { path: string }) => x.path), tracked);
  if (errors.length) throw new Error(errors.join("\n"));
  console.error(`npm package audited: ${pack[0].files.length} committed entries and compiled CLI`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { prepareNpm(resolve(import.meta.dir, "..")); }
  catch (error) { console.error(String(error)); process.exitCode = 1; }
}
