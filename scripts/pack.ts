import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { packageEntries, readJson, validatePackage } from "./package";

const root = resolve(import.meta.dir, "..");
const findings = validatePackage(root);
if (findings.length) {
  for (const finding of findings) console.error(`${finding.file}: ${finding.message}`);
  process.exit(1);
}
const pkg = readJson(resolve(root, "package.json"));
const runGit = (args: string[]) => Bun.spawnSync(["git", "-C", root, ...args], { stdout: "pipe", stderr: "pipe" });
const head = runGit(["rev-parse", "--verify", "HEAD"]);
if (head.exitCode !== 0) {
  console.error("Commit the package before creating a release archive");
  process.exit(1);
}
const status = runGit(["status", "--porcelain", "--untracked-files=normal"]);
if (status.exitCode !== 0 || status.stdout.toString().trim()) {
  console.error("Release archives require a clean committed checkout; commit intended changes first");
  process.exit(1);
}
mkdirSync(resolve(root, "dist"), { recursive: true });
const archive = resolve(root, "dist", `astack-${pkg.version}.tar.gz`);
const result = runGit(["archive", "--format=tar.gz", "--prefix=astack/", `--output=${archive}`, "HEAD", ...packageEntries]);
if (result.exitCode !== 0) {
  console.error(result.stderr.toString());
  process.exit(result.exitCode || 1);
}
console.log(archive);
