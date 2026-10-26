import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export type Finding = { file: string; message: string };
export type Entry = { name: string; title: string; summary: string; example: string };

export const packageEntries = [
  "README.md", "LICENSE",
  "SCOPE.md", "CONTRIBUTING.md", "CHANGELOG.md", "AGENTS.md",
  "package.json", "plugin.json", "catalog.json", ".claude-plugin", ".codex-plugin",
  "skills", "shared", "docs", "src", "scripts", "tests", "examples", "evals", ".github", ".gitignore",
];

export function inside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

export function readJson<T = any>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function markdownLinks(text: string): string[] {
  return [...text.matchAll(/!?\[[^\]\n]*\]\(<?([^\s)>]+)>?(?:\s+"[^"\n]*")?\)/g)]
    .map(match => match[1]!);
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isSymbolicLink() || entry.isFile()) result.push(path);
    else if (entry.isDirectory()) result.push(...filesUnder(path));
  }
  return result;
}

export function validatePackage(root: string): Finding[] {
  root = resolve(root);
  const findings: Finding[] = [];
  const fail = (file: string, message: string) => findings.push({ file: relative(root, file), message });
  const json = (path: string) => {
    try { return readJson(path); }
    catch (error) { fail(path, `Invalid or missing JSON: ${String(error)}`); return undefined; }
  };
  const pkgPath = resolve(root, "package.json");
  const pkg = json(pkgPath);
  const catalogPath = resolve(root, "catalog.json");
  const catalog = json(catalogPath);
  if (!pkg || !catalog) return findings;
  if (pkg.name !== "astack-skills" || !/^\d+\.\d+\.\d+$/.test(pkg.version ?? ""))
    fail(pkgPath, "Expected the astack-skills npm identity and a semantic release version");
  if (pkg.private !== false || pkg.bin?.astack !== "dist/astack.mjs" || pkg.engines?.node !== ">=20")
    fail(pkgPath, "Expected public Node 20 CLI distribution");
  if (pkg.publishConfig?.access !== "public" || pkg.publishConfig?.registry !== "https://registry.npmjs.org")
    fail(pkgPath, "Expected public npm registry publication");
  for (const hook of ["preinstall", "install", "postinstall", "prepare"])
    if (pkg.scripts?.[hook]) fail(pkgPath, "Consumer installation must not execute hooks");
  if (Object.keys(pkg.dependencies ?? {}).length)
    fail(pkgPath, "The consumer CLI must remain dependency-free");
  if (!Array.isArray(pkg.files) || !pkg.files.includes("dist/astack.mjs") || !pkg.files.includes("skills/"))
    fail(pkgPath, "The npm allowlist must include the CLI and canonical skills");
  const entries: Entry[] = catalog.skills;
  if (!Array.isArray(entries) || !entries.length) {
    fail(catalogPath, "Expected a nonempty skills catalogue");
    return findings;
  }
  const names = entries.map(entry => entry.name);
  if (new Set(names).size !== names.length) fail(catalogPath, "Duplicate skill name");
  const skillRoot = resolve(root, "skills");
  const actual = existsSync(skillRoot) ? readdirSync(skillRoot).filter(name =>
    existsSync(resolve(skillRoot, name, "SKILL.md"))) : [];
  if (JSON.stringify([...actual].sort()) !== JSON.stringify([...names].sort()))
    fail(skillRoot, "Published skill directories and catalogue differ");

  for (const entry of entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name ?? "") || entry.name.length > 64) {
      fail(catalogPath, "Invalid skill name"); continue;
    }
    if (!entry.title || !entry.example || typeof entry.summary !== "string" ||
        entry.summary.length < 25 || entry.summary.length > 64)
      fail(catalogPath, `Incomplete picker information for ${entry.name}`);
    const dir = resolve(skillRoot, entry.name);
    const path = resolve(dir, "SKILL.md");
    if (!existsSync(path)) { fail(path, "Missing skill entrypoint"); continue; }
    const text = readFileSync(path, "utf8");
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!frontmatter) fail(path, "Missing YAML frontmatter");
    else {
      try {
        const metadata = Bun.YAML.parse(frontmatter[1]!) as any;
        if (metadata?.name !== entry.name) fail(path, "Frontmatter name differs from directory");
        if (typeof metadata?.description !== "string" || !metadata.description.trim() ||
            metadata.description.length > 1024) fail(path, "Invalid skill description");
      } catch (error) { fail(path, `Invalid YAML: ${String(error)}`); }
    }
    if (text.split(/\r?\n/).length > 500) fail(path, "Disclose conditional detail outside the entrypoint");
    if (/\b(?:REPLACE_ME|INSERT_HERE|your-skill-name)\b/.test(text)) fail(path, "Unfinished scaffold");
    const uiPath = resolve(dir, "agents/openai.yaml");
    try {
      const ui = Bun.YAML.parse(readFileSync(uiPath, "utf8")) as any;
      if (ui?.interface?.display_name !== entry.title || ui?.interface?.short_description !== entry.summary)
        fail(uiPath, "Picker metadata differs from catalogue; run bun run metadata");
    } catch (error) { fail(uiPath, `Invalid or missing picker metadata: ${String(error)}`); }

    for (const file of filesUnder(dir)) {
      if (lstatSync(file).isSymbolicLink()) { fail(file, "Skill resources must be regular packaged files"); continue; }
      if (!/\.md$/.test(file)) continue;
      const content = readFileSync(file, "utf8");
      if (/\/(?:Users|home)\/[A-Za-z0-9._-]+\//.test(content))
        fail(file, "Absolute home path in published skill");
      for (const link of markdownLinks(content)) {
        if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(link)) continue;
        let local: string;
        try { local = decodeURIComponent(link.split(/[?#]/)[0]!); }
        catch { fail(file, `Malformed resource link: ${link}`); continue; }
        if (!local) continue;
        const target = resolve(dirname(file), local);
        if (!inside(dir, target)) { fail(file, `Resource escapes its skill: ${link}`); continue; }
        if (!existsSync(target)) { fail(file, `Missing resource: ${link}`); continue; }
        if (!inside(realpathSync(dir), realpathSync(target))) fail(file, `Resource resolves outside its skill: ${link}`);
      }
    }
  }

  const sharedPath = resolve(root, "shared/manifest.json");
  const shared = json(sharedPath);
  for (const [file, targets] of Object.entries<string[]>(shared?.files ?? {})) {
    const canonical = resolve(root, "shared", file);
    if (!inside(resolve(root, "shared"), canonical) || !existsSync(canonical)) { fail(sharedPath, `Missing shared source: ${file}`); continue; }
    const expected = readFileSync(canonical);
    for (const skill of targets) {
      if (!names.includes(skill)) { fail(sharedPath, `Shared file targets unknown skill: ${skill}`); continue; }
      const copy = resolve(skillRoot, skill, file);
      if (!inside(resolve(skillRoot, skill), copy) || !existsSync(copy) || !readFileSync(copy).equals(expected))
        fail(copy, `Out of sync with shared/${file}; run bun run metadata`);
    }
  }

  for (const client of [".", ".claude-plugin", ".codex-plugin"]) {
    const file = resolve(root, client, "plugin.json");
    const manifest = json(file);
    if (!manifest) continue;
    if (manifest.name !== "astack") fail(file, "Plugin identity must remain astack");
    for (const key of ["version", "description", "license", "repository"])
      if (manifest[key] !== pkg[key]) fail(file, `${key} differs from package.json`);
    if (client === ".claude-plugin") {
      const expected = names.map(name => `./skills/${name}`).sort();
      if (!Array.isArray(manifest.skills) || JSON.stringify([...manifest.skills].sort()) !== JSON.stringify(expected))
        fail(file, "Manifest does not expose the exact published skill set");
    } else if (client === ".codex-plugin" && manifest.skills !== "./skills/")
      fail(file, "Codex skills path must expose the canonical skills tree");
    else if (client === "." && manifest.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json")
      fail(file, "Portable plugin schema is missing");
  }
  const marketPath = resolve(root, ".claude-plugin/marketplace.json");
  const market = json(marketPath);
  if (market?.name !== "adwilkinson" || market?.plugins?.length !== 1 ||
      market.plugins[0].name !== "astack" || market.plugins[0].source !== "./")
    fail(marketPath, "Marketplace must resolve this package at the repository root");

  const readmePath = resolve(root, "README.md");
  if (!existsSync(readmePath)) fail(readmePath, "Missing README");
  else {
    const documented = markdownLinks(readFileSync(readmePath, "utf8"))
      .map(link => /^skills\/([^/]+)\/SKILL\.md$/.exec(link)?.[1]).filter(Boolean).sort();
    if (JSON.stringify(documented) !== JSON.stringify([...names].sort()))
      fail(readmePath, "README must link every published skill exactly once");
  }
  for (const name of packageEntries)
    if (!existsSync(resolve(root, name))) fail(resolve(root, name), "Missing declared package entry");
  const docFiles = [readmePath, ...filesUnder(resolve(root, "docs")),
    resolve(root, "CONTRIBUTING.md")];
  for (const file of docFiles) {
    if (!existsSync(file) || !file.endsWith(".md")) continue;
    for (const link of markdownLinks(readFileSync(file, "utf8"))) {
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(link)) continue;
      let local: string;
      try { local = decodeURIComponent(link.split(/[?#]/)[0]!); }
      catch { fail(file, `Malformed local link: ${link}`); continue; }
      const target = resolve(dirname(file), local);
      if (!inside(root, target) || !existsSync(target)) fail(file, `Missing or escaping package link: ${link}`);
    }
  }
  return findings;
}
