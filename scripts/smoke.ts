// Consumer journey: build the CLI, pack it as npm would, install the tarball into a
// throwaway project offline, then list, install both agents and run every installed script.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { readJson } from "./package";

const root = resolve(import.meta.dir, "..");
const temp = mkdtempSync(resolve(tmpdir(), "astack-smoke-"));
const failures: string[] = [];
const check = (ok: boolean, message: string) => { if (!ok) failures.push(message); };

function run(cmd: string[], cwd: string) {
  const result = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() };
}
function must(cmd: string[], cwd: string) {
  const result = run(cmd, cwd);
  if (result.code !== 0) throw new Error(`${cmd.join(" ")} exited ${result.code}\n${result.err}`);
  return result.out;
}
function files(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path, base) : [relative(base, path)];
  }).sort();
}

try {
  const catalog: string[] = readJson(resolve(root, "catalog.json")).skills.map((skill: { name: string }) => skill.name);

  must(["bun", "run", "build"], root);
  const packs = resolve(temp, "packs");
  mkdirSync(packs);
  must(["npm", "pack", "--ignore-scripts", "--pack-destination", packs], root);
  const tarball = readdirSync(packs).find(file => file.endsWith(".tgz"));
  if (!tarball) throw new Error("npm pack produced no tarball");

  const project = resolve(temp, "project");
  mkdirSync(project);
  must(["npm", "install", "--offline", "--no-audit", "--no-fund", "--ignore-scripts", "--prefix", project, resolve(packs, tarball)], project);
  const bin = resolve(project, "node_modules/.bin/astack");
  check(existsSync(bin), "npm did not link the astack bin");

  const help = run([bin], project);
  check(help.code === 0 && help.out.includes("Usage"), "bare astack must print help");
  check(!existsSync(resolve(project, ".claude")) && !existsSync(resolve(project, ".agents")), "help wrote skill folders");

  const listed = JSON.parse(must([bin, "list", "--json"], project)).skills.map((skill: { name: string }) => skill.name);
  check(JSON.stringify(listed) === JSON.stringify(catalog), `list returned ${listed.join(",")}, catalogue has ${catalog.join(",")}`);

  const refused = run([bin, "install", "--agent", "claude", "--skill", "../outside"], project);
  check(refused.code !== 0 && !existsSync(resolve(project, ".claude")) && !existsSync(resolve(temp, "outside")), "a traversal skill name was not refused cleanly");

  must([bin, "install", "--agent", "all", "--json"], project);
  for (const parent of [".claude/skills", ".agents/skills"]) {
    for (const name of catalog) {
      const source = resolve(root, "skills", name);
      const installed = resolve(project, parent, name);
      if (!existsSync(installed)) { failures.push(`${parent}/${name} was not installed`); continue; }
      const expected = files(source);
      check(JSON.stringify(files(installed)) === JSON.stringify(expected), `${parent}/${name} differs from the packaged skill file set`);
      for (const file of expected) {
        check(readFileSync(resolve(installed, file)).equals(readFileSync(resolve(source, file))), `${parent}/${name}/${file} differs from source`);
      }
    }
  }

  // Each installed script must run on plain Node from inside its own skill folder.
  const scripts = resolve(project, ".claude/skills");
  for (const name of catalog) {
    const dir = resolve(scripts, name, "scripts");
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const script of readdirSync(dir).filter(file => file.endsWith(".mjs"))) {
      const result = run(["node", resolve(dir, script), "--help"], temp);
      check(result.code === 0 && result.out.includes("Usage"), `${name}/scripts/${script} --help exited ${result.code}`);
    }
  }

  // The routing eval needs a model to answer, so only its cases are checked here: every named skill must exist.
  for (const file of ["cases.json", "cases-hard.json"]) {
    const cases: { expect: string[]; also_ok?: string[] }[] = readJson(resolve(root, "evals/routing", file));
    for (const name of new Set(cases.flatMap(c => [...c.expect, ...(c.also_ok ?? [])]))) {
      check(catalog.includes(name), `evals/routing/${file} names unknown skill ${name}`);
    }
  }
} catch (error) {
  failures.push(String(error instanceof Error ? error.message : error));
} finally {
  rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else console.log("astack smoke: packed CLI installed offline, listed, installed every skill for both agents and ran each script");
