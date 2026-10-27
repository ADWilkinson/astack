#!/usr/bin/env node
// fi: renders sticker icons built on kit/fun.ts in headless Chrome, as contact sheets to judge motion, single frames,
// a structural check, and looping alpha video to ship. Ported from fun-isometric by Kelvin Adithya (MIT, see kit/LICENSE).
// Requires Node 22.13+ or Bun, Chrome or Chromium, and ffmpeg for sheet and export. No dependencies: each TypeScript file
// is type-stripped and served to Chrome from a local server, and Chrome is driven over the DevTools protocol.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

const HELP = `Usage:
  fi check  <icons.ts> [name...]
    structure (ids, parents, clips, palette slots, morph commands, loops), clipping at the canvas edge on every frame,
    and the loop seam; exits 1 on a problem
  fi sheet  <icons.ts> [name...] [--fps 10] [--cells 20] [--px 200] [--out sheet.png]
    ten frames to a row, sampled at --fps from frame 0, on white
  fi frame  <icons.ts> <name> <frame> [--px 800] [--out frame.png] [--bg #ffffff]
  fi export <icons.ts> <name> [--px 400] [--out dir] [--bg #ffffff]
    every frame of the loop at 60fps to <name>.webm (VP9 alpha) and, on macOS, <name>.mp4 (HEVC alpha for Safari),
    plus <name>.png at the still frame as the poster; --bg flattens to an H.264 mp4 instead

Colours, on sheet, frame and export:
  --palette riso|candy|matcha|sunset|clay|aqua, or six slots as json ('{"main":"#0a84ff"}') or a .json file
  --hue <deg> | --brand '#primary[,#secondary]' | --mono '#hex'

fun.ts must sit next to icons.ts (copy the kit from this skill's kit/ folder). Run with node or bun.
Set CHROME_PATH to choose the browser.`;

// Anything that exits early still takes Chrome and its profile down with it.
const cleanups = [];
const die = m => { console.error(`fi: ${m}`); for (const c of cleanups.splice(0)) c(); process.exit(1); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const argv = process.argv.slice(2);
const flags = {}, pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[i + 1] === undefined || argv[i + 1].startsWith("--") ? true : argv[++i];
  else pos.push(argv[i]);
}
if (flags.help) { console.log(HELP); process.exit(0); }
const [cmd, file, ...names] = pos;
if (!cmd || !file) { console.error(HELP); process.exit(1); }
if (!["check", "sheet", "frame", "export"].includes(cmd)) die(`unknown command ${cmd}\n${HELP}`);
const mod = resolve(file);
const kit = join(dirname(mod), "fun.ts");
if (!existsSync(mod)) die(`no ${mod}`);
if (!existsSync(kit)) die(`no fun.ts next to ${mod}, copy the kit there`);
if ((cmd === "sheet" || cmd === "export") && spawnSync("ffmpeg", ["-version"]).status !== 0) die("ffmpeg is needed for sheet and export");

// Types out, JavaScript in: Bun's transpiler under Bun, node:module's stripper under Node.
async function stripper() {
  if (globalThis.Bun) { const t = new Bun.Transpiler({ loader: "ts" }); return src => t.transformSync(src); }
  const { stripTypeScriptTypes } = await import("node:module");
  if (!stripTypeScriptTypes) die("needs Node 22.13+ (module.stripTypeScriptTypes) or Bun");
  process.removeAllListeners("warning");
  return src => stripTypeScriptTypes(src, { mode: "strip" });
}

