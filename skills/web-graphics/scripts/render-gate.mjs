#!/usr/bin/env node
// Render a page or asset at each size and fail it on what a reviewer would
// otherwise have to catch by eye: fonts that silently fell back, copy that is
// not the copy that was asked for, clipped or cropped text, and colours or
// faces outside the brand tokens.
// Dependency-free: drives a local Chrome/Chromium over the DevTools Protocol.
// Requires Node 22+ (global WebSocket).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HELP = `render-gate: render at each size and gate fonts, copy, clipping and brand tokens

Usage:
  node render-gate.mjs <url-or-file> [options]

Options:
  --size WxH           Render size in CSS px; repeat for several (default: 1440x900).
                       Each size is a fresh load, so the layout recomposes.
  --theme light|dark   Colour scheme to emulate (default: light)
  --scale N            Device scale factor of the PNGs (default: 1)
  --out DIR            Where the PNGs go (default: ./renders)
  --name NAME          File stem (default: the target's base name)
  --design FILE        DESIGN.md (YAML front matter), tokens .json or .css. Every
                       painted colour must match a token and every font a listed face.
  --fonts A,B          Families that must actually paint somewhere on the render
  --expect TEXT        Copy that must appear exactly as rendered text; repeatable
  --expect-file FILE   One expected line of copy per non-empty line
  --tolerance N        RGB distance still counted as a token colour (default: 12)
  --wait MS            Settle time after fonts are ready (default: 300)
  --json               Print a JSON report

Checks, per size:
  fonts    a face that fell back to another font, a webfont that failed to
           load, a --fonts family that never painted, a face not in --design
  copy     an --expect line missing from the rendered text
  clip     text cut off by its box, or cropped by the canvas edge when the
           render does not scroll (cards, slides, frames)
  colour   a painted text, background, border, fill, stroke or gradient colour
           more than --tolerance away from every --design token
  page     console errors, uncaught exceptions, failed requests

Exit codes: 0 passed; 1 findings (fix and run again); 2 the check could not run
(bad arguments, unreadable --design, no browser, a page that would not load).
Exit 2 is never a pass. Set CHROME_PATH to choose the browser.
`;

const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif",
  "ui-monospace", "ui-rounded", "math", "emoji", "fangsong", "-apple-system", "blinkmacsystemfont", "inherit", "initial"]);

class Unchecked extends Error {}

function parse(argv) {
  const o = { target: "", sizes: [], theme: "light", scale: 1, out: "renders", name: "", design: "", fonts: [], expect: [],
    tolerance: 12, wait: 300, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { const x = argv[++i]; if (x === undefined) throw new Unchecked(`${a} needs a value`); return x; };
    if (a === "--help" || a === "-h") { process.stdout.write(HELP); process.exit(0); }
    else if (a === "--size") {
      const m = /^(\d+)x(\d+)$/.exec(v());
      if (!m || m[1] === "0" || m[2] === "0" || /^0/.test(m[1]) || /^0/.test(m[2])) throw new Unchecked("--size takes WxH, e.g. 1200x630");
      o.sizes.push({ width: Number(m[1]), height: Number(m[2]) });
    }
    else if (a === "--theme") { o.theme = v(); if (!["light", "dark"].includes(o.theme)) throw new Unchecked("--theme is light or dark"); }
    else if (a === "--scale") o.scale = Number(v());
    else if (a === "--out") o.out = v();
    else if (a === "--name") o.name = v();
    else if (a === "--design") o.design = v();
    else if (a === "--fonts") o.fonts.push(...v().split(",").map(s => s.trim()).filter(Boolean));
    else if (a === "--expect") o.expect.push(v());
    else if (a === "--expect-file") {
      const f = v();
      if (!existsSync(f)) throw new Unchecked(`--expect-file not found: ${f}`);
      o.expect.push(...readFileSync(f, "utf8").split("\n").map(s => s.trim()).filter(Boolean));
    }
    else if (a === "--tolerance") o.tolerance = Number(v());
    else if (a === "--wait") o.wait = Number(v());
    else if (a === "--json") o.json = true;
    else if (a.startsWith("--")) throw new Unchecked(`Unknown option ${a}`);
    else o.target = a;
  }
  if (!o.target) throw new Unchecked("Give a URL or file to render. See --help.");
  if (!o.sizes.length) o.sizes.push({ width: 1440, height: 900 });
  if (!(o.scale > 0) || !(o.tolerance >= 0)) throw new Unchecked("--scale and --tolerance must be positive numbers");
  if (!o.name) o.name = basename(o.target.replace(/[?#].*$/, "")).replace(extname(o.target.replace(/[?#].*$/, "")), "") || "render";
  if (!/^[a-z]+:\/\//i.test(o.target)) {
    if (existsSync(o.target)) o.target = pathToFileURL(resolve(o.target)).href;
    else if (!/\.(html?|svg|xhtml)$/i.test(o.target) && /^(?:localhost|[\w-]+(?:\.[\w-]+)+|\d+\.\d+\.\d+\.\d+)(?::\d+)?(?:\/|$)|^[\w.-]+:\d+/.test(o.target)) o.target = `http://${o.target}`;
    else throw new Unchecked(`File not found: ${o.target}`);
  }
  return o;
}

