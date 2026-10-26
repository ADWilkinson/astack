#!/usr/bin/env node
// Capture a page the way a reviewer needs to see it: mobile and desktop,
// light and dark, reduced motion, optionally a filmstrip of an animation.
// Dependency-free: drives a local Chrome/Chromium over the DevTools Protocol.
// Requires Node 22+ (global WebSocket).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HELP = `shoot: capture rendered evidence of a page

Usage:
  node shoot.mjs <url-or-file> [options]

Options:
  --out DIR            Output directory (default: ./shots)
  --widths 390,1440    Viewport widths in CSS px (default: 390,1440)
  --height N           Viewport height (default: 900; 844 for widths < 768)
  --themes light,dark  Colour schemes to emulate (default: light,dark)
  --motion reduce      Emulate prefers-reduced-motion: reduce|no-preference (default: reduce)
  --full               Capture the full scrollable page, not just the viewport
  --wait MS            Extra settle time after load (default: 600)
  --frames N           Capture N viewport frames for a filmstrip (forces motion
                       no-preference). Starts at the load event, or immediately
                       after --click. Files are named with the real ms offset.
  --every MS           Target interval between frames (default: 100; actual
                       offsets depend on capture speed and are reported)
  --click SELECTOR     Click this element before capturing (e.g. to open a menu)
  --scale N            Device scale factor (default: 2)
  --json               Print a JSON manifest instead of text

Set SHOOT_CHROME_FLAGS for extra browser flags. --no-sandbox is added
automatically when CI is set or when running as root.

Also reports: horizontal overflow, stranded words in wrapped text, tap
targets under 44px (widths < 768), text under 12px, console errors, failed
requests and
elements wider than the viewport, per capture. Set CHROME_PATH to override
browser discovery. The temporary browser profile is deleted afterwards.
Exits 1 if the page fails to load or returns an HTTP error. A bare
host:port (localhost:3000) is treated as http://.
`;

function parse(argv) {
  const o = { target: "", out: "shots", widths: [390, 1440], height: 0, themes: ["light", "dark"],
    motion: "reduce", full: false, wait: 600, frames: 0, every: 100, click: "", scale: 2, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${a} needs a value`); return x; };
    if (a === "--help" || a === "-h") { process.stdout.write(HELP); process.exit(0); }
    else if (a === "--out") o.out = v();
    else if (a === "--widths") o.widths = v().split(",").map(Number).filter(Boolean);
    else if (a === "--height") o.height = Number(v());
    else if (a === "--themes") o.themes = v().split(",").filter(t => t === "light" || t === "dark");
    else if (a === "--motion") o.motion = v();
    else if (a === "--full") o.full = true;
    else if (a === "--wait") o.wait = Number(v());
    else if (a === "--frames") o.frames = Number(v());
    else if (a === "--every") o.every = Number(v());
    else if (a === "--click") o.click = v();
    else if (a === "--scale") o.scale = Number(v());
    else if (a === "--json") o.json = true;
    else if (a.startsWith("--")) throw new Error(`Unknown option ${a}`);
    else o.target = a;
  }
  if (!o.target) { process.stdout.write(HELP); process.exit(1); }
  if (!/^[a-z]+:\/\//i.test(o.target))
    o.target = !existsSync(o.target) && /^(?:localhost|[\w-]+(?:\.[\w-]+)+|\d+\.\d+\.\d+\.\d+)(?::\d+)?(?:\/|$)|^[\w.-]+:\d+/.test(o.target)
      ? `http://${o.target}` : pathToFileURL(resolve(o.target)).href;
  if (o.frames) o.motion = "no-preference";
  return o;
}

function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/opt/pw-browsers/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error("No Chrome/Chromium found. Set CHROME_PATH to a Chromium-based browser binary.");
}

// Headless Chrome occasionally dies during startup on busy CI runners; one retry
// with a fresh profile clears it without hiding a real failure.
async function launch() {
  try { return await launchOnce(); }
  catch (e) { await sleep(1000); try { return await launchOnce(); } catch { throw e; } }
}

