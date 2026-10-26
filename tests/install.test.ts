import { afterEach, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { parseArguments, runCLI } from "../src/cli";

const temps: string[] = [];
function fixture() {
  const root = realpathSync(mkdtempSync(resolve(tmpdir(), "astack-installer-")));
  temps.push(root);
  const pkg = resolve(root, "package");
  const project = resolve(root, "project");
  const home = resolve(root, "test-home");
  for (const path of [pkg, project, home]) mkdirSync(path);
  writeFileSync(resolve(pkg, "package.json"), JSON.stringify({ name: "astack-skills", version: "0.2.0", type: "module" }));
  writeFileSync(resolve(pkg, "catalog.json"), JSON.stringify({ skills: [
    { name: "astack", summary: "Own a task through delivery" },
    { name: "ship", summary: "Complete the selected release" },
  ] }));
  for (const name of ["astack", "ship"]) {
    const skill = resolve(pkg, "skills", name);
    for (const folder of ["references", "assets", "scripts", "agents"]) mkdirSync(resolve(skill, folder), { recursive: true });
    writeFileSync(resolve(skill, "SKILL.md"), `---\nname: ${name}\ndescription: A synthetic skill for installer behavior\n---\nRead [details](references/details.md).\n`);
    writeFileSync(resolve(skill, "references/details.md"), "Keep the complete skill together.\n");
    writeFileSync(resolve(skill, "agents/openai.yaml"), 'interface:\n  display_name: "Fixture"\n');
    writeFileSync(resolve(skill, "assets/pixel.bin"), Buffer.from([0, 255, 1, 128]));
    writeFileSync(resolve(skill, "scripts/example.sh"), "#!/bin/sh\nexit 0\n");
    chmodSync(resolve(skill, "scripts/example.sh"), 0o755);
  }
  return { root, pkg, project, home, runtime: { packageRoot: pkg, cwd: project, home } };
}
async function compiledCLI(f: ReturnType<typeof fixture>): Promise<string> {
  const outdir = resolve(f.pkg, "dist");
  const result = await Bun.build({ entrypoints: [resolve(import.meta.dir, "../src/cli.ts")], outdir, target: "node", format: "esm", naming: "astack.mjs" });
  expect(result.success).toBe(true);
  return resolve(outdir, "astack.mjs");
}
function originalSkills(f: ReturnType<typeof fixture>): string {
  const parent = resolve(f.project, ".claude/skills");
  for (const name of ["astack", "ship"]) {
    mkdirSync(resolve(parent, name), { recursive: true });
    writeFileSync(resolve(parent, name, "SKILL.md"), `Original ${name}\n`);
  }
  return parent;
}
function failurePreload(f: ReturnType<typeof fixture>, beforeFailure = ""): string {
  const path = resolve(f.root, "synthetic-failure.mjs");
  writeFileSync(path, `import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const rename = fs.renameSync;
fs.renameSync = function(source, destination) {
  if (String(source).includes(".astack-stage-ship-") && String(destination) === ${JSON.stringify(resolve(f.project, ".claude/skills/ship"))}) {
    ${beforeFailure}
    throw Object.assign(new Error("Synthetic rename failure"), { code: "EIO" });
  }
  return rename.call(this, source, destination);
};
syncBuiltinESMExports();
`);
  return path;
}
afterEach(() => { while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true }); });