// The page's side: every exported icon and the painters fi calls over CDP.
const ENTRY = (modUrl, kitUrl) => `import * as mod from ${JSON.stringify(modUrl)};
import { PALETTES, RISO, brand, draw, hue, mono } from ${JSON.stringify(kitUrl)};
const icons = [...new Set(Object.values(mod).flatMap(v => (Array.isArray(v) ? v : [v])))].filter(v => v && typeof v === "object" && "layers" in v && "frames" in v);
const find = name => icons.find(i => i.name === name);
const NUM = /-?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[-+]?\\d+)?/gi;
let palette;
const canvas = px => { const c = document.createElement("canvas"); c.width = c.height = px; return c; };
const paint = (ctx, icon, frame, px, bg, pal) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, px, px);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, px, px); }
  ctx.scale(px / (icon.size ?? 500), px / (icon.size ?? 500));
  draw(ctx, icon, frame, pal);
};
Object.assign(window, {
  icons: icons.map(i => ({ name: i.name, frames: i.frames, still: i.still ?? 0 })),
  colours(spec) {
    if (typeof spec.palette === "string" && !(spec.palette in PALETTES)) throw new Error("no palette " + spec.palette + ", try " + Object.keys(PALETTES).join(" "));
    palette = (typeof spec.palette === "string" ? PALETTES[spec.palette] : spec.palette) ??
      (spec.hue != null ? hue(spec.hue) : spec.brand ? brand(...spec.brand.split(/[ ,]+/)) : spec.mono ? mono(spec.mono) : undefined);
  },
  // what the type system cannot see: dangling ids, unknown slots, morphs whose commands drift, loops that do not divide the icon
  lint(name) {
    const icon = find(name), out = [], ids = new Set();
    for (const L of icon.layers) if (L.id) ids.has(L.id) ? out.push('id "' + L.id + '" used twice') : ids.add(L.id);
    const byId = new Map(icon.layers.filter(L => L.id).map(L => [L.id, L]));
    icon.layers.forEach((L, i) => {
      const at = L.id ? 'layer "' + L.id + '"' : "layer " + i;
      if (L.parent && !ids.has(L.parent)) out.push(at + ': parent "' + L.parent + '" not found');
      if (L.clip && !ids.has(L.clip)) out.push(at + ': clip "' + L.clip + '" not found');
      for (let up = L, n = 0; up?.parent; up = byId.get(up.parent)) if (++n > 32) { out.push(at + ": parents loop"); break; }
      for (const m of [L.m].flat().filter(Boolean))
        if (m.loop && icon.frames % m.loop) out.push(at + ": a motion repeats every " + m.loop + " frames in a " + icon.frames + " frame icon, give it loop: " + icon.frames);
      for (const S of L.shapes) {
        for (const c of [S.fill, S.side, icon.ink].filter(Boolean)) if (c[0] !== "#" && !(c in RISO)) out.push(at + ': "' + c + '" is not a palette slot or a hex');
        if (Array.isArray(S.d) && new Set(S.d.map(([, d]) => d.replace(NUM, "#"))).size > 1) out.push(at + ": morph keys have different commands");
        if (S.trim !== undefined && S.fill) out.push(at + ": trim only draws on an open path, this one is filled");
      }
    });
    return [...new Set(out)];
  },
  // frames where ink reaches the canvas edge, so a swing or a sparkle is cut off
  clipped(name) {
    const icon = find(name), px = 200, ctx = canvas(px).getContext("2d", { willReadFrequently: true }), hits = [];
    for (let f = 0; f < icon.frames; f++) {
      paint(ctx, icon, f, px);
      const d = ctx.getImageData(0, 0, px, px).data;
      let hit = false;
      for (let i = 0; i < px && !hit; i++) hit = d[i * 4 + 3] > 24 || d[((px - 1) * px + i) * 4 + 3] > 24 || d[i * px * 4 + 3] > 24 || d[(i * px + px - 1) * 4 + 3] > 24;
      if (hit) hits.push(f);
    }
    return hits;
  },
  shot(name, frame, px, bg) {
    const c = canvas(px);
    paint(c.getContext("2d"), find(name), frame, px, bg, palette);
    return c.toDataURL("image/png");
  },
  // pixels whose luminance moves by more than 40 between two frames, at 300px on white
  delta(name, a, b) {
    const icon = find(name), px = 300;
    const lum = f => {
      const ctx = canvas(px).getContext("2d");
      paint(ctx, icon, f, px, "#fff");
      const d = ctx.getImageData(0, 0, px, px).data, out = new Float32Array(px * px);
      for (let i = 0; i < out.length; i++) out[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      return out;
    };
    const [x, y] = [lum(a), lum(b)];
    let n = 0;
    for (let i = 0; i < x.length; i++) if (Math.abs(x[i] - y[i]) > 40) n++;
    return n;
  },
});`;