async function launchOnce() {
  const profile = mkdtempSync(join(tmpdir(), "shoot-profile-"));
  const proc = spawn(findChrome(), [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio",
    "--disable-extensions", "--disable-background-networking",
    // CI runners and containers often forbid the namespaces Chrome's sandbox needs.
    ...(process.env.CI || process.getuid?.() === 0 ? ["--no-sandbox"] : []),
    ...(process.env.SHOOT_CHROME_FLAGS ? process.env.SHOOT_CHROME_FLAGS.split(/\s+/) : []),
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
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
      rmSync(profile, { recursive: true, force: true });
      fail(new Error(`Chrome exited (${code})${stderr.trim() ? `: ${stderr.trim().split("\n").slice(-3).join(" | ")}` : ""}`)); });
  });
  const exited = new Promise(r => proc.once("exit", r));
  const close = async () => {
    try { proc.kill("SIGKILL"); } catch { /* already exited */ }
    await Promise.race([exited, sleep(3000)]);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
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
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params }));
  });
  return { send, on: fn => listeners.push(fn), close: () => ws.close() };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function capture(cdp, o, width, theme) {
  const height = o.height || (width < 768 ? 844 : 900);
  const issues = { consoleErrors: [], failedRequests: [], loadError: null };
  cdp.on(m => {
    if (m.method === "Runtime.exceptionThrown") issues.consoleErrors.push(m.params.exceptionDetails?.exception?.description?.split("\n")[0] ?? "exception");
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
      issues.consoleErrors.push(m.params.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 200));
    if (m.method === "Network.loadingFailed" && !m.params.canceled) issues.failedRequests.push(m.params.errorText);
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
      issues.failedRequests.push(`${m.params.response.status} ${m.params.response.url}`);
      if (m.params.type === "Document" && !issues.loadError) issues.loadError = `page returned HTTP ${m.params.response.status}`;
    }
  });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: o.scale, mobile: width < 768 });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: width < 768 });
  await cdp.send("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-color-scheme", value: theme },
    { name: "prefers-reduced-motion", value: o.motion },
  ] });
  const loaded = new Promise(r => cdp.on(m => { if (m.method === "Page.loadEventFired") r(); }));
  const nav = await cdp.send("Page.navigate", { url: o.target });
  if (nav.errorText) issues.loadError = `navigation failed: ${nav.errorText}`;
  await Promise.race([loaded, sleep(20000)]);
  // A load filmstrip starts at the load event; anything else waits for fonts and settle time.
  const filmFromLoad = o.frames && !o.click;
  if (!filmFromLoad) {
    await cdp.send("Runtime.evaluate", { expression: "document.fonts ? document.fonts.ready.then(() => true) : true", awaitPromise: true });
    await sleep(o.wait);
  }
  let t0 = Date.now();
  if (o.click) {
    const r = await cdp.send("Runtime.evaluate", { expression: `(() => { const el = document.querySelector(${JSON.stringify(o.click)}); if (!el) return false; el.click(); return true; })()`, returnByValue: true });
    if (!r.result.value) issues.consoleErrors.push(`--click selector not found: ${o.click}`);
    t0 = Date.now();
    if (!o.frames) await sleep(o.wait);
  }
  const files = [], frameTimes = [];
  const base = `${String(width)}-${theme}`;
  if (o.frames) {
    // Capture first, measure the page afterwards, so frame 0 is as close to the trigger as possible.
    for (let f = 0; f < o.frames; f++) {
      const due = t0 + f * o.every;
      if (Date.now() < due) await sleep(due - Date.now());
      frameTimes.push(Date.now() - t0);
      const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 85, optimizeForSpeed: true });
      const file = join(o.out, `${base}-frame${String(f).padStart(2, "0")}-${frameTimes[f]}ms.jpg`);
      writeFileSync(file, Buffer.from(shot.data, "base64")); files.push(file);
    }
  }
  const layout = await cdp.send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [];
    // Content inside a scroller or clipping box is allowed past the viewport.
    // So is anything inside a fixed or transformed layer (drawers, carousels), or hidden.
    const clipped = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX !== "visible" || s.position === "fixed" || s.transform !== "none" || s.visibility === "hidden" || s.opacity === "0") return true;
    } return false; };
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      const own = getComputedStyle(el);
      if (r.width > 0 && r.right > 0 && (r.right > vw + 1 || r.left < -1) && own.position !== "fixed" && own.visibility !== "hidden" && own.opacity !== "0" && !clipped(el) && !wide.some(w => w.el.contains(el))) {
        const id = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "");
        wide.push({ el, text: id + " (" + Math.round(r.left) + "→" + Math.round(r.right) + ")" });
        if (wide.length >= 5) break;
      }
    }
    const label = el => (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().replace(/\\s+/g, " ").slice(0, 50);
    const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0; };
    // Stranded words: a multi-line block whose last line holds one word or < 30% of the widest line.
    const stranded = [];
    for (const el of document.querySelectorAll("h1,h2,h3,h4,p,li,button,a,figcaption,blockquote,dd,td,th,label")) {
      if (!visible(el) || el.closest("pre,code") || (el.parentElement && el.parentElement.innerText.trim() === el.innerText.trim() && el.parentElement.matches("h1,h2,h3,h4,p,li,button,a,figcaption,blockquote,dd,td,th,label")) || [...el.children].some(c => /^(P|DIV|UL|OL|H[1-6])$/.test(c.tagName))) continue;
      // Line boxes from text nodes only; element boxes (inline-blocks, links) would distort the widths.
      const rects = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t; (t = tw.nextNode());) { if (!t.textContent.trim()) continue;
        const rr = document.createRange(); rr.selectNodeContents(t); rects.push(...rr.getClientRects()); }
      const lines = [];
      for (const r of rects) {
        if (r.width < 1) continue;
        const line = lines.find(l => Math.abs(l.top - r.top) < r.height / 2);
        line ? (line.left = Math.min(line.left, r.left), line.right = Math.max(line.right, r.right)) : lines.push({ top: r.top, left: r.left, right: r.right });
      }
      if (lines.length < 2) continue;
      lines.sort((a, b) => a.top - b.top);
      const widest = Math.max(...lines.map(l => l.right - l.left)), last = lines[lines.length - 1];
      const words = el.innerText.trim().split(/\\s+/), lastWidth = last.right - last.left;
      // Measure the real width of the last word, so a one-word last line is caught on any type size.
      let lastWord = 0;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node, tail = null;
      while ((node = walker.nextNode())) if (node.textContent.trim()) tail = node;
      if (tail) {
        const text = tail.textContent.replace(/\\s+$/, ""), start = Math.max(text.search(/\\S+$/), 0);
        const r = document.createRange(); r.setStart(tail, start); r.setEnd(tail, text.length);
        lastWord = r.getBoundingClientRect().width;
      }
      if (lastWidth < widest * 0.3 || (words.length >= 4 && lastWord > 0 && lastWidth <= lastWord + 2))
        stranded.push(el.tagName.toLowerCase() + ": \\u2026" + words.slice(-3).join(" ") + " (last line " + Math.round(lastWidth / widest * 100) + "%)");
      if (stranded.length >= 8) break;
    }
    // Tap targets under 44px on touch layouts, and body text under 12px anywhere.
    const smallTargets = [], tinyText = [];
    if (vw < 768) for (const el of document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab]")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right <= 0 || r.bottom <= 0 || r.left >= vw) continue;
      if ((r.width < 44 || r.height < 44) && !(el.tagName === "A" && el.closest("p,li") && getComputedStyle(el).display === "inline"))
        smallTargets.push(label(el) + " " + Math.round(r.width) + "x" + Math.round(r.height));
      if (smallTargets.length >= 8) break;
    }
    for (const el of document.querySelectorAll("p,li,span,a,button,label,td")) {
      if (!visible(el) || !el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 12) { tinyText.push(label(el) + " " + size + "px"); if (tinyText.length >= 5) break; }
    }
    return { scrollWidth: document.documentElement.scrollWidth, viewport: vw, overflowing: wide.map(w => w.text), stranded, smallTargets, tinyText,
      height: document.documentElement.scrollHeight, title: document.title };
  })()` });
  if (!o.frames) {
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: o.full });
    const file = join(o.out, `${base}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64")); files.push(file);
  }
  const l = layout.result.value;
  return { width, height, theme, motion: o.motion, files, ...(o.frames ? { frameTimesMs: frameTimes } : {}), title: l.title,
    horizontalOverflow: l.scrollWidth > l.viewport ? `${l.scrollWidth - l.viewport}px` : null,
    overflowingElements: l.overflowing, strandedWords: l.stranded, smallTapTargets: l.smallTargets, tinyText: l.tinyText, ...issues };
}

