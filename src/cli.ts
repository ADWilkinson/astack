#!/usr/bin/env node
import {
  chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  realpathSync, renameSync, rmSync, writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

type Agent = "claude" | "codex";
type Scope = "project" | "global";
type Entry = { name: string; summary: string };
type File = { path: string; data: Buffer; mode: number };
type Tree = { files: File[]; directories: string[] };
export type Options = {
  command: "help" | "version" | "list" | "install";
  agents: Agent[]; scope: Scope; skills: string[]; force: boolean; dryRun: boolean; json: boolean;
};
export type Runtime = { packageRoot?: string; cwd?: string; home?: string };
export type Result = { code: number; stdout: string; stderr: string };
type Plan = { agent: Agent; name: string; base: string; target: string; action: "install" | "replace" | "skip"; tree: Tree };
type OwnedDirectory = { path: string; dev: number; ino: number };
type Change = Plan & { stage?: OwnedDirectory; backup?: OwnedDirectory; committed?: OwnedDirectory };

class CliError extends Error {
  constructor(message: string, readonly code = 1) { super(message); }
}
const skillName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const help = `astack: install the standalone skill package\n\nUsage:\n  astack list [--json]\n  astack install --agent claude|codex|all [options]\n\nOptions:\n  --scope project|global   Destination scope (default: project)\n  --skill NAME[,NAME]     Install selected skills; repeatable (default: all)\n  --dry-run               Show the plan without writing files\n  --force                 Replace existing regular skill folders\n  --json                  Emit a machine-readable result\n  --help                  Show this help\n  --version               Show the package version\n\nProject destinations are .claude/skills and .agents/skills. Global scope uses\nthose paths under the user's home. Symlinked destinations are always refused.\nNo-argument invocation shows help; installation never runs automatically.\n`;

function within(base: string, target: string): boolean {
  const rel = relative(base, target);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}
function info(path: string) { return lstatSync(path, { throwIfNoEntry: false }); }
function validateName(name: unknown): asserts name is string {
  if (typeof name !== "string" || name.length > 64 || !skillName.test(name))
    throw new CliError("Invalid skill name; use a published name from astack list", 2);
}
function jsonFile(path: string): any {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new CliError(`Cannot read package metadata: ${path}`); }
}
function packageRoot(override?: string): string {
  const path = realpathSync(override ?? resolve(dirname(realpathSync(fileURLToPath(import.meta.url))), ".."));
  if (!existsSync(resolve(path, "catalog.json")) || !existsSync(resolve(path, "skills")))
    throw new CliError("The installed package is incomplete: catalog.json and skills/ are required");
  return path;
}
function catalogue(root: string): Entry[] {
  const metadata = jsonFile(resolve(root, "catalog.json"));
  const entries = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata.skills : undefined;
  if (!Array.isArray(entries) || !entries.length) throw new CliError("Invalid package catalogue");
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
        typeof entry.name !== "string" || entry.name.length > 64 || !skillName.test(entry.name) ||
        seen.has(entry.name) || typeof entry.summary !== "string") throw new CliError("Invalid package catalogue");
    seen.add(entry.name);
  }
  return entries;
}

export function parseArguments(args: string[]): Options {
  const options: Options = { command: "help", agents: [], scope: "project", skills: [], force: false, dryRun: false, json: false };
  if (!args.length) return options;
  if (args.includes("--help") || args.includes("-h")) return options;
  if (args.length === 1 && args[0] === "--version") return { ...options, command: "version" };
  const command = args[0];
  if (command !== "list" && command !== "install") throw new CliError(`Unknown command: ${command}. Use astack --help`, 2);
  options.command = command;
  const take = (index: number, inline: string | undefined, flag: string): [string, number] => {
    const value = inline ?? args[index + 1];
    if (!value || value.startsWith("--")) throw new CliError(`Missing value for ${flag}`, 2);
    return [value, inline === undefined ? index + 1 : index];
  };
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    const equal = arg.indexOf("=");
    const flag = equal < 0 ? arg : arg.slice(0, equal);
    const inline = equal < 0 ? undefined : arg.slice(equal + 1);
    if (["--force", "--dry-run", "--json"].includes(flag)) {
      if (inline !== undefined) throw new CliError(`${flag} does not take a value`, 2);
      if (flag === "--force") options.force = true;
      if (flag === "--dry-run") options.dryRun = true;
      if (flag === "--json") options.json = true;
    } else if (flag === "--agent") {
      const [value, end] = take(i, inline, flag); i = end;
      const values = value.split(",");
      if (values.some(value => !["claude", "codex", "all"].includes(value)))
        throw new CliError("--agent must be claude, codex or all", 2);
      options.agents.push(...values.flatMap(value => value === "all" ? ["claude", "codex"] as Agent[] : [value as Agent]));
    } else if (flag === "--scope") {
      const [value, end] = take(i, inline, flag); i = end;
      if (value !== "project" && value !== "global") throw new CliError("--scope must be project or global", 2);
      options.scope = value;
    } else if (flag === "--skill") {
      const [value, end] = take(i, inline, flag); i = end;
      const values = value.split(",");
      for (const name of values) validateName(name);
      options.skills.push(...values);
    } else throw new CliError(`Unknown option: ${arg}`, 2);
  }
  options.agents = [...new Set(options.agents)];
  options.skills = [...new Set(options.skills)];
  if (command === "install" && !options.agents.length) throw new CliError("Choose --agent claude, codex or all before installing", 2);
  if (command === "list" && (options.agents.length || options.skills.length || options.force || options.dryRun || options.scope !== "project"))
    throw new CliError("astack list accepts only --json", 2);
  return options;
}

