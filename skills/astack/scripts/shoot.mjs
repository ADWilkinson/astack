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
  --shift URL          Load this second page at the same sizes. The first
                       page is the loading state, this one the settled state.
                       Reports regions (same id or data-region) whose box
                       moved by more than 1px, and any change in document
                       scroll height. Exits 1 when one did. Exits 2 when no
                       region was marked and the scroll height did not change,
                       which is not a pass. Settled shots are named with -settled.
  --json               Print a JSON manifest instead of text

Set SHOOT_CHROME_FLAGS for extra browser flags. --no-sandbox is added
automatically when CI is set or when running as root.

Also reports, per capture: horizontal overflow, elements wider than the
viewport, stranded words in wrapped text, tap targets under 44px and
selectable control text (widths < 768), text under 12px, inputs under 16px,
a viewport that disables zoom, :hover rules outside @media (hover: hover),
a missing tap-highlight reset when the page has controls, console errors
and failed requests. Set CHROME_PATH to override browser discovery. The
temporary browser profile is deleted afterwards. Exits 1 if a page fails
to load, returns an HTTP error, or --shift finds a moved region or a
document scroll height change of more than 1px. Exits 2 when --shift could
not compare a marked region and the scroll height did not change. A bare
host:port (localhost:3000) is treated as http://.
The layout-shift entries on the performance timeline are not read. Headless
Chrome can report none of them for a jump that has already painted, so a
score of 0 would pass a page that moved. The two-page box compare is the check.
`;

function resolveTarget(value) {
  if (/^[a-z]+:\/\//i.test(value)) return value;
  return !existsSync(value) && /^(?:localhost|[\w-]+(?:\.[\w-]+)+|\d+\.\d+\.\d+\.\d+)(?::\d+)?(?:\/|$)|^[\w.-]+:\d+/.test(value)
    ? `http://${value}` : pathToFileURL(resolve(value)).href;
}

function parse(argv) {
  const o = { target: "", shift: "", out: "shots", widths: [390, 1440], height: 0, themes: ["light", "dark"],
    motion: "reduce", full: false, wait: 600, frames: 0, every: 100, click: "", scale: 2, shotSuffix: "", json: false };
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
    else if (a === "--shift") o.shift = v();
    else if (a === "--json") o.json = true;
    else if (a.startsWith("--")) throw new Error(`Unknown option ${a}`);
    else o.target = a;
  }
  if (!o.target) { process.stdout.write(HELP); process.exit(1); }
  o.target = resolveTarget(o.target);
  if (o.shift) o.shift = resolveTarget(o.shift);
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