async function main() {
  const o = parse(process.argv.slice(2));
  mkdirSync(o.out, { recursive: true });
  const browser = await launch();
  const results = [];
  try {
    for (const width of o.widths) for (const theme of o.themes) {
      const cdp = await connect(browser.port);
      await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Network.enable");
      results.push(await capture(cdp, o, width, theme));
      cdp.close();
    }
  } finally { await browser.close(); }
  const failed = results.some(r => r.loadError);
  if (failed) process.exitCode = 1;
  if (o.json) { process.stdout.write(JSON.stringify({ target: o.target, captures: results }, null, 2) + "\n"); return; }
  for (const r of results) {
    const flags = [r.loadError, r.horizontalOverflow && `horizontal overflow ${r.horizontalOverflow}`,
      r.consoleErrors.length && `${r.consoleErrors.length} console error(s)`,
      r.failedRequests.length && `${r.failedRequests.length} failed request(s)`].filter(Boolean);
    process.stdout.write(`${r.width}px ${r.theme}: ${r.files.join(", ")}${flags.length ? "  !! " + flags.join("; ") : ""}\n`);
    for (const e of r.overflowingElements) process.stdout.write(`    wider than viewport: ${e}\n`);
    for (const e of r.strandedWords) process.stdout.write(`    stranded words: ${e}\n`);
    for (const e of r.smallTapTargets) process.stdout.write(`    tap target < 44px: ${e}\n`);
    for (const e of r.tinyText) process.stdout.write(`    text < 12px: ${e}\n`);
    for (const e of [...new Set(r.consoleErrors)].slice(0, 5)) process.stdout.write(`    console: ${e}\n`);
    for (const e of [...new Set(r.failedRequests)].slice(0, 5)) process.stdout.write(`    request: ${e}\n`);
  }
}

main().catch(e => { process.stderr.write(`shoot: ${e.message}\n`); process.exit(1); });