function assertSafePath(base: string, target: string): void {
  if (!within(base, target)) throw new CliError("Destination escapes the selected installation root");
  const root = info(base);
  if (!root || root.isSymbolicLink() || !root.isDirectory()) throw new CliError(`Installation root changed: ${base}`);
  let path = base;
  const segments = relative(base, target).split(sep).filter(Boolean);
  for (const segment of segments) {
    path = resolve(path, segment);
    const stat = info(path);
    if (stat?.isSymbolicLink()) throw new CliError(`Refusing symlinked destination: ${path}`);
    if (stat && !stat.isDirectory()) throw new CliError(`Destination component is not a directory: ${path}`);
  }
}
function directoryIdentity(path: string): OwnedDirectory {
  const stat = info(path);
  if (!stat?.isDirectory() || stat.isSymbolicLink()) throw new CliError(`Expected a regular directory: ${path}`);
  return { path, dev: stat.dev, ino: stat.ino };
}
function assertOwnedDirectory(base: string, directory: OwnedDirectory): void {
  assertSafePath(base, directory.path);
  const stat = info(directory.path);
  if (!stat || stat.dev !== directory.dev || stat.ino !== directory.ino)
    throw new CliError(`Directory changed; preserving it: ${directory.path}`);
}
function snapshot(source: string): Tree {
  const files: File[] = [];
  const directories: string[] = [];
  const visit = (path: string) => {
    const stat = info(path);
    if (!stat || stat.isSymbolicLink()) throw new CliError(`Package resources must not be symlinks: ${path}`);
    if (stat.isDirectory()) {
      if (path !== source) directories.push(relative(source, path));
      for (const name of readdirSync(path).sort()) visit(resolve(path, name));
    } else if (stat.isFile()) files.push({ path: relative(source, path), data: readFileSync(path), mode: stat.mode & 0o777 });
    else throw new CliError(`Unsupported package resource: ${path}`);
  };
  visit(source);
  if (!files.some(file => file.path === "SKILL.md")) throw new CliError(`Missing SKILL.md in ${source}`);
  return { files, directories };
}
function sameTree(target: string, expected: Tree): boolean {
  try {
    const actual = snapshot(target);
    if (actual.files.length !== expected.files.length || actual.directories.join("\0") !== expected.directories.join("\0")) return false;
    const digest = (data: Buffer) => createHash("sha256").update(data).digest("hex");
    return actual.files.every((file, index) => file.path === expected.files[index]!.path &&
      digest(file.data) === digest(expected.files[index]!.data) &&
      (file.mode & 0o111) === (expected.files[index]!.mode & 0o111));
  } catch { return false; }
}
function buildPlan(root: string, options: Options, runtime: Runtime): Plan[] {
  const entries = catalogue(root);
  const available = new Set(entries.map(entry => entry.name));
  const names = options.skills.length ? options.skills : entries.map(entry => entry.name);
  for (const name of names) if (!available.has(name)) throw new CliError(`Unknown skill: ${name}. Use astack list`, 2);
  const base = realpathSync(options.scope === "global" ? runtime.home ?? homedir() : runtime.cwd ?? process.cwd());
  const snapshots = new Map<string, Tree>();
  for (const name of names) {
    const source = resolve(root, "skills", name);
    if (info(resolve(root, "skills"))?.isSymbolicLink() || !within(root, realpathSync(source)))
      throw new CliError("Package skill source escapes its installation");
    snapshots.set(name, snapshot(source));
  }
  const plan: Plan[] = [];
  for (const agent of options.agents) for (const name of names) {
    const target = resolve(base, agent === "claude" ? ".claude/skills" : ".agents/skills", name);
    assertSafePath(base, target);
    const tree = snapshots.get(name)!;
    const existing = info(target);
    const action = !existing ? "install" : sameTree(target, tree) ? "skip" : "replace";
    if (action === "replace" && !options.force)
      throw new CliError(`Existing skill differs: ${target}. Nothing changed; use --force to replace this selected folder`);
    plan.push({ agent, name, base, target, action, tree });
  }
  return plan;
}
function applyPlan(plan: Plan[]): void {
  const changes: Change[] = plan.filter(item => item.action !== "skip").map(item => ({ ...item }));
  const createdParents: { base: string; directory: OwnedDirectory }[] = [];
  const ensureParents = (base: string, target: string) => {
    let path = base;
    for (const segment of relative(base, dirname(target)).split(sep).filter(Boolean)) {
      path = resolve(path, segment);
      assertSafePath(base, path);
      if (!info(path)) { mkdirSync(path); createdParents.push({ base, directory: directoryIdentity(path) }); }
    }
  };
  try {
    for (const change of changes) {
      assertSafePath(change.base, change.target);
      ensureParents(change.base, change.target);
      const stage = resolve(dirname(change.target), `.astack-stage-${change.name}-${randomUUID()}`);
      mkdirSync(stage);
      change.stage = directoryIdentity(stage);
      for (const directory of change.tree.directories) mkdirSync(resolve(stage, directory), { recursive: true });
      for (const file of change.tree.files) {
        const destination = resolve(stage, file.path);
        if (!within(stage, destination)) throw new CliError("Package resource escapes its skill");
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, file.data, { flag: "wx", mode: file.mode });
        chmodSync(destination, file.mode);
      }
    }
    for (const change of changes) {
      assertSafePath(change.base, change.target);
      const current = info(change.target);
      if (current && change.action === "install") throw new CliError(`Destination appeared during installation: ${change.target}`);
      if (current) {
        const backup = resolve(dirname(change.target), `.astack-backup-${change.name}-${randomUUID()}`);
        renameSync(change.target, backup);
        change.backup = { path: backup, dev: current.dev, ino: current.ino };
      }
      assertOwnedDirectory(change.base, change.stage!);
      renameSync(change.stage!.path, change.target);
      change.committed = { ...change.stage!, path: change.target };
      change.stage = undefined;
    }
  } catch (error) {
    const failures: string[] = [];
    const recover = (operation: () => void) => {
      try { operation(); }
      catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
    };
    for (const change of [...changes].reverse()) {
      if (change.committed) recover(() => {
        assertOwnedDirectory(change.base, change.committed!);
        rmSync(change.target, { recursive: true });
      });
      if (change.backup) recover(() => {
        assertOwnedDirectory(change.base, change.backup!);
        assertSafePath(change.base, change.target);
        if (info(change.target)) throw new CliError(`Cannot restore backup over a changed destination: ${change.target}`);
        renameSync(change.backup!.path, change.target);
      });
      if (change.stage) recover(() => {
        assertOwnedDirectory(change.base, change.stage!);
        rmSync(change.stage!.path, { recursive: true });
      });
    }
    for (const { base, directory } of createdParents.reverse()) recover(() => {
      assertOwnedDirectory(base, directory);
      if (!readdirSync(directory.path).length) rmSync(directory.path, { recursive: true });
    });
    if (failures.length) {
      const cause = error instanceof Error ? error.message : String(error);
      throw new CliError(`${cause}\nRollback incomplete; backup and staging folders were preserved where cleanup was unsafe:\n${[...new Set(failures)].join("\n")}`);
    }
    throw error;
  }
  for (const change of changes) if (change.backup) {
    try {
      assertOwnedDirectory(change.base, change.backup);
      rmSync(change.backup.path, { recursive: true });
    } catch (error) {
      throw new CliError(`Skills were installed, but a backup could not be safely removed: ${change.backup.path}\n${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export function runCLI(args: string[], runtime: Runtime = {}): Result {
  try {
    const options = parseArguments(args);
    if (options.command === "help") return { code: 0, stdout: help, stderr: "" };
    const root = packageRoot(runtime.packageRoot);
    const pkg = jsonFile(resolve(root, "package.json"));
    if (!pkg || typeof pkg !== "object" || Array.isArray(pkg) ||
        typeof pkg.name !== "string" || !pkg.name || typeof pkg.version !== "string" || !pkg.version)
      throw new CliError("Invalid package metadata: name and version are required");
    if (options.command === "version") return { code: 0, stdout: `${pkg.version}\n`, stderr: "" };
    if (options.command === "list") {
      const skills = catalogue(root);
      return { code: 0, stdout: options.json ? `${JSON.stringify({ package: pkg.name, version: pkg.version, skills })}\n`
        : `${skills.map(entry => `${entry.name}\t${entry.summary}`).join("\n")}\n`, stderr: "" };
    }
    const plan = buildPlan(root, options, runtime);
    if (!options.dryRun) applyPlan(plan);
    const actions = plan.map(({ agent, name, target, action }) => ({ agent, skill: name, target, action }));
    return { code: 0, stdout: options.json ? `${JSON.stringify({ package: pkg.name, version: pkg.version, dryRun: options.dryRun, actions })}\n`
      : `${actions.map(item => `${options.dryRun ? "would " : ""}${item.action}: ${item.agent}/${item.skill} -> ${item.target}`).join("\n")}\n`, stderr: "" };
  } catch (error) {
    return { code: error instanceof CliError ? error.code : 1, stdout: "", stderr: `${error instanceof Error ? error.message : String(error)}\n` };
  }
}

const invokedPath = process.argv[1];
if (invokedPath && existsSync(invokedPath) && realpathSync(invokedPath) === realpathSync(fileURLToPath(import.meta.url))) {
  const result = runCLI(process.argv.slice(2));
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(`astack: ${result.stderr}`);
  process.exitCode = result.code;
}