const norm = s => s.toLowerCase().replace(/["']/g, "").replace(/\b(variable|vf|var)\b/g, "").replace(/[\s_-]+/g, "");
const lead = family => (family.split(",").map(f => f.trim().replace(/^["']|["']$/g, "")).find(Boolean) ?? "");
const sameFamily = (a, b) => { const x = norm(a), y = norm(b); return !!x && x === y; };
// PostScript names carry a style suffix ("Fraunces-SemiBold"); the family is its prefix.
const samePostScript = (ps, family) => { const x = norm(ps.split("-")[0]), y = norm(family); return !!x && x === y; };

// Brand tokens: hex colours anywhere in the token source, and the lead face of each typography entry.
function readDesign(file) {
  if (!existsSync(file)) throw new Unchecked(`--design not found: ${file}`);
  const raw = readFileSync(file, "utf8");
  const fm = /^---\n([\s\S]*?)\n---/.exec(raw);
  const source = extname(file).toLowerCase() === ".md" ? (fm ? fm[1] : "") : raw;
  const hex = [...new Set([...source.matchAll(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi)].map(m => m[1].toLowerCase()))];
  const colors = hex.map(h => {
    const x = h.length <= 4 ? [...h].map(c => c + c).join("") : h;
    return { hex: `#${h}`, rgb: [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)) };
  });
  const fonts = new Set();
  const typo = /(?:^|\n)typography:\s*\n((?:[ \t]+.*\n?)*)/.exec(source);
  if (typo) for (const m of typo[1].matchAll(/^[ \t]+[\w-]+:\s*["']([^"'\n]+)["']/gm)) { const f = lead(m[1]); if (f && !GENERIC.has(f.toLowerCase())) fonts.add(f); }
  for (const m of source.matchAll(/(?:font-family|--font[\w-]*)\s*:\s*([^;}\n]+)/gi)) { const f = lead(m[1]); if (f && !GENERIC.has(f.toLowerCase()) && !f.startsWith("var(")) fonts.add(f); }
  for (const m of source.matchAll(/"(?:fontFamily|family|font)"\s*:\s*"([^"]+)"/g)) { const f = lead(m[1]); if (f && !GENERIC.has(f.toLowerCase())) fonts.add(f); }
  if (!colors.length && !fonts.size) throw new Unchecked(`--design has no colour or font tokens: ${file}`);
  return { colors, fonts: [...fonts] };
}

function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/opt/pw-browsers/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Unchecked("No Chrome/Chromium found. Set CHROME_PATH to a Chromium-based browser binary.");
}

async function launch() {
  try { return await launchOnce(); }
  catch (e) { await sleep(1000); try { return await launchOnce(); } catch { throw new Unchecked(e.message); } }
}

// Best effort: a leftover temp profile must never fail the check itself.
function removeProfile(profile) {
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
  catch (e) { process.stderr.write(`warning: could not remove ${profile}: ${e.code ?? e.message}\n`); }
}

async function launchOnce() {
  const profile = mkdtempSync(join(tmpdir(), "render-gate-profile-"));
  const proc = spawn(findChrome(), [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio",
    "--disable-extensions", "--disable-background-networking", "--font-render-hinting=none",
    ...(process.env.CI || process.getuid?.() === 0 ? ["--no-sandbox"] : []),
    ...(process.env.SHOOT_CHROME_FLAGS ? process.env.SHOOT_CHROME_FLAGS.split(/\s+/) : []),
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"], detached: process.platform !== "win32" });
  let stderr = "";
  proc.stderr.on("data", d => { stderr = (stderr + d).slice(-2000); });
  const port = await new Promise((ok, fail) => {
    const timer = setTimeout(() => fail(new Error("Chrome did not expose a DevTools port")), 15000);
    const poll = setInterval(() => {
      const file = join(profile, "DevToolsActivePort");
      if (existsSync(file)) {
        const [p] = readFileSync(file, "utf8").split("\n");
        if (p) { clearInterval(poll); clearTimeout(timer); ok(Number(p)); }
      }
    }, 50);
    proc.on("exit", code => { clearInterval(poll); clearTimeout(timer);
      removeProfile(profile);
      fail(new Error(`Chrome exited (${code})${stderr.trim() ? `: ${stderr.trim().split("\n").slice(-3).join(" | ")}` : ""}`)); });
  });
  const exited = new Promise(r => proc.once("exit", r));
  const close = async () => {
    // Chrome's helpers (crashpad, zygote) outlive the main process and keep writing the profile.
    try { process.kill(process.platform === "win32" ? proc.pid : -proc.pid, "SIGKILL"); } catch { /* already exited */ }
    await Promise.race([exited, sleep(3000)]);
    removeProfile(profile);
  };
  return { port, close };
}

async function connect(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const { webSocketDebuggerUrl } = await res.json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let id = 0;
  const pending = new Map(), listeners = [];
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  // A crashed tab or a promise that never settles must end the run, not hang it.
  ws.onclose = () => { for (const { fail } of pending.values()) fail(new Unchecked("browser connection closed")); pending.clear(); };
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); fail(new Unchecked(`${method} timed out`)); }, 60000);
    pending.set(n, { ok: v => { clearTimeout(timer); ok(v); }, fail: e => { clearTimeout(timer); fail(e); } });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  return { send, on: fn => listeners.push(fn), close: () => ws.close() };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Runs in the page: tags every visible element that paints its own text and
// reports what the checks need, without changing layout.
const INSPECT = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const canvas = document.documentElement.scrollHeight <= vh + 1;
  // Visually hidden text (sr-only: a 1px box with a clip) is for screen readers, not the render.
  const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0
      && !(s.clip && s.clip !== "auto") && !s.clipPath.includes("inset(50%)"); };
  const name = el => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
    (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "");
  const text = [], clipped = [], truncated = [], cropped = [], paints = [];
  // Read any CSS colour (rgb, oklch, lab, color-mix...) as the sRGB bytes it actually paints.
  const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = v => { px.clearRect(0, 0, 1, 1); px.fillStyle = "rgba(0,0,0,0)"; px.fillStyle = v; px.fillRect(0, 0, 1, 1);
    const d = px.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
  const paint = (el, prop, value) => { if (!value || value === "none" || value.startsWith("url(") || value === "transparent") return;
    paints.push({ el: name(el), prop, value, rgba: rgba(value) }); };
  const COLOUR = /(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color|color-mix)\\((?:[^()]|\\([^()]*\\))*\\)|#[0-9a-f]{3,8}\\b/gi;
  let n = 0;
  for (const el of document.querySelectorAll("body, body *")) {
    if (!visible(el) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
    const s = getComputedStyle(el);
    const own = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
    if (own) {
      el.setAttribute("data-render-gate", String(n++));
      const words = [...el.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join(" ").trim().replace(/\\s+/g, " ").slice(0, 40);
      text.push({ id: n - 1, el: name(el), sample: words, family: s.fontFamily, letters: /[\\p{L}\\p{N}]/u.test(words) });
      const hides = [s.overflowX, s.overflowY].some(v => v !== "visible");
      const overflows = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      // A line clamp or ellipsis is a deliberate truncation; it only fails when it cuts required copy.
      const clamped = s.webkitLineClamp !== "none" && s.webkitLineClamp !== "" || s.textOverflow === "ellipsis";
      if (hides && overflows) (clamped ? truncated : clipped).push({ where: name(el) + ' "' + words + '"', full: el.innerText.replace(/\\s+/g, " ") });
      if (canvas) {
        const range = document.createRange(); range.selectNodeContents(el);
        for (const r of range.getClientRects()) if (r.width > 0 && (r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5)) {
          cropped.push(name(el) + ' "' + words + '"'); break; }
      }
      paint(el, "color", s.color);
    }
    for (const prop of ["backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor"]) {
      const side = prop.replace("Color", "Width");
      if (prop !== "backgroundColor" && !(parseFloat(s[side]) > 0)) continue;
      if (prop === "outlineColor" && s.outlineStyle === "none") continue;
      paint(el, prop, s[prop]);
    }
    if (s.backgroundImage.includes("gradient")) for (const m of s.backgroundImage.matchAll(COLOUR)) paint(el, "gradient", m[0]);
    if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) for (const prop of ["fill", "stroke"]) paint(el, prop, s[prop]);
  }
  const faces = document.fonts ? [...document.fonts].map(f => ({ family: f.family.replace(/^["']|["']$/g, ""), status: f.status })) : [];
  return { canvas, text, clipped: clipped.slice(0, 8), truncated, cropped: cropped.slice(0, 8), paints, faces,
    rendered: document.body ? document.body.innerText : "" };
})()`;

async function renderOne(browser, o, design, size) {
  const cdp = await connect(browser.port);
  const issues = { console: [], requests: [], load: null };
  cdp.on(m => {
    if (m.method === "Runtime.exceptionThrown") issues.console.push(m.params.exceptionDetails?.exception?.description?.split("\n")[0] ?? "exception");
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
      issues.console.push(m.params.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 200));
    if (m.method === "Network.loadingFailed" && !m.params.canceled) issues.requests.push(`${m.params.errorText}`);
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
      issues.requests.push(`${m.params.response.status} ${m.params.response.url}`);
      if (m.params.type === "Document" && !issues.load) issues.load = `page returned HTTP ${m.params.response.status}`;
    }
  });
  try {
    await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Network.enable");
    await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: size.width, height: size.height, deviceScaleFactor: o.scale, mobile: size.width < 768 });
    await cdp.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-color-scheme", value: o.theme }, { name: "prefers-reduced-motion", value: "reduce" }] });
    const loaded = new Promise(r => cdp.on(m => { if (m.method === "Page.loadEventFired") r(); }));
    const nav = await cdp.send("Page.navigate", { url: o.target });
    if (nav.errorText) throw new Unchecked(`navigation failed: ${nav.errorText}`);
    let timer;
    const late = await Promise.race([loaded.then(() => false), new Promise(r => { timer = setTimeout(() => r(true), 20000); })]);
    clearTimeout(timer);
    if (issues.load) throw new Unchecked(issues.load);
    if (late) throw new Unchecked("page did not finish loading within 20s");
    await cdp.send("Runtime.evaluate", { expression: "document.fonts ? document.fonts.ready.then(() => true) : true", awaitPromise: true });
    await sleep(o.wait);

    const file = join(o.out, `${o.name}-${size.width}x${size.height}${o.theme === "dark" ? "-dark" : ""}.png`);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(file, Buffer.from(shot.data, "base64"));

    const page = (await cdp.send("Runtime.evaluate", { expression: INSPECT, returnByValue: true })).result.value;
    const findings = [];
    const add = (check, message) => findings.push({ check, message });

    // Fonts: ask Chrome which platform font painted each text run.
    const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
    const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "[data-render-gate]" });
    const painted = new Set(), fellBack = new Map(), offBrand = new Map();
    const loadedFaces = new Set(page.faces.filter(f => f.status === "loaded").map(f => norm(f.family)));
    for (const f of page.faces.filter(f => f.status === "error")) add("fonts", `webfont "${f.family}" failed to load`);
    for (const [i, nodeId] of nodeIds.entries()) {
      const t = page.text[i];
      if (!t) continue;
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      for (const f of fonts) painted.add(f.familyName);
      const want = lead(t.family);
      // Emoji and lone symbols (arrows, flags) borrow a system face by design; judge runs with letters or digits.
      if (!want || GENERIC.has(want.toLowerCase()) || !t.letters) continue;
      const glyphs = fonts.reduce((sum, f) => sum + f.glyphCount, 0);
      // A loaded webfont paints under its own internal name, so count its custom glyphs as the face.
      const own = loadedFaces.has(norm(want)) ? fonts.filter(f => f.isCustomFont) : [];
      const matched = fonts.filter(f => own.includes(f) || sameFamily(f.familyName, want) || (f.postScriptName && samePostScript(f.postScriptName, want)));
      const matchedGlyphs = matched.reduce((sum, f) => sum + f.glyphCount, 0);
      if (matchedGlyphs) painted.add(want);
      // A few glyphs from another face (an emoji, a missing symbol) is normal; most of the run is not.
      if (glyphs && matchedGlyphs < glyphs * 0.5) {
        const by = fonts.slice().sort((a, b) => b.glyphCount - a.glyphCount)[0]?.familyName ?? "another font";
        if (!fellBack.has(want)) fellBack.set(want, `${t.el} "${t.sample}" painted in ${by}`);
      }
      if (design?.fonts.length && !design.fonts.some(d => sameFamily(d, want)) && !offBrand.has(want)) offBrand.set(want, `${t.el} "${t.sample}"`);
    }
    for (const [want, where] of fellBack) add("fonts", `"${want}" fell back: ${where}`);
    for (const [want, where] of offBrand) add("fonts", `"${want}" is not a face in ${o.design}: ${where}`);
    for (const f of o.fonts) if (![...painted].some(p => sameFamily(p, f))) add("fonts", `"${f}" never painted (painted: ${[...painted].join(", ") || "nothing"})`);

    // Copy: exact text, whitespace-insensitive.
    const rendered = page.rendered.replace(/\s+/g, " ");
    for (const line of o.expect) {
      const want = line.replace(/\s+/g, " ");
      if (!rendered.includes(want)) add("copy", `missing or changed: "${line}"`);
      else for (const t of page.truncated) if (t.full.includes(want)) add("clip", `required copy is truncated: ${t.where}`);
    }

    for (const c of page.clipped) add("clip", `text cut off by its box: ${c.where}`);
    for (const c of page.cropped) add("clip", `text cropped by the canvas edge: ${c}`);

    if (design?.colors.length) {
      const off = new Map();
      for (const p of page.paints) {
        if (!p.rgba || p.rgba[3] === 0) continue;
        const rgb = p.rgba.slice(0, 3);
        const near = Math.min(...design.colors.map(c => Math.hypot(c.rgb[0] - rgb[0], c.rgb[1] - rgb[1], c.rgb[2] - rgb[2])));
        if (near > o.tolerance) {
          const key = `rgb(${rgb.join(", ")})`;
          if (!off.has(key)) off.set(key, `${p.prop} on ${p.el}`);
        }
      }
      for (const [rgb, where] of [...off].slice(0, 10)) add("colour", `${rgb} is not a token: ${where}`);
      if (off.size > 10) add("colour", `${off.size - 10} more off-token colours`);
    }

    for (const e of [...new Set(issues.console)].slice(0, 5)) add("page", `console: ${e}`);
    for (const e of [...new Set(issues.requests)].slice(0, 5)) add("page", `request failed: ${e}`);
    return { size: `${size.width}x${size.height}`, file, canvas: page.canvas, painted: [...painted], findings };
  } finally { cdp.close(); }
}

async function main() {
  let o;
  try { o = parse(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`render-gate: ${e.message}\n`); process.exit(2); }
  const design = o.design ? readDesign(o.design) : null;
  mkdirSync(o.out, { recursive: true });
  const browser = await launch();
  const renders = [];
  try { for (const size of o.sizes) renders.push(await renderOne(browser, o, design, size)); }
  finally { await browser.close(); }
  const passed = renders.every(r => !r.findings.length);
  if (o.json) process.stdout.write(JSON.stringify({ target: o.target, theme: o.theme, passed, renders }, null, 2) + "\n");
  else {
    for (const r of renders) {
      process.stdout.write(`${r.size}: ${r.file}${r.findings.length ? `  ${r.findings.length} finding(s)` : "  pass"}\n`);
      for (const f of r.findings) process.stdout.write(`    ${f.check}: ${f.message}\n`);
    }
    process.stdout.write(passed ? "render-gate: pass\n" : "render-gate: findings, fix and run again\n");
  }
  process.exitCode = passed ? 0 : 1;
}

main().catch(e => { process.stderr.write(`render-gate: could not check: ${e.message}\n`); process.exit(2); });
