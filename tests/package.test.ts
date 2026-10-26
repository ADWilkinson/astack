import { afterEach, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { inside, markdownLinks, packageEntries, validatePackage } from "../scripts/package";

const source = resolve(import.meta.dir, "..");
const temps: string[] = [];
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "astack-package-"));
  temps.push(root);
  for (const entry of packageEntries) {
    cpSync(resolve(source, entry), resolve(root, entry), { recursive: true, verbatimSymlinks: true });
  }
  return root;
}
function changeJson(root: string, file: string, mutate: (data: any) => void) {
  const path = resolve(root, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  mutate(data);
  writeFileSync(path, JSON.stringify(data));
}
afterEach(() => { while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true }); });

test("the declared package is independently valid when copied away from its checkout", () => {
  expect(validatePackage(fixture())).toEqual([]);
});
test("version drift in a native client is rejected", () => {
  const root = fixture();
  changeJson(root, ".codex-plugin/plugin.json", data => { data.version = "9.0.0"; });
  expect(validatePackage(root).some(x => x.message === "version differs from package.json")).toBe(true);
});
test("a client cannot silently omit a published specialist", () => {
  const root = fixture();
  changeJson(root, ".claude-plugin/plugin.json", data => { data.skills.pop(); });
  expect(validatePackage(root).some(x => x.message.includes("exact published skill set"))).toBe(true);
});
test("a missing resource makes the copied skill invalid", () => {
  const root = fixture();
  const path = resolve(root, "skills/astack/SKILL.md");
  writeFileSync(path, readFileSync(path, "utf8") + "\nRead [details](references/absent.md).\n");
  expect(validatePackage(root).some(x => x.message.includes("Missing resource"))).toBe(true);
});
test("even an existing cross-skill resource breaks single-skill portability", () => {
  const root = fixture();
  const path = resolve(root, "skills/astack/SKILL.md");
  writeFileSync(path, readFileSync(path, "utf8") + "\nRead [external](../ship/SKILL.md).\n");
  expect(validatePackage(root).some(x => x.message.includes("escapes its skill"))).toBe(true);
});
test("a symlink cannot smuggle an external resource into a skill", () => {
  const root = fixture();
  const dir = resolve(root, "skills/astack/references");
  mkdirSync(dir, { recursive: true });
  symlinkSync(resolve(root, "README.md"), resolve(dir, "outside.md"));
  const path = resolve(root, "skills/astack/SKILL.md");
  writeFileSync(path, readFileSync(path, "utf8") + "\nRead [outside](references/outside.md).\n");
  const findings = validatePackage(root);
  expect(findings.some(x => x.message.includes("regular packaged files"))).toBe(true);
  expect(findings.some(x => x.message.includes("resolves outside"))).toBe(true);
});
test("blank descriptions do not pass discovery checks", () => {
  const root = fixture();
  const path = resolve(root, "skills/astack/SKILL.md");
  writeFileSync(path, readFileSync(path, "utf8").replace(/^description:.*$/m, 'description: ""'));
  expect(validatePackage(root).some(x => x.message === "Invalid skill description")).toBe(true);
});
test("picker metadata is checked against the catalogue", () => {
  const root = fixture();
  writeFileSync(resolve(root, "skills/astack/agents/openai.yaml"), 'interface:\n  display_name: "Wrong"\n');
  expect(validatePackage(root).some(x => x.message.includes("Picker metadata differs"))).toBe(true);
});
test("path containment does not confuse neighboring prefixes", () => {
  expect(inside("/tmp/skill", "/tmp/skill/reference.md")).toBe(true);
  expect(inside("/tmp/skill", "/tmp/skill-other/reference.md")).toBe(false);
  expect(inside("/tmp/skill", "/tmp/skill/../outside.md")).toBe(false);
});
test("resource parsing keeps anchors and encoded traversal for validation", () => {
  expect(markdownLinks("[local](references/a.md#section) [escape](%2e%2e/other.md)"))
    .toEqual(["references/a.md#section", "%2e%2e/other.md"]);
});
test("metadata regeneration preserves invocation policy and dependencies", () => {
  const root = fixture();
  const path = resolve(root, "skills/astack/agents/openai.yaml");
  writeFileSync(path, 'interface:\n  display_name: "Old"\n  short_description: "Old picker description to be replaced"\n  brand_color: "#112233"\npolicy:\n  allow_implicit_invocation: false\ndependencies:\n  tools:\n    - type: "mcp"\n      value: "docs-tool"\n');
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(result.exitCode).toBe(0);
  const metadata = Bun.YAML.parse(readFileSync(path, "utf8")) as any;
  expect(metadata.policy.allow_implicit_invocation).toBe(false);
  expect(metadata.dependencies.tools[0].value).toBe("docs-tool");
  expect(metadata.interface.brand_color).toBe("#112233");
  expect(metadata.interface.display_name).toBe("astack");
});
test("metadata generation rejects path traversal before any write", () => {
  const root = fixture();
  const prior = readFileSync(resolve(root, "skills/astack/agents/openai.yaml"), "utf8");
  changeJson(root, "catalog.json", data => { data.skills[1].name = "../../escaped"; });
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(result.exitCode).not.toBe(0);
  expect(existsSync(resolve(root, "escaped"))).toBe(false);
  expect(readFileSync(resolve(root, "skills/astack/agents/openai.yaml"), "utf8")).toBe(prior);
});
test("metadata generation rejects a symlinked output directory", () => {
  const root = fixture();
  const dir = resolve(root, "skills/astack/agents");
  rmSync(dir, { recursive: true });
  symlinkSync(resolve(root, "docs"), dir);
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(result.exitCode).not.toBe(0);
  expect(existsSync(resolve(root, "docs/openai.yaml"))).toBe(false);
});
test("metadata generation rejects a dangling symlink before it creates an outside file", () => {
  const root = fixture();
  const path = resolve(root, "skills/astack/agents/openai.yaml");
  const outside = resolve(root, "outside.yaml");
  rmSync(path);
  symlinkSync(outside, path);
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(result.exitCode).not.toBe(0);
  expect(existsSync(outside)).toBe(false);
});
test("release archives omit ignored nested private files", () => {
  const root = fixture();
  const git = (args: string[]) => Bun.spawnSync(["git", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "-C", root, ...args]);
  expect(git(["init", "-b", "main"]).exitCode).toBe(0);
  expect(git(["add", "."]).exitCode).toBe(0);
  expect(git(["-c", "user.name=Package Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture"]).exitCode).toBe(0);
  writeFileSync(resolve(root, "skills/ship/.env"), "SYNTHETIC_ONLY=do-not-distribute\n");
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/pack.ts")], { cwd: root });
  expect(result.exitCode).toBe(0);
  const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
  const listing = Bun.spawnSync(["tar", "-tzf", resolve(root, `dist/astack-${version}.tar.gz`)]);
  expect(listing.exitCode).toBe(0);
  expect(listing.stdout.toString()).toContain("astack/skills/ship/SKILL.md");
  expect(listing.stdout.toString()).not.toContain(".env");
});