// Serves the entry and any module under the icons folder or the working directory, extensionless imports resolved.
async function serve() {
  const strip = await stripper();
  const roots = [dirname(mod), process.cwd()].map(r => r.endsWith(sep) ? r : r + sep);
  const fsUrl = p => "/@fs" + p.split(sep).join("/");
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://fi");
    const send = (type, body, code = 200) => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(body); };
    if (url.pathname === "/") return send("text/html", '<!doctype html><body style="margin:0"><script type="module" src="/__fi.js"></script>');
    if (url.pathname === "/__fi.js") return send("text/javascript", ENTRY(fsUrl(mod), fsUrl(kit)));
    if (!url.pathname.startsWith("/@fs/")) return send("text/plain", "not found", 404);
    const want = resolve(decodeURIComponent(url.pathname.slice(4)));
    if (!roots.some(r => want.startsWith(r))) return send("text/plain", "outside the project", 403);
    const hit = [want, `${want}.ts`, `${want}.js`, `${want}.mjs`, join(want, "index.ts")].find(p => existsSync(p) && statSync(p).isFile());
    if (!hit) return send("text/plain", `no module ${want}`, 404);
    try {
      const src = readFileSync(hit, "utf8");
      send("text/javascript", /\.m?js$/.test(hit) ? src : strip(src));
    } catch (e) { send("text/plain", `${hit}: ${e.message}`, 500); }
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  return server;
}

function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  return candidates.find(c => existsSync(c)) ?? die("no Chrome or Chromium found, set CHROME_PATH");
}

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), "fi-profile-"));
  const proc = spawn(findChrome(), [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--mute-audio", "--disable-extensions", "--disable-background-networking",
    ...(process.env.CI || process.getuid?.() === 0 ? ["--no-sandbox"] : []), "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", d => { stderr = (stderr + d).slice(-2000); });
  const port = await new Promise((ok, fail) => {
    const timer = setTimeout(() => fail(new Error("Chrome did not expose a DevTools port")), 15000);
    const poll = setInterval(() => {
      const f = join(profile, "DevToolsActivePort");
      const p = existsSync(f) && readFileSync(f, "utf8").split("\n")[0];
      if (p) { clearInterval(poll); clearTimeout(timer); ok(Number(p)); }
    }, 50);
    proc.on("exit", code => { clearInterval(poll); clearTimeout(timer); fail(new Error(`Chrome exited (${code}) ${stderr.trim().split("\n").slice(-2).join(" | ")}`)); });
  });
  const kill = () => { try { proc.kill("SIGKILL"); } catch { /* already gone */ } rmSync(profile, { recursive: true, force: true }); };
  cleanups.push(kill);
  const close = async () => {
    cleanups.splice(cleanups.indexOf(kill), 1);
    try { proc.kill("SIGKILL"); } catch { /* already gone */ }
    await sleep(200);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  return { port, close };
}

async function connect(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const ws = new WebSocket((await res.json()).webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let id = 0;
  const pending = new Map(), errors = [];
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails?.exception?.description?.split("\n")[0] ?? "exception");
  };
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params }));
  });
  // Calls a window function in the page with JSON arguments and returns its JSON result.
  const call = async (fn, ...args) => {
    const r = await send("Runtime.evaluate", { expression: `window.${fn}(...${JSON.stringify(args)})`, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.split("\n")[0] ?? r.exceptionDetails.text);
    return r.result.value;
  };
  return { send, call, errors, close: () => ws.close() };
}

