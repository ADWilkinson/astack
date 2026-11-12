import { afterEach, expect, test } from "bun:test";
import { cpSync, existsSync, linkSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
  const generated = readFileSync(path, "utf8");
  expect(generated).not.toMatch(/[ \t]$/m);
  const again = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(again.exitCode).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(generated);
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
test("frontmatter must be a closed block at the start of the skill", () => {
  const root = fixture();
  const path = resolve(root, "skills/astack/SKILL.md");
  const original = readFileSync(path, "utf8");
  const cases: [string, string][] = [
    ["\n" + original, "Missing YAML frontmatter"],
    [original.replace("name: astack", "name: ship"), "Frontmatter name differs from directory"],
    [original.replace(/^description:.*$/m, `description: ${JSON.stringify("x".repeat(1025))}`), "Invalid skill description"],
    [original.replace(/^description:.*$/m, 'description: "   "'), "Invalid skill description"],
    ["---\nname: [astack\ndescription: still a skill\n---\n", "Invalid YAML"],
  ];
  for (const [text, message] of cases) {
    writeFileSync(path, text);
    expect(validatePackage(root).some(finding => finding.file.endsWith("skills/astack/SKILL.md") && finding.message.includes(message))).toBe(true);
  }
});
test("oneshot must keep both invocation locks", () => {
  const root = fixture();
  const skill = resolve(root, "skills/oneshot/SKILL.md");
  const yaml = resolve(root, "skills/oneshot/agents/openai.yaml");
  const skillText = readFileSync(skill, "utf8");
  const yamlText = readFileSync(yaml, "utf8");
  writeFileSync(skill, skillText.replace("disable-model-invocation: true\n", ""));
  expect(validatePackage(root).some(finding => finding.message === "oneshot must set disable-model-invocation: true")).toBe(true);
  writeFileSync(skill, skillText);
  writeFileSync(yaml, yamlText.replace("allow_implicit_invocation: false", "allow_implicit_invocation: true"));
  expect(validatePackage(root).some(finding => finding.message === "oneshot must set allow_implicit_invocation: false")).toBe(true);
  writeFileSync(yaml, yamlText.replace(/policy:\n  allow_implicit_invocation: false\n/, ""));
  expect(validatePackage(root).some(finding => finding.message === "oneshot must set allow_implicit_invocation: false")).toBe(true);
});
test("metadata generation refuses a symlinked shared script before writing through it", () => {
  const root = fixture();
  const dest = resolve(root, "skills/ship/scripts/pr-state.mjs");
  const outside = resolve(root, "outside-pr-state.mjs");
  const picker = resolve(root, "skills/astack/agents/openai.yaml");
  writeFileSync(picker, readFileSync(picker, "utf8").replace("display_name: astack", "display_name: Wrong"));
  rmSync(dest);
  writeFileSync(outside, "ORIGINAL-OUTSIDE\n");
  symlinkSync(outside, dest);
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(result.exitCode).not.toBe(0);
  expect(readFileSync(outside, "utf8")).toBe("ORIGINAL-OUTSIDE\n");
  expect(readFileSync(picker, "utf8")).toContain("display_name: Wrong");
});
test("metadata generation refuses a hard-linked shared script or picker file", () => {
  const root = fixture();
  const dest = resolve(root, "skills/ship/scripts/pr-state.mjs");
  const outside = resolve(root, "outside-pr-state.mjs");
  rmSync(dest);
  writeFileSync(outside, "ORIGINAL-OUTSIDE\n");
  linkSync(outside, dest);
  const linked = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(linked.exitCode).not.toBe(0);
  expect(readFileSync(outside, "utf8")).toBe("ORIGINAL-OUTSIDE\n");
  rmSync(dest);
  writeFileSync(dest, readFileSync(resolve(root, "shared/scripts/pr-state.mjs")));

  const picker = resolve(root, "skills/astack/agents/openai.yaml");
  const pickerOutside = resolve(root, "outside.yaml");
  const body = 'interface:\n  display_name: Wrong\n  short_description: "placeholder description for the picker"\n';
  rmSync(picker);
  writeFileSync(pickerOutside, body);
  linkSync(pickerOutside, picker);
  const pickerResult = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(pickerResult.exitCode).not.toBe(0);
  expect(readFileSync(pickerOutside, "utf8")).toBe(body);
});
test("metadata generation does not copy a symlinked shared source into a skill", () => {
  const root = fixture();
  const canonical = resolve(root, "shared/scripts/page-audit.mjs");
  const external = resolve(root, "external-page-audit.mjs");
  const copy = resolve(root, "skills/discoverability/scripts/page-audit.mjs");
  const before = readFileSync(copy);
  writeFileSync(external, "SMUGGLED\n");
  rmSync(canonical);
  symlinkSync(external, canonical);
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr.toString()).toContain("regular independent file");
  expect(readFileSync(copy)).toEqual(before);
  expect(readFileSync(external, "utf8")).toBe("SMUGGLED\n");
});
test("a symlinked shared source fails validation even when its bytes match", () => {
  const root = fixture();
  const canonical = resolve(root, "shared/scripts/page-audit.mjs");
  const external = resolve(root, "external-page-audit.mjs");
  writeFileSync(external, readFileSync(canonical));
  rmSync(canonical);
  symlinkSync(external, canonical);
  expect(validatePackage(root).some(finding => finding.message.includes("regular independent file"))).toBe(true);
});
test("metadata generation rejects a shared path that escapes before reading it", () => {
  const root = fixture();
  const picker = resolve(root, "skills/astack/agents/openai.yaml");
  const before = readFileSync(picker, "utf8");
  changeJson(root, "shared/manifest.json", data => { data.files["../catalog.json"] = ["ship"]; });
  const result = Bun.spawnSync([process.execPath, resolve(root, "scripts/metadata.ts")], { cwd: root });
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr.toString()).toContain("escapes the package");
  expect(result.stderr.toString()).not.toContain("ENOENT");
  expect(readFileSync(picker, "utf8")).toBe(before);
  expect(existsSync(resolve(root, "skills/catalog.json"))).toBe(false);
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