// Best effort: a leftover temp profile must never fail the check itself.
function removeProfile(profile) {
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
  catch (e) { process.stderr.write(`warning: could not remove ${profile}: ${e.code ?? e.message}\n`); }
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
  const base = `${String(width)}-${theme}${o.shotSuffix || ""}`;
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
    const inputsUnder16 = [];
    for (const el of document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=reset]):not([type=file]):not([type=image]), textarea, select")) {
      if (!visible(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 16) { inputsUnder16.push((el.getAttribute("aria-label") || el.id || el.getAttribute("name") || el.getAttribute("placeholder") || el.tagName.toLowerCase()) + " " + (Math.round(size * 10) / 10) + "px"); if (inputsUnder16.length >= 8) break; }
    }
    const viewportMeta = document.querySelector('meta[name="viewport" i]')?.getAttribute("content") || "";
    const zoomLocked = /user-scalable\\s*=\\s*(?:no|0)\\b|maximum-scale\\s*=\\s*1(?:\\.0+)?(?![.\\d])/i.test(viewportMeta);
    const ungatedHovers = [];
    let ungatedHoverCount = 0, tapHighlightDisabled = false;
    const coversRoot = selector => selector.split(",").some(s => /^(?:html|:root|\\*|body)(?:\\s|$)/.test(s.trim()));
    const visitRules = (rules, media) => {
      if (!rules) return;
      for (const rule of rules) {
        if (rule.type === 4) visitRules(rule.cssRules, (media ? media + " " : "") + (rule.conditionText || ""));
        else if (rule.type === 3 && rule.styleSheet) { try { visitRules(rule.styleSheet.cssRules, media); } catch (e) { /* unreadable import */ } }
        else {
          if (rule.type === 1 && rule.selectorText) {
            if (/:hover\\b/.test(rule.selectorText) && !/\\(\\s*(?:any-)?hover\\s*:\\s*hover\\s*\\)/.test(media) && !/hover\\s*:\\s*none/.test(media)) {
              ungatedHoverCount++;
              if (ungatedHovers.length < 8) ungatedHovers.push(rule.selectorText.slice(0, 100));
            }
            const tap = rule.style && rule.style.getPropertyValue("-webkit-tap-highlight-color");
            if (tap && /transparent|rgba\\(\\s*0\\s*,\\s*0\\s*,\\s*0\\s*,\\s*0\\s*\\)/i.test(tap) && coversRoot(rule.selectorText)) tapHighlightDisabled = true;
          }
          if (rule.cssRules && rule.type !== 4) visitRules(rule.cssRules, media);
        }
      }
    };
    const seenSheets = new Set();
    for (const sheet of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
      if (seenSheets.has(sheet)) continue;
      seenSheets.add(sheet);
      try { visitRules(sheet.cssRules, ""); } catch (e) { /* cross-origin sheet */ }
    }
    const inlineTap = document.documentElement.style.getPropertyValue("-webkit-tap-highlight-color");
    if (inlineTap && /transparent/i.test(inlineTap)) tapHighlightDisabled = true;
    const hasControls = !!document.querySelector("a[href], button, [role=button], input, select, textarea");
    const selectableControls = [];
    if (vw < 768) for (const el of document.querySelectorAll("button, [role=button]")) {
      if (!visible(el) || !(el.innerText || "").trim()) continue;
      const cs = getComputedStyle(el);
      if ((cs.userSelect || cs.webkitUserSelect) !== "none") { selectableControls.push(label(el)); if (selectableControls.length >= 8) break; }
    }
    const regions = [], seenKeys = new Set();
    for (const el of document.querySelectorAll("[id], [data-region]")) {
      if (!visible(el)) continue;
      const key = el.id ? "#" + el.id : "region:" + el.getAttribute("data-region");
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const box = el.getBoundingClientRect();
      regions.push({ key, top: Math.round(box.top), left: Math.round(box.left), width: Math.round(box.width), height: Math.round(box.height) });
      if (regions.length >= 80) break;
    }
    return { scrollWidth: document.documentElement.scrollWidth, viewport: vw, overflowing: wide.map(w => w.text), stranded, smallTargets, tinyText,
      height: document.documentElement.scrollHeight, title: document.title,
      inputsUnder16, zoomLocked, ungatedHovers, ungatedHoverCount, tapHighlightDisabled: hasControls ? tapHighlightDisabled : null,
      selectableControls, regions };
  })()` });
  if (!o.frames) {
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: o.full });
    const file = join(o.out, `${base}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64")); files.push(file);
  }
  const l = layout.result.value;
  return { width, height, theme, motion: o.motion, files, ...(o.frames ? { frameTimesMs: frameTimes } : {}), title: l.title,
    scrollHeight: l.height, regions: l.regions,
    inputsUnder16: l.inputsUnder16, zoomLocked: l.zoomLocked, ungatedHovers: l.ungatedHovers, ungatedHoverCount: l.ungatedHoverCount,
    tapHighlightDisabled: l.tapHighlightDisabled, selectableControls: l.selectableControls,
    horizontalOverflow: l.scrollWidth > l.viewport ? `${l.scrollWidth - l.viewport}px` : null,
    overflowingElements: l.overflowing, strandedWords: l.stranded, smallTapTargets: l.smallTargets, tinyText: l.tinyText, ...issues };
}

