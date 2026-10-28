#!/usr/bin/env node
// Render an HTML composition to MP4, frame by frame, so a demo clip is code:
// a fix is an edit and a re-render, and every take is identical. The page is
// paused and seeked to each frame time, never recorded in real time.
// Dependency-free: drives a local Chrome/Chromium over the DevTools Protocol
// and encodes with ffmpeg. Requires Node 22+ (global WebSocket).
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HELP = `film: render an HTML composition to MP4 and gate the result

Usage:
  node film.mjs <composition.html|url> [options]

Options:
  --out FILE           Output video (default: film.mp4)
  --size WxH           Frame size in CSS px (default: 1920x1080; 1080x1920 for vertical)
  --fps N              Frames per second (default: 30)
  --duration S         Length in seconds. Otherwise read from window.__film.duration,
                       <html data-duration="S">, or the end of the longest finite animation.
  --theme light|dark   Colour scheme to emulate (default: light)
  --audio FILE         Mux this audio track (trimmed to the video)
  --poster FILE        Also write a PNG of one frame (see --poster-at)
  --poster-at S        Time of the poster frame (default: 0)
  --crf N              x264 quality, lower is better (default: 18)
  --keep-frames DIR    Keep the rendered PNG frames here
  --json               Print a JSON report

The composition contract:
  Everything that moves must be seekable. CSS animations and the Web Animations
  API work with no extra code: every animation is paused and its currentTime set
  per frame. <video> elements are seeked to the frame time. GSAP's global timeline
  is seeked when window.gsap exists. Anything else (canvas loops, timers,
  requestAnimationFrame) must expose window.__film = { duration, seek(seconds) },
  and seek may return a promise. Start every animation on load; nothing may
  wait for scroll, hover or a timer.

Gates on the encoded file:
  the duration and size match; the first frame is not black or one flat colour;
  the film is not frozen for most of its length (animations that never seeked);
  no console errors, failed requests or failed webfonts while rendering.
  Black spans and holds over 2s mid-film are reported as warnings.

Exit codes: 0 passed; 1 findings; 2 could not run (bad arguments, no browser,
no ffmpeg, a page that would not load, no duration). Exit 2 is never a pass.
`;

class Unchecked extends Error {}

function parse(argv) {
  const o = { target: "", out: "film.mp4", width: 1920, height: 1080, fps: 30, duration: 0, theme: "light", audio: "",
    poster: "", posterAt: 0, crf: 18, keep: "", json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { const x = argv[++i]; if (x === undefined) throw new Unchecked(`${a} needs a value`); return x; };
    if (a === "--help" || a === "-h") { process.stdout.write(HELP); process.exit(0); }
    else if (a === "--out") o.out = v();
    else if (a === "--size") {
      const m = /^(\d+)x(\d+)$/.exec(v());
      if (!m) throw new Unchecked("--size takes WxH, e.g. 1920x1080");
      o.width = Number(m[1]); o.height = Number(m[2]);
    }
    else if (a === "--fps") o.fps = Number(v());
    else if (a === "--duration") o.duration = Number(v());
    else if (a === "--theme") { o.theme = v(); if (!["light", "dark"].includes(o.theme)) throw new Unchecked("--theme is light or dark"); }
    else if (a === "--audio") { o.audio = v(); if (!existsSync(o.audio)) throw new Unchecked(`--audio not found: ${o.audio}`); }
    else if (a === "--poster") o.poster = v();
    else if (a === "--poster-at") o.posterAt = Number(v());
    else if (a === "--crf") o.crf = Number(v());
    else if (a === "--keep-frames") o.keep = v();
    else if (a === "--json") o.json = true;
    else if (a.startsWith("--")) throw new Unchecked(`Unknown option ${a}`);
    else o.target = a;
  }
  if (!o.target) throw new Unchecked("Give a composition file or URL. See --help.");
  if (o.width % 2 || o.height % 2) throw new Unchecked("--size needs even width and height for H.264");
  if (!(o.fps > 0 && o.fps <= 120)) throw new Unchecked("--fps must be between 1 and 120");
  if (!(o.duration >= 0) || !(o.posterAt >= 0)) throw new Unchecked("--duration and --poster-at must be positive numbers");
  if (!/^[a-z]+:\/\//i.test(o.target)) {
    if (!existsSync(o.target)) throw new Unchecked(`File not found: ${o.target}`);
    o.target = pathToFileURL(resolve(o.target)).href;
  }
  return o;
}

