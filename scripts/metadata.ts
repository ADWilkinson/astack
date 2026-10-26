import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type Entry, inside, readJson } from "./package";

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
  if (!existsSync(resolve(skillDir, "SKILL.md"))) throw new Error(`Missing skill source: ${skill.name}`);
  const path = resolve(dir, "openai.yaml");
  const info = lstatSync(path, { throwIfNoEntry: false });
  if (info && (info.isSymbolicLink() || !info.isFile())) throw new Error("Metadata must be a regular file");
  const existing = existsSync(path) ? Bun.YAML.parse(readFileSync(path, "utf8")) as any : {};
  if (!existing || typeof existing !== "object" || Array.isArray(existing) ||
      (existing.interface !== undefined && (!existing.interface || typeof existing.interface !== "object" || Array.isArray(existing.interface))))
    throw new Error(`Invalid existing metadata for ${skill.name}; no metadata written`);
  existing.interface = { ...existing.interface, display_name: skill.title, short_description: skill.summary };
  pending.push({ dir, path, content: Bun.YAML.stringify(existing, null, 2).trimEnd() + "\n" });
}
const shared = readJson<{ files: Record<string, string[]> }>(resolve(root, "shared/manifest.json")).files;
for (const [file, targets] of Object.entries(shared)) {
  const content = readFileSync(resolve(root, "shared", file));
  for (const skill of targets) {
    if (!names.has(skill)) throw new Error(`Shared file ${file} targets unknown skill ${skill}`);
    const path = resolve(root, "skills", skill, file);
    if (!inside(resolve(root, "skills", skill), path)) throw new Error("Shared file escapes its skill");
    pending.push({ dir: dirname(path), path, content: content.toString("utf8") });
  }
}
for (const file of pending) {
  mkdirSync(file.dir, { recursive: true });
  writeFileSync(file.path, file.content);
}
console.log(`Generated picker metadata for ${skills.length} skills and synced ${Object.keys(shared).length} shared files`);
