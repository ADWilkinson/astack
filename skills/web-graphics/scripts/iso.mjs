#!/usr/bin/env node
// Compile a small isometric scene description into clean, editable SVG with
// correct projection, consistent face shading and back-to-front draw order.
// Hand-computing these is where generated isometric art usually breaks.
import { readFileSync, writeFileSync } from "node:fs";

const HELP = `iso: isometric scene JSON -> SVG

Usage:
  node iso.mjs scene.json [-o out.svg]
  node iso.mjs --example        Print an example scene

Projection (2:1 isometric, 30deg):
  sx = (x - y) * cos30 * unit      sy = (x + y) * sin30 * unit - z * unit
Ground lines slope ±0.577, verticals stay vertical, +x runs down-right,
+y runs down-left, +z is up.

Scene fields:
  unit        px per world unit (default 24)
  padding     px around the drawing (default 16)
  stroke      { color, width } applied to every shape (default none)
  palette     named colours; any fill may reference "$name"
  shade       auto face shading when a box gives only "fill":
              { top: 0, left: -0.12, right: -0.24 } lightness deltas
  items[]     drawn back to front automatically:
    { "box":  [x, y, z, w, d, h], "fill": "#hex" | { "top","left","right" }, "id"?, "class"? }
    { "tile": [x, y, z, w, d], "fill": "#hex" }                    flat floor plane
    { "path": [[x,y,z], ...], "stroke": "#hex", "width"?: 2, "dash"?: "4 4", "close"?: false }
    { "label": [x, y, z], "text": "...", "fill"?: "#hex", "size"?: 12, "anchor"?: "middle" }
    { "group": "id", "items": [...] }                              emits <g id>
Draw order: a single depth sort across boxes, tiles, paths and groups using
separating axes, so tiles on pedestals and routes behind boxes order
correctly. Items that interpenetrate fall back to centroid depth; split them
into smaller boxes when that looks wrong. Labels always draw last.
`;

const EXAMPLE = {
  unit: 22, padding: 20, stroke: { color: "#1f2a2e", width: 1.5 },
  palette: { ground: "#e9e4d8", wall: "#c9d8d3", accent: "#2f7d6d", ink: "#1f2a2e" },
  items: [
    { tile: [0, 0, 0, 8, 6], fill: "$ground" },
    { box: [1, 1, 0, 3, 2, 2], fill: "$wall" },
    { box: [1, 1, 2, 3, 2, 0.4], fill: "$accent" },
    { box: [5.5, 1.5, 0, 1.5, 1.5, 1], fill: "$wall" },
    { path: [[4, 2, 0.01], [5.5, 2.25, 0.01]], stroke: "$accent", width: 2.5, dash: "5 4" },
    { label: [6.25, 2.25, 1.6], text: "Delivered", fill: "$ink", size: 11 },
  ],
};

const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
const r2 = n => Math.round(n * 100) / 100;