const server = await serve();
cleanups.push(() => server.close());
const chrome = await launch().catch(e => die(e.message));
let exitCode = 0;
try {
  const cdp = await connect(chrome.port);
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/` });
  let all;
  for (let t = 0; t < 150 && !all; t++) {
    await sleep(100);
    all = (await cdp.send("Runtime.evaluate", { expression: "window.icons", returnByValue: true })).result.value;
    if (cdp.errors.length) die(`the icons module failed in the page: ${cdp.errors.join("; ")}`);
  }
  if (!all) die("the icons module never loaded");
  if (!all.length) die(`no icons exported from ${file}`);
  const spec = {
    palette: typeof flags.palette !== "string" ? undefined : /^[a-z]+$/.test(flags.palette) ? flags.palette
      : JSON.parse(existsSync(flags.palette) ? readFileSync(flags.palette, "utf8") : flags.palette),
    hue: flags.hue !== undefined ? Number(flags.hue) : undefined,
    brand: typeof flags.brand === "string" ? flags.brand : undefined,
    mono: typeof flags.mono === "string" ? flags.mono : undefined,
  };
  await cdp.call("colours", spec);
  const named = n => all.find(i => i.name === n) ?? die(`no icon "${n}" in ${all.map(i => i.name).join(", ")}`);
  const pick = names.length && (cmd === "check" || cmd === "sheet") ? names.map(named) : all;
  const png = url => Buffer.from(url.split(",")[1], "base64");
  const shot = (name, f, px, bg) => cdp.call("shot", name, f, px, bg ?? null);
  const ffmpeg = (args, what) => { if (spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" }).status) die(`ffmpeg failed: ${what}`); };

  if (cmd === "sheet") {
    const [fps, cells, px] = [Number(flags.fps ?? 10), Number(flags.cells ?? 20), Number(flags.px ?? 200)];
    const out = resolve(flags.out ?? "sheet.png");
    const tmp = mkdtempSync(join(tmpdir(), "fi-sheet-"));
    let n = 0;
    for (const icon of pick)
      for (let i = 0; i < cells; i++) writeFileSync(join(tmp, `${String(n++).padStart(5, "0")}.png`), png(await shot(icon.name, (i * 60) / fps, px, "#ffffff")));
    ffmpeg(["-i", join(tmp, "%05d.png"), "-vf", `tile=10x${Math.ceil(n / 10)}`, "-frames:v", "1", out], "tile");
    rmSync(tmp, { recursive: true, force: true });
    console.log(`${out}  ${pick.map(i => i.name).join(", ")}  ${fps}fps x ${cells}`);
  } else if (cmd === "frame") {
    const [name, f] = names;
    if (!name || f === undefined) die("frame needs <name> <frame>");
    named(name);
    const out = resolve(flags.out ?? `${name}-${f}.png`);
    writeFileSync(out, png(await shot(name, Number(f), Number(flags.px ?? 800), flags.bg ?? "#ffffff")));
    console.log(out);
  } else if (cmd === "export") {
    const icon = named(names[0]);
    const px = Math.round(Number(flags.px ?? 400) / 2) * 2;
    const dir = resolve(flags.out ?? ".");
    const tmp = mkdtempSync(join(tmpdir(), "fi-export-"));
    for (let f = 0; f < icon.frames; f++) writeFileSync(join(tmp, `${String(f).padStart(5, "0")}.png`), png(await shot(icon.name, f, px, flags.bg)));
    const src = ["-framerate", "60", "-i", join(tmp, "%05d.png"), "-an"];
    const base = join(dir, icon.name);
    mkdirSync(dir, { recursive: true });
    if (flags.bg) ffmpeg([...src, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart", `${base}.mp4`], `${base}.mp4`);
    else {
      ffmpeg([...src, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-row-mt", "1", `${base}.webm`], `${base}.webm`);
      if (process.platform === "darwin")
        ffmpeg([...src, "-c:v", "hevc_videotoolbox", "-alpha_quality", "0.75", "-allow_sw", "1", "-b:v", "800k", "-tag:v", "hvc1", `${base}.mp4`], `${base}.mp4`);
    }
    writeFileSync(`${base}.png`, png(await shot(icon.name, icon.still, px, flags.bg)));
    rmSync(tmp, { recursive: true, force: true });
    console.log(`${base}.${flags.bg ? "mp4" : "webm"}  ${icon.frames} frames at ${px}px, poster ${base}.png`);
  } else {
    let bad = 0;
    for (const icon of pick) {
      const L = icon.frames - 1;
      const problems = [...await cdp.call("lint", icon.name)];
      const clipped = await cdp.call("clipped", icon.name);
      const [before, wrap, after] = [await cdp.call("delta", icon.name, L - 1, L), await cdp.call("delta", icon.name, L, 0), await cdp.call("delta", icon.name, 0, 1)];
      if (clipped.length) problems.push(`touches the canvas edge on ${clipped.length} frame${clipped.length > 1 ? "s" : ""} (${clipped.slice(0, 6).join(", ")}${clipped.length > 6 ? ", ..." : ""}): shrink it or pull it in`);
      // the wrap from the last frame to the first should change no more than the frames either side of it
      if (wrap > 300 && wrap > 3 * Math.max(before, after))
        problems.push(`the loop jumps at the seam (${wrap} px against ${before} and ${after}): a preset loop that does not divide the frames, or a motion running past the end`);
      bad += problems.length > 0;
      console.log(`${problems.length ? "FAIL" : "ok  "} ${icon.name}${problems.map(p => `\n     ${p}`).join("")}`);
    }
    console.log(bad ? `fi: ${bad} of ${pick.length} icons need work` : `fi: ${pick.length} icons pass`);
    exitCode = bad ? 1 : 0;
  }
  cdp.close();
} finally {
  await chrome.close();
  server.close();
}
process.exit(exitCode);