// Same id or data-region in both pages. A disappearing spinner is not a shift;
// a card that grows, or a control that moves, is.
function compareShift(before, after) {
  const settled = new Map((after.regions || []).map(r => [r.key, r]));
  const shifts = [];
  let shared = 0;
  for (const region of before.regions || []) {
    const other = settled.get(region.key);
    if (!other) continue;
    shared++;
    const dx = other.left - region.left, dy = other.top - region.top, dw = other.width - region.width, dh = other.height - region.height;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(dw) > 1 || Math.abs(dh) > 1)
      shifts.push({ key: region.key, before: region, after: other, dx, dy, dw, dh });
  }
  const scrollDelta = (after.scrollHeight ?? 0) - (before.scrollHeight ?? 0);
  return {
    scrollBefore: before.scrollHeight ?? null, scrollAfter: after.scrollHeight ?? null,
    scrollDelta: Math.abs(scrollDelta) > 1 ? scrollDelta : 0, shared, shifts,
    settledFiles: after.files,
    ...(shared === 0 ? { note: "no shared id or data-region; only the document scroll height was compared" } : {}),
  };
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
      const before = await capture(cdp, o, width, theme);
      cdp.close();
      if (o.shift) {
        const settled = await connect(browser.port);
        await settled.send("Page.enable"); await settled.send("Runtime.enable"); await settled.send("Network.enable");
        const after = await capture(settled, { ...o, target: o.shift, shotSuffix: "-settled" }, width, theme);
        settled.close();
        before.shift = compareShift(before, after);
        if (after.loadError && !before.loadError) before.loadError = `settled page: ${after.loadError}`;
      }
      results.push(before);
    }
  } finally { await browser.close(); }
  const failed = results.some(r => r.loadError);
  const shifted = results.some(r => r.shift && (r.shift.shifts.length > 0 || r.shift.scrollDelta));
  // No marked region and no scroll change means the jump was not measured.
  // Scroll height stays at the viewport when both states fit, so that case must not pass.
  const unchecked = results.some(r => r.shift && r.shift.shared === 0 && !r.shift.scrollDelta);
  if (failed || shifted) process.exitCode = 1;
  else if (unchecked) process.exitCode = 2;
  if (o.json) { process.stdout.write(JSON.stringify({ target: o.target, captures: results }, null, 2) + "\n"); return; }
  for (const r of results) {
    const shiftFlag = r.shift && (r.shift.shifts.length > 0 || r.shift.scrollDelta) ? "layout shift" : "";
    const uncheckedFlag = r.shift && r.shift.shared === 0 && !r.shift.scrollDelta ? "shift not checked" : "";
    const flags = [r.loadError, shiftFlag, uncheckedFlag, r.horizontalOverflow && `horizontal overflow ${r.horizontalOverflow}`,
      r.consoleErrors.length && `${r.consoleErrors.length} console error(s)`,
      r.failedRequests.length && `${r.failedRequests.length} failed request(s)`].filter(Boolean);
    process.stdout.write(`${r.width}px ${r.theme}: ${r.files.join(", ")}${flags.length ? "  !! " + flags.join("; ") : ""}\n`);
    for (const e of r.overflowingElements) process.stdout.write(`    wider than viewport: ${e}\n`);
    for (const e of r.strandedWords) process.stdout.write(`    stranded words: ${e}\n`);
    for (const e of r.smallTapTargets) process.stdout.write(`    tap target < 44px: ${e}\n`);
    for (const e of r.tinyText) process.stdout.write(`    text < 12px: ${e}\n`);
    for (const e of r.inputsUnder16 || []) process.stdout.write(`    input under 16px: ${e}\n`);
    if (r.zoomLocked) process.stdout.write(`    viewport disables zoom\n`);
    if (r.ungatedHoverCount) process.stdout.write(`    hover not gated (${r.ungatedHoverCount}): ${(r.ungatedHovers || []).join("; ")}\n`);
    if (r.tapHighlightDisabled === false) process.stdout.write(`    tap highlight not disabled\n`);
    for (const e of r.selectableControls || []) process.stdout.write(`    control text selectable: ${e}\n`);
    if (r.shift) {
      if (r.shift.note) process.stdout.write(`    shift: ${r.shift.note}\n`);
      if (r.shift.scrollDelta) process.stdout.write(`    document scroll height ${r.shift.scrollDelta > 0 ? "+" : ""}${r.shift.scrollDelta}px after load\n`);
      for (const s of r.shift.shifts.slice(0, 12)) {
        const part = (n, label) => n ? `${label} ${n > 0 ? "+" : ""}${n}px` : "";
        const bits = [part(s.dy, "top"), part(s.dh, "height"), part(s.dx, "left"), part(s.dw, "width")].filter(Boolean);
        process.stdout.write(`    layout shift ${s.key}: ${bits.join(", ")}\n`);
      }
    }
    for (const e of [...new Set(r.consoleErrors)].slice(0, 5)) process.stdout.write(`    console: ${e}\n`);
    for (const e of [...new Set(r.failedRequests)].slice(0, 5)) process.stdout.write(`    request: ${e}\n`);
  }
}

main().catch(e => { process.stderr.write(`shoot: ${e.message}\n`); process.exit(1); });
