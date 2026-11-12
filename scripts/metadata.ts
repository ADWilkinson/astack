import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { type Entry, independentFile, inside, readJson } from "./package";

const root = resolve(import.meta.dir, "..");
const { skills } = readJson<{ skills: Entry[] }>(resolve(root, "catalog.json"));
if (!Array.isArray(skills) || !skills.length) throw new Error("Expected a nonempty skill catalogue");
const names = new Set<string>();
const pending: { dir: string; path: string; content: string }[] = [];
for (const skill of skills) {
  if (!skill || typeof skill.name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name) ||
      skill.name.length > 64 || names.has(skill.name) || typeof skill.title !== "string" || !skill.title.trim() ||
      typeof skill.summary !== "string" || skill.summary.length < 25 || skill.summary.length > 64)
    throw new Error("Invalid or duplicate catalogue entry; no metadata written");
  names.add(skill.name);
  const skillDir = resolve(root, "skills", skill.name);
  const dir = resolve(skillDir, "agents");
  for (const component of [resolve(root, "skills"), skillDir, dir]) {
    if (!inside(root, component)) throw new Error("Metadata path escapes the package");
    const info = lstatSync(component, { throwIfNoEntry: false });
    if (info && (info.isSymbolicLink() || !info.isDirectory() || !inside(realpathSync(root), realpathSync(component))))
      throw new Error("Metadata directories must be real directories inside the package");
  }
  if (!independentFile(resolve(skillDir, "SKILL.md"))) throw new Error(`Skill source must be a regular file: ${skill.name}; no metadata written`);
  const path = resolve(dir, "openai.yaml");
  const info = lstatSync(path, { throwIfNoEntry: false });
  if (info && !independentFile(path)) throw new Error("Metadata must be a regular independent file; no metadata written");
  const existing = info ? Bun.YAML.parse(readFileSync(path, "utf8")) as any : {};
  if (!existing || typeof existing !== "object" || Array.isArray(existing) ||
      (existing.interface !== undefined && (!existing.interface || typeof existing.interface !== "object" || Array.isArray(existing.interface))))
    throw new Error(`Invalid existing metadata for ${skill.name}; no metadata written`);
  existing.interface = { ...existing.interface, display_name: skill.title, short_description: skill.summary };
  // The emitter puts a trailing space on nested keys. The committed files do not, and a second run must match the first.
  const yaml = Bun.YAML.stringify(existing, null, 2).replace(/[ \t]+$/gm, "").trimEnd() + "\n";
  pending.push({ dir, path, content: yaml });
}
const sharedRoot = resolve(root, "shared");
const shared = readJson<{ files: Record<string, string[]> }>(resolve(sharedRoot, "manifest.json")).files;
for (const [file, targets] of Object.entries(shared)) {
  if (typeof file !== "string" || isAbsolute(file) || file.split(/[\\/]/).includes("..") || !inside(sharedRoot, resolve(sharedRoot, file)))
    throw new Error(`Shared file escapes the package: ${file}; no metadata written`);
  const source = resolve(sharedRoot, file);
  if (!independentFile(source) || !inside(realpathSync(sharedRoot), realpathSync(source)))
    throw new Error(`Shared source must be a regular independent file: ${file}; no metadata written`);
  if (!Array.isArray(targets)) throw new Error(`Shared file ${file} targets must be a list; no metadata written`);
  const content = readFileSync(source).toString("utf8");
  for (const skill of targets) {
    if (typeof skill !== "string" || !names.has(skill)) throw new Error(`Shared file ${file} targets unknown skill ${String(skill)}; no metadata written`);
    const skillDir = resolve(root, "skills", skill);
    const path = resolve(skillDir, file);
    if (!inside(skillDir, path)) throw new Error("Shared file escapes its skill; no metadata written");
    const segments = relative(skillDir, path).split(sep).filter(Boolean);
    let cursor = skillDir;
    for (let index = 0; index < segments.length; index++) {
      cursor = resolve(cursor, segments[index]!);
      const destination = lstatSync(cursor, { throwIfNoEntry: false });
      if (!destination) continue;
      if (destination.isSymbolicLink()) throw new Error(`Refusing symlinked shared path: ${file}; no metadata written`);
      const last = index === segments.length - 1;
      if (last ? !destination.isFile() || destination.nlink !== 1 : !destination.isDirectory())
        throw new Error(`Shared destination must be a regular independent file: ${file}; no metadata written`);
    }
    pending.push({ dir: dirname(path), path, content });
  }
}
for (const file of pending) {
  mkdirSync(file.dir, { recursive: true });
  writeFileSync(file.path, file.content);
}
console.log(`Generated picker metadata for ${skills.length} skills and synced ${Object.keys(shared).length} shared files`);