function hexToHsl(hex) {
  let h = hex.replace("#", ""); if (h.length === 3) h = [...h].map(c => c + c).join("");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue * 60, s, l];
}
function shadeHex(hex, delta) {
  if (!/^#[0-9a-f]{3,6}$/i.test(hex) || !delta) return hex;
  const [h, s, l] = hexToHsl(hex), L = Math.min(1, Math.max(0, l + delta));
  const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(L, 1 - L); return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0"); };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function compile(scene) {
  const unit = scene.unit ?? 24, pad = scene.padding ?? 16;
  const shade = { top: 0, left: -0.12, right: -0.24, ...scene.shade };
  const pal = scene.palette ?? {};
  const col = c => typeof c === "string" && c.startsWith("$") ? (pal[c.slice(1)] ?? c) : c;
  const P = ([x, y, z]) => [(x - y) * COS * unit, (x + y) * SIN * unit - z * unit];
  const stroke = scene.stroke ? ` stroke="${scene.stroke.color}" stroke-width="${scene.stroke.width ?? 1}" stroke-linejoin="round"` : "";
  const shapes = [], pts = [];
  const poly = (corners, fill, extra = "") => {
    const p = corners.map(P); pts.push(...p);
    return `<polygon points="${p.map(([a, b]) => `${r2(a)},${r2(b)}`).join(" ")}" fill="${fill}"${stroke}${extra}/>`;
  };
  const faces = fill => typeof fill === "object" ? { top: col(fill.top), left: col(fill.left), right: col(fill.right) }
    : { top: shadeHex(col(fill), shade.top), left: shadeHex(col(fill), shade.left), right: shadeHex(col(fill), shade.right) };
  const attrs = it => `${it.id ? ` id="${it.id}"` : ""}${it.class ? ` class="${it.class}"` : ""}`;

  function emit(it) {
    if (it.box) {
      const [x, y, z, w, d, h] = it.box, f = faces(it.fill ?? "#cccccc");
      // Visible faces for a viewer looking from +x,+y: top, the +y face (left) and the +x face (right).
      return `<g${attrs(it)}>` +
        poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], f.left) +
        poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], f.right) +
        poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], f.top) + "</g>";
    }
    if (it.tile) {
      const [x, y, z, w, d] = it.tile;
      return poly([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], col(it.fill ?? "#eeeeee"), attrs(it));
    }
    if (it.path) {
      const p = it.path.map(P); pts.push(...p);
      const dAttr = p.map(([a, b], i) => `${i ? "L" : "M"}${r2(a)} ${r2(b)}`).join(" ") + (it.close ? " Z" : "");
      return `<path d="${dAttr}" fill="none" stroke="${col(it.stroke ?? "#000")}" stroke-width="${it.width ?? 2}" stroke-linecap="round" stroke-linejoin="round"${it.dash ? ` stroke-dasharray="${it.dash}"` : ""}${attrs(it)}/>`;
    }
    if (it.label) {
      const [a, b] = P(it.label); pts.push([a, b]);
      const esc = String(it.text).replace(/&/g, "&amp;").replace(/</g, "&lt;");
      return `<text x="${r2(a)}" y="${r2(b)}" fill="${col(it.fill ?? "#000")}" font-size="${it.size ?? 12}" text-anchor="${it.anchor ?? "middle"}" font-family="inherit"${attrs(it)}>${esc}</text>`;
    }
    if (it.group) return `<g id="${it.group}">${order(it.items).map(emit).join("")}</g>`;
    throw new Error(`Unknown item: ${JSON.stringify(it).slice(0, 80)}`);
  }
  // Draw order: one depth sort across boxes, tiles, paths and groups. For two
  // items that do not intersect, the one entirely on the far side of the other
  // along x, y or z (the viewer sits at +x, +y, +z) draws first. Overlapping
  // footprints with no separating axis fall back to centroid depth. Labels last.
  function bounds(it) {
    if (it.box) { const [x, y, z, w, d, h] = it.box; return [x, x + w, y, y + d, z, z + h]; }
    if (it.tile) { const [x, y, z, w, d] = it.tile; return [x, x + w, y, y + d, z, z]; }
    if (it.path) { const xs = it.path.map(p => p[0]), ys = it.path.map(p => p[1]), zs = it.path.map(p => p[2]);
      return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), Math.min(...zs), Math.max(...zs)]; }
    if (it.group) { const bs = it.items.filter(i => !i.label).map(bounds);
      return [0, 1, 2, 3, 4, 5].map(k => (k % 2 ? Math.max : Math.min)(...bs.map(b => b[k]))); }
    return null;
  }
  const screenBox = b => { const c = [];
    for (const x of [b[0], b[1]]) for (const y of [b[2], b[3]]) for (const z of [b[4], b[5]]) c.push(P([x, y, z]));
    const xs = c.map(p => p[0]), ys = c.map(p => p[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; };
  const behind = (a, b) => a[1] <= b[0] || a[3] <= b[2] || a[5] <= b[4];
  const depth = b => (b[0] + b[1] + b[2] + b[3] + b[4] + b[5]) / 2;
  function order(items) {
    const nodes = items.map((it, i) => ({ it, i, b: bounds(it) }));
    const labels = nodes.filter(n => !n.b), solid = nodes.filter(n => n.b);
    for (const n of solid) { n.s = screenBox(n.b); n.after = new Set(); n.indeg = 0; n.d = depth(n.b); }
    for (const a of solid) for (const b of solid) {
      if (a === b || a.s[1] <= b.s[0] || b.s[1] <= a.s[0] || a.s[3] <= b.s[2] || b.s[3] <= a.s[2]) continue;
      if (behind(a.b, b.b) && !behind(b.b, a.b) && !a.after.has(b)) { a.after.add(b); b.indeg++; }
    }
    const out = [], left = new Set(solid);
    const pick = list => list.reduce((m, n) => !m || n.d < m.d || (n.d === m.d && n.i < m.i) ? n : m, null);
    while (left.size) {
      const ready = [...left].filter(n => n.indeg === 0);
      const n = pick(ready.length ? ready : [...left]);   // a cycle (interpenetrating items) breaks by depth
      left.delete(n); out.push(n.it);
      for (const m of n.after) m.indeg--;
    }
    return [...out, ...labels.sort((a, b) => a.i - b.i).map(n => n.it)];
  }
  for (const it of order(scene.items ?? [])) shapes.push(emit(it));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const sw = scene.stroke?.width ?? 0;
  const minX = Math.min(...xs) - pad - sw, minY = Math.min(...ys) - pad - sw;
  const w = Math.max(...xs) - Math.min(...xs) + 2 * (pad + sw), h = Math.max(...ys) - Math.min(...ys) + 2 * (pad + sw);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(minX)} ${r2(minY)} ${r2(w)} ${r2(h)}" width="${Math.ceil(w)}" height="${Math.ceil(h)}" role="img">\n  ${shapes.join("\n  ")}\n</svg>\n`;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("iso.mjs")) {
  const args = process.argv.slice(2);
  if (args.includes("--example")) { process.stdout.write(JSON.stringify(EXAMPLE, null, 2) + "\n"); process.exit(0); }
  if (!args.length || args.includes("--help") || args.includes("-h")) { process.stdout.write(HELP); process.exit(args.length ? 0 : 1); }
  try {
    const svg = compile(JSON.parse(readFileSync(args[0], "utf8")));
    const o = args.indexOf("-o");
    if (o >= 0) writeFileSync(args[o + 1], svg); else process.stdout.write(svg);
  } catch (e) { process.stderr.write(`iso: ${e.message}\n`); process.exit(1); }
}