test("no arguments show help without installing anything", () => {
  const f = fixture();
  const result = runCLI([], f.runtime);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("astack install");
  expect(readdirSync(f.project)).toEqual([]);
  expect(readdirSync(f.home)).toEqual([]);
});
test("list is read-only and exposes the packaged skill catalogue", () => {
  const f = fixture();
  const result = runCLI(["list", "--json"], f.runtime);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).skills.map((entry: any) => entry.name)).toEqual(["astack", "ship"]);
  expect(readdirSync(f.project)).toEqual([]);
});
test("installation requires an explicit agent selection", () => {
  const f = fixture();
  const result = runCLI(["install"], f.runtime);
  expect(result.code).toBe(2);
  expect(readdirSync(f.project)).toEqual([]);
});
test("selected skills copy complete resources to both project agents", () => {
  const f = fixture();
  const result = runCLI(["install", "--agent", "all", "--skill", "ship", "--json"], f.runtime);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).actions).toHaveLength(2);
  for (const agentDir of [".claude", ".agents"]) {
    const destination = resolve(f.project, agentDir, "skills/ship");
    expect(readFileSync(resolve(destination, "references/details.md"), "utf8")).toContain("complete skill");
    expect(readFileSync(resolve(destination, "assets/pixel.bin"))).toEqual(Buffer.from([0, 255, 1, 128]));
    expect(statSync(resolve(destination, "scripts/example.sh")).mode & 0o111).toBe(0o111);
    expect(existsSync(resolve(f.project, agentDir, "skills/astack"))).toBe(false);
  }
  expect(readdirSync(f.home)).toEqual([]);
});
test("dry-run has no destination or parent-directory side effects", () => {
  const f = fixture();
  const result = runCLI(["install", "--agent", "all", "--scope", "global", "--dry-run", "--json"], f.runtime);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).dryRun).toBe(true);
  expect(JSON.parse(result.stdout).actions).toHaveLength(4);
  expect(readdirSync(f.home)).toEqual([]);
  expect(readdirSync(f.project)).toEqual([]);
});
test("global scope uses the supplied test home and leaves the project untouched", () => {
  const f = fixture();
  const result = runCLI(["install", "--agent", "codex", "--scope", "global", "--skill", "ship"], f.runtime);
  expect(result.code).toBe(0);
  expect(existsSync(resolve(f.home, ".agents/skills/ship/SKILL.md"))).toBe(true);
  expect(readdirSync(f.project)).toEqual([]);
});
test("an identical installed skill is skipped rather than rewritten", () => {
  const f = fixture();
  const args = ["install", "--agent", "claude", "--skill", "ship", "--json"];
  expect(runCLI(args, f.runtime).code).toBe(0);
  const file = resolve(f.project, ".claude/skills/ship/SKILL.md");
  const inode = statSync(file).ino;
  const result = runCLI(args, f.runtime);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).actions[0].action).toBe("skip");
  expect(statSync(file).ino).toBe(inode);
});
test("conflicts are found before another selected skill is installed", () => {
  const f = fixture();
  const target = resolve(f.project, ".claude/skills/ship");
  mkdirSync(target, { recursive: true });
  writeFileSync(resolve(target, "SKILL.md"), "User-owned work\n");
  const result = runCLI(["install", "--agent", "claude"], f.runtime);
  expect(result.code).toBe(1);
  expect(existsSync(resolve(f.project, ".claude/skills/astack"))).toBe(false);
  expect(readFileSync(resolve(target, "SKILL.md"), "utf8")).toBe("User-owned work\n");
});
test("force repairs a partial selected skill and preserves unrelated files", () => {
  const f = fixture();
  const target = resolve(f.project, ".claude/skills/ship");
  const unrelated = resolve(f.project, ".claude/skills/another-skill");
  mkdirSync(target, { recursive: true });
  mkdirSync(unrelated);
  writeFileSync(resolve(target, "stale.md"), "Old partial install\n");
  writeFileSync(resolve(unrelated, "SKILL.md"), "Keep this\n");
  writeFileSync(resolve(f.project, "AGENTS.md"), "User instructions\n");
  const result = runCLI(["install", "--agent", "claude", "--skill", "ship", "--force"], f.runtime);
  expect(result.code).toBe(0);
  expect(existsSync(resolve(target, "stale.md"))).toBe(false);
  expect(existsSync(resolve(target, "references/details.md"))).toBe(true);
  expect(readFileSync(resolve(unrelated, "SKILL.md"), "utf8")).toBe("Keep this\n");
  expect(readFileSync(resolve(f.project, "AGENTS.md"), "utf8")).toBe("User instructions\n");
  expect(readdirSync(resolve(f.project, ".claude/skills")).some(name => name.startsWith(".astack-"))).toBe(false);
});
test("force still refuses a symlinked destination parent", () => {
  const f = fixture();
  const outside = resolve(f.root, "outside");
  mkdirSync(outside);
  symlinkSync(outside, resolve(f.project, ".agents"));
  const result = runCLI(["install", "--agent", "codex", "--force"], f.runtime);
  expect(result.code).toBe(1);
  expect(readdirSync(outside)).toEqual([]);
});
test("force refuses a dangling destination symlink without creating its target", () => {
  const f = fixture();
  const parent = resolve(f.project, ".claude/skills");
  mkdirSync(parent, { recursive: true });
  const outside = resolve(f.root, "outside-missing");
  symlinkSync(outside, resolve(parent, "ship"));
  const result = runCLI(["install", "--agent", "claude", "--skill", "ship", "--force"], f.runtime);
  expect(result.code).toBe(1);
  expect(existsSync(outside)).toBe(false);
});
test("skill traversal and unknown names do not create destinations", () => {
  const f = fixture();
  expect(runCLI(["install", "--agent", "claude", "--skill", "../../escaped"], f.runtime).code).toBe(2);
  expect(runCLI(["install", "--agent", "claude", "--skill", "missing"], f.runtime).code).toBe(2);
  expect(readdirSync(f.project)).toEqual([]);
  expect(existsSync(resolve(f.root, "escaped"))).toBe(false);
});
test("a package resource symlink is refused before any copy", () => {
  const f = fixture();
  const outside = resolve(f.root, "outside.md");
  writeFileSync(outside, "Synthetic private fixture\n");
  symlinkSync(outside, resolve(f.pkg, "skills/ship/references/external.md"));
  const result = runCLI(["install", "--agent", "claude"], f.runtime);
  expect(result.code).toBe(1);
  expect(readdirSync(f.project)).toEqual([]);
  expect(result.stderr).not.toContain("Synthetic private fixture");
});
test("missing packaged skill source does not create an installation", () => {
  const f = fixture();
  rmSync(resolve(f.pkg, "skills/ship/SKILL.md"));
  const result = runCLI(["install", "--agent", "claude"], f.runtime);
  expect(result.code).toBe(1);
  expect(readdirSync(f.project)).toEqual([]);
});
test("the compiled CLI runs on Node and resolves assets from its npm package", async () => {
  const f = fixture();
  const cli = await compiledCLI(f);
  const command = Bun.spawnSync(["node", cli, "install", "--agent", "codex", "--skill", "ship", "--json"], { cwd: f.project });
  expect(command.exitCode).toBe(0);
  expect(JSON.parse(command.stdout.toString()).package).toBe("astack-skills");
  expect(existsSync(resolve(f.project, ".agents/skills/ship/references/details.md"))).toBe(true);
});
test("npm bin symlinks resolve the package with and without preserved main symlinks", async () => {
  const f = fixture();
  const cli = await compiledCLI(f);
  const bin = resolve(f.project, "node_modules/.bin");
  mkdirSync(bin, { recursive: true });
  symlinkSync(cli, resolve(bin, "astack"));
  symlinkSync(cli, resolve(bin, "astack.mjs"));
  for (const args of [[resolve(bin, "astack")], ["--preserve-symlinks-main", resolve(bin, "astack.mjs")]]) {
    const command = Bun.spawnSync(["node", ...args, "list", "--json"], { cwd: f.project });
    expect(command.exitCode).toBe(0);
    expect(JSON.parse(command.stdout.toString()).skills.map((entry: any) => entry.name)).toEqual(["astack", "ship"]);
  }
  expect(existsSync(resolve(f.project, ".claude"))).toBe(false);
});
test("a later force-install failure restores every original selected directory", async () => {
  const f = fixture();
  const cli = await compiledCLI(f);
  const parent = originalSkills(f);
  const preload = failurePreload(f);
  const command = Bun.spawnSync(["node", "--import", preload, cli, "install", "--agent", "claude", "--force"], { cwd: f.project });
  expect(command.exitCode).toBe(1);
  expect(command.stderr.toString()).toContain("Synthetic rename failure");
  expect(command.stderr.toString()).not.toContain("Rollback incomplete");
  for (const name of ["astack", "ship"]) expect(readFileSync(resolve(parent, name, "SKILL.md"), "utf8")).toBe(`Original ${name}\n`);
  expect(readdirSync(parent).sort()).toEqual(["astack", "ship"]);
});
test("rollback refuses a changed parent and preserves files beyond its symlink", async () => {
  const f = fixture();
  const cli = await compiledCLI(f);
  const parent = originalSkills(f);
  const held = resolve(f.root, "held-original-parent");
  const outside = resolve(f.root, "outside");
  mkdirSync(resolve(outside, "astack"), { recursive: true });
  writeFileSync(resolve(outside, "astack/keep.txt"), "Keep synthetic outside data\n");
  const preload = failurePreload(f, `rename(${JSON.stringify(parent)}, ${JSON.stringify(held)});
    fs.symlinkSync(${JSON.stringify(outside)}, ${JSON.stringify(parent)});`);
  const command = Bun.spawnSync(["node", "--import", preload, cli, "install", "--agent", "claude", "--force"], { cwd: f.project });
  expect(command.exitCode).toBe(1);
  expect(command.stderr.toString()).toContain("Rollback incomplete");
  expect(command.stderr.toString()).toContain("Refusing symlinked destination");
  expect(readFileSync(resolve(outside, "astack/keep.txt"), "utf8")).toBe("Keep synthetic outside data\n");
  expect(readdirSync(outside)).toEqual(["astack"]);
  for (const name of ["astack", "ship"]) {
    const backup = readdirSync(held).find(entry => entry.startsWith(`.astack-backup-${name}-`));
    expect(backup).toBeDefined();
    expect(readFileSync(resolve(held, backup!, "SKILL.md"), "utf8")).toBe(`Original ${name}\n`);
  }
});
test("rollback preserves a committed target replaced concurrently by another owner", async () => {
  const f = fixture();
  const cli = await compiledCLI(f);
  const parent = originalSkills(f);
  const target = resolve(parent, "astack");
  const held = resolve(f.root, "held-installed-skill");
  const preload = failurePreload(f, `rename(${JSON.stringify(target)}, ${JSON.stringify(held)});
    fs.mkdirSync(${JSON.stringify(target)});
    fs.writeFileSync(${JSON.stringify(resolve(target, "keep.txt"))}, "New owner data\\n");`);
  const command = Bun.spawnSync(["node", "--import", preload, cli, "install", "--agent", "claude", "--force"], { cwd: f.project });
  expect(command.exitCode).toBe(1);
  expect(command.stderr.toString()).toContain("Rollback incomplete");
  expect(readFileSync(resolve(target, "keep.txt"), "utf8")).toBe("New owner data\n");
  expect(readFileSync(resolve(parent, "ship/SKILL.md"), "utf8")).toBe("Original ship\n");
  const backup = readdirSync(parent).find(entry => entry.startsWith(".astack-backup-astack-"));
  expect(backup).toBeDefined();
  expect(readFileSync(resolve(parent, backup!, "SKILL.md"), "utf8")).toBe("Original astack\n");
});
test("malformed catalogues fail before any installation side effects", () => {
  const f = fixture();
  const badCatalogues = [null, [], {}, { skills: [] }, { skills: [null] }, { skills: [[]] },
    { skills: [{ name: "../escape", summary: "Invalid path" }] },
    { skills: [{ name: "ship", summary: null }] },
    { skills: [{ name: "ship", summary: "One" }, { name: "ship", summary: "Two" }] }];
  for (const catalogue of badCatalogues) {
    writeFileSync(resolve(f.pkg, "catalog.json"), JSON.stringify(catalogue));
    for (const args of [["list", "--json"], ["install", "--agent", "all", "--force"]]) {
      const result = runCLI(args, f.runtime);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Invalid package catalogue");
    }
    expect(readdirSync(f.project)).toEqual([]);
    expect(readdirSync(f.home)).toEqual([]);
  }
});
test("malformed package metadata fails before any installation side effects", () => {
  const f = fixture();
  for (const metadata of [null, [], {}, { name: "astack-skills", version: null }]) {
    writeFileSync(resolve(f.pkg, "package.json"), JSON.stringify(metadata));
    const result = runCLI(["install", "--agent", "all", "--force"], f.runtime);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Invalid package metadata");
    expect(readdirSync(f.project)).toEqual([]);
    expect(readdirSync(f.home)).toEqual([]);
  }
});
test("repeated and equals-style selectors are normalized", () => {
  const result = parseArguments(["install", "--agent=claude", "--agent", "all", "--skill=ship", "--skill", "ship,astack"]);
  expect(result.agents).toEqual(["claude", "codex"]);
  expect(result.skills).toEqual(["ship", "astack"]);
});