test("npm distribution and plugin identities remain distinct", () => {
  const root = fixture();
  changeJson(root, "package.json", data => { data.name = "astack"; });
  expect(validatePackage(root).some(x => x.message.includes("astack-skills npm identity"))).toBe(true);
  changeJson(root, ".codex-plugin/plugin.json", data => { data.name = "astack-impostor"; });
  expect(validatePackage(root).some(x => x.message.includes("Plugin identity"))).toBe(true);
});

test("consumer installation cannot acquire hooks or runtime dependencies", () => {
  const root = fixture();
  changeJson(root, "package.json", data => { data.scripts.postinstall = "touch unexpected"; data.dependencies = { surprise: "*" }; });
  const messages = validatePackage(root).map(x => x.message);
  expect(messages).toContain("Consumer installation must not execute hooks");
  expect(messages).toContain("The consumer CLI must remain dependency-free");
});

test("npm prepack rejects an ignored nested file that npm's directory allowlist includes", () => {
  const root = fixture();
  const git = (args: string[]) => Bun.spawnSync(["git", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "-C", root, ...args]);
  expect(git(["init", "-b", "main"]).exitCode).toBe(0);
  expect(git(["add", "."]).exitCode).toBe(0);
  expect(git(["-c", "user.name=Package Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture"]).exitCode).toBe(0);
  writeFileSync(resolve(root, "skills/ship/.env"), "SYNTHETIC_ONLY=do-not-distribute\n");
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/npm-prepack.ts")], { cwd: root });
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr.toString()).toContain("Unsafe npm entry: skills/ship/.env");
  expect(readdirSync(root).some(file => file.endsWith(".tgz"))).toBe(false);
});