function need(bin) {
  const r = spawnSync(bin, ["-version"], { encoding: "utf8" });
  if (r.status !== 0) throw new Unchecked(`${bin} not found on PATH; install ffmpeg`);
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
  const profile = mkdtempSync(join(tmpdir(), "film-profile-"));
  const proc = spawn(findChrome(), [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio",
    "--disable-extensions", "--disable-background-networking", "--font-render-hinting=none",
    "--autoplay-policy=no-user-gesture-required",
    ...(process.env.CI || process.getuid?.() === 0 ? ["--no-sandbox"] : []),
    ...(process.env.SHOOT_CHROME_FLAGS ? process.env.SHOOT_CHROME_FLAGS.split(/\s+/) : []),
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"], detached: process.platform !== "win32" });
  let stderr = "";
  proc.stderr.on("data", d => { stderr = (stderr + d).slice(-2000); });
  const port = await new Promise((ok, fail) => {
    const timer = setTimeout(() => { clearInterval(poll);
      try { process.kill(process.platform === "win32" ? proc.pid : -proc.pid, "SIGKILL"); } catch { /* already exited */ }
      fail(new Error("Chrome did not expose a DevTools port")); }, 15000);
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
  // A crashed tab or a seek that never settles must end the run, not hang it.
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

// Installed in the page once: pause everything, then seek it on demand.
const DRIVER = `(() => {
  const ends = document.getAnimations().map(a => a.effect?.getComputedTiming().endTime).filter(Number.isFinite);
  window.__filmSeek = async t => {
    if (window.__film && typeof window.__film.seek === "function") await window.__film.seek(t);
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = t * 1000; }
    if (window.gsap?.globalTimeline) { window.gsap.globalTimeline.pause(); window.gsap.globalTimeline.time(t, false); }
    await Promise.all([...document.querySelectorAll("video")].map(v => new Promise(done => {
      v.pause();
      const at = Math.min(t, Number.isFinite(v.duration) ? Math.max(v.duration - 0.001, 0) : t);
      if (Math.abs(v.currentTime - at) < 0.0005) return done();
      v.addEventListener("seeked", done, { once: true }); setTimeout(done, 2000); v.currentTime = at;
    })));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
  const declared = Number(window.__film?.duration ?? document.documentElement.dataset.duration);
  const faces = document.fonts ? [...document.fonts].filter(f => f.status === "error").map(f => f.family) : [];
  return { declared: Number.isFinite(declared) && declared > 0 ? declared : 0,
    longest: ends.length ? Math.max(...ends) / 1000 : 0,
    infinite: document.getAnimations().some(a => a.effect?.getComputedTiming().iterations === Infinity), faces };
})()`;

function ffmpeg(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, err: r.stderr ?? "" };
}

function probe(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_frames:format=duration",
    "-of", "json", file], { encoding: "utf8" });
  if (r.status !== 0) throw new Unchecked(`ffprobe could not read ${file}: ${r.stderr.trim()}`);
  const j = JSON.parse(r.stdout);
  return { width: j.streams[0].width, height: j.streams[0].height, frames: Number(j.streams[0].nb_frames), duration: Number(j.format.duration) };
}

async function main() {
  let o;
  try { o = parse(process.argv.slice(2)); need("ffmpeg"); need("ffprobe"); }
  catch (e) { process.stderr.write(`film: ${e.message}\n`); process.exit(2); }
  const frames = o.keep ? resolve(o.keep) : mkdtempSync(join(tmpdir(), "film-frames-"));
  mkdirSync(frames, { recursive: true });
  // ffmpeg reads the whole numbered sequence, so frames left by a longer earlier render would join this one.
  for (const f of readdirSync(frames)) if (/^f\d{5}\.png$/.test(f)) rmSync(join(frames, f));
  const issues = { console: [], requests: [] };
  const browser = await launch();
  let meta, duration, count;
  try {
    const cdp = await connect(browser.port);
    cdp.on(m => {
      if (m.method === "Runtime.exceptionThrown") issues.console.push(m.params.exceptionDetails?.exception?.description?.split("\n")[0] ?? "exception");
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
        issues.console.push(m.params.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 200));
      if (m.method === "Network.loadingFailed" && !m.params.canceled) issues.requests.push(m.params.errorText);
      if (m.method === "Network.responseReceived" && m.params.response.status >= 400) issues.requests.push(`${m.params.response.status} ${m.params.response.url}`);
    });
    await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Network.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: o.width, height: o.height, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-color-scheme", value: o.theme }, { name: "prefers-reduced-motion", value: "no-preference" }] });
    // Hold every CSS animation at its start from the first style pass, so short ones cannot finish
    // (and drop out of document.getAnimations()) before the driver takes over.
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `new MutationObserver((_, obs) => {
      if (!document.documentElement) return;
      const s = document.createElement("style"); s.id = "__film-hold";
      s.textContent = "*,*::before,*::after{animation-play-state:paused!important}";
      document.documentElement.prepend(s); obs.disconnect();
    }).observe(document, { childList: true });` });
    const loaded = new Promise(r => cdp.on(m => { if (m.method === "Page.loadEventFired") r(); }));
    const nav = await cdp.send("Page.navigate", { url: o.target });
    if (nav.errorText) throw new Unchecked(`navigation failed: ${nav.errorText}`);
    let timer;
    const late = await Promise.race([loaded.then(() => false), new Promise(r => { timer = setTimeout(() => r(true), 20000); })]);
    clearTimeout(timer);
    if (late) throw new Unchecked("page did not finish loading within 20s");
    await cdp.send("Runtime.evaluate", { expression: "document.fonts ? document.fonts.ready.then(() => true) : true", awaitPromise: true });
    await cdp.send("Runtime.evaluate", { expression: "Promise.all([...document.images].map(i => i.decode().catch(() => {})))", awaitPromise: true });
    meta = (await cdp.send("Runtime.evaluate", { expression: DRIVER, returnByValue: true })).result.value;
    duration = o.duration || meta.declared || (meta.infinite ? 0 : meta.longest);
    if (!(duration > 0)) throw new Unchecked("No duration: pass --duration, set <html data-duration>, or expose window.__film.duration (infinite animations have no end)");
    count = Math.round(duration * o.fps);
    for (let f = 0; f < count; f++) {
      const t = f / o.fps;
      const r = await cdp.send("Runtime.evaluate", { expression: `window.__filmSeek(${t})`, awaitPromise: true });
      if (r.exceptionDetails) throw new Unchecked(`seek failed at ${t.toFixed(3)}s: ${r.exceptionDetails.exception?.description?.split("\n")[0] ?? "exception"}`);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(frames, `f${String(f).padStart(5, "0")}.png`), Buffer.from(shot.data, "base64"));
    }
    // Seek back and compare: a frame that differs on a second visit is driven by the clock
    // (timers, requestAnimationFrame), so the next render will not match this one.
    for (const f of [0, Math.floor(count / 2)]) {
      const r = await cdp.send("Runtime.evaluate", { expression: `window.__filmSeek(${f / o.fps})`, awaitPromise: true });
      if (r.exceptionDetails) throw new Unchecked(`seek failed at ${(f / o.fps).toFixed(3)}s: ${r.exceptionDetails.exception?.description?.split("\n")[0] ?? "exception"}`);
      const again = await cdp.send("Page.captureScreenshot", { format: "png" });
      if (Buffer.from(again.data, "base64").compare(readFileSync(join(frames, `f${String(f).padStart(5, "0")}.png`))) !== 0) {
        meta.drift = (f / o.fps).toFixed(2); break;
      }
    }
    cdp.close();
  } finally { await browser.close(); }

  mkdirSync(dirname(resolve(o.out)), { recursive: true });
  const enc = ffmpeg(["-y", "-framerate", String(o.fps), "-i", join(frames, "f%05d.png"),
    ...(o.audio ? ["-i", o.audio, "-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(o.crf), "-preset", "medium", "-movflags", "+faststart", o.out]);
  if (enc.code !== 0) throw new Unchecked(`ffmpeg failed: ${enc.err.trim().split("\n").slice(-3).join(" | ")}`);
  if (o.poster) {
    const index = Math.min(Math.round(o.posterAt * o.fps), count - 1);
    mkdirSync(dirname(resolve(o.poster)), { recursive: true });
    copyFileSync(join(frames, `f${String(index).padStart(5, "0")}.png`), o.poster);
  }
  if (!o.keep) rmSync(frames, { recursive: true, force: true });

  const findings = [], warnings = [];
  const p = probe(o.out);
  if (p.width !== o.width || p.height !== o.height) findings.push(`encoded ${p.width}x${p.height}, asked for ${o.width}x${o.height}`);
  if (Math.abs(p.duration - duration) > 1.5 / o.fps) findings.push(`encoded ${p.duration.toFixed(2)}s, asked for ${duration.toFixed(2)}s`);
  // Every gate below must actually run; an ffmpeg that cannot apply a filter is not a clean result.
  const analyse = filter => {
    const r = ffmpeg(["-i", o.out, "-vf", filter, "-an", "-f", "null", "-"]);
    if (r.code !== 0) throw new Unchecked(`ffmpeg could not run ${filter.split("=")[0]}: ${r.err.trim().split("\n").slice(-2).join(" | ")}`);
    return r.err;
  };
  const first = analyse("select=eq(n\\,0),signalstats,metadata=print");
  const ymin = Number(/YMIN=([\d.]+)/.exec(first)?.[1]), ymax = Number(/YMAX=([\d.]+)/.exec(first)?.[1]);
  if (!Number.isFinite(ymin) || !Number.isFinite(ymax)) throw new Unchecked("could not read the first frame's brightness from ffmpeg");
  let opensBlack = false;
  for (const m of analyse("blackdetect=d=0.1:pix_th=0.10").matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)) {
    const [s, e] = [Number(m[1]), Number(m[2])];
    if (s < 0.05) { opensBlack = true; findings.push(`opens on black for ${(e - s).toFixed(2)}s; start on the meaningful frame`); }
    else warnings.push(`black from ${s.toFixed(2)}s to ${e.toFixed(2)}s`);
  }
  if (!opensBlack && ymax - ymin < 10) findings.push(`first frame is one flat colour (luma ${ymin}-${ymax}); start on the meaningful frame`);
  if (meta.drift) findings.push(`not deterministic: the frame at ${meta.drift}s changed when seeked again, so something runs on the clock instead of the timeline (expose window.__film.seek)`);
  // A freeze that runs to the end of the file reports a start and no end, so it lasts to the end.
  const hold = Math.min(2, p.duration / 4);
  const starts = [], ends = [];
  for (const line of analyse(`freezedetect=n=0.001:d=${hold.toFixed(3)}`).split("\n")) {
    const st = /freeze_start: ([\d.]+)/.exec(line), en = /freeze_end: ([\d.]+)/.exec(line);
    if (st) starts.push(Number(st[1]));
    if (en) ends.push(Number(en[1]));
  }
  let frozen = 0;
  for (const [i, start] of starts.entries()) {
    const span = (ends[i] ?? p.duration) - start;
    frozen += span;
    if (span >= 2) warnings.push(`no change from ${start.toFixed(2)}s for ${span.toFixed(2)}s`);
  }
  if (frozen >= p.duration * 0.9) findings.push("nothing moves for most of the film: animations did not seek (see the composition contract in --help)");
  for (const f of meta.faces) findings.push(`webfont "${f}" failed to load`);
  for (const e of [...new Set(issues.console)].slice(0, 5)) findings.push(`console: ${e}`);
  for (const e of [...new Set(issues.requests)].slice(0, 5)) findings.push(`request failed: ${e}`);

  const report = { out: o.out, width: p.width, height: p.height, fps: o.fps, duration: Number(p.duration.toFixed(3)), frames: count,
    poster: o.poster || null, passed: !findings.length, findings, warnings };
  if (o.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else {
    process.stdout.write(`${o.out}: ${p.width}x${p.height}, ${p.duration.toFixed(2)}s, ${count} frames at ${o.fps}fps${o.poster ? `, poster ${o.poster}` : ""}\n`);
    for (const f of findings) process.stdout.write(`    finding: ${f}\n`);
    for (const w of warnings) process.stdout.write(`    note: ${w}\n`);
    process.stdout.write(findings.length ? "film: findings, fix and render again\n" : "film: pass\n");
  }
  process.exitCode = findings.length ? 1 : 0;
}

main().catch(e => { process.stderr.write(`film: could not run: ${e.message}\n`); process.exit(2); });
