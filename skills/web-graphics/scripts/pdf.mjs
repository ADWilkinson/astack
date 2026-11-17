#!/usr/bin/env node
// Print an HTML document to PDF and check every page before anyone opens it:
// content that runs off or is cut inside a sheet, a page count that differs
// from the sheets authored, text too small to read on paper, fonts and files
// that failed to load.
// Dependency-free: drives a local Chrome/Chromium over the DevTools Protocol.
// Requires Node 22+ (global WebSocket).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HELP = `pdf: print an HTML document to PDF and gate every page

Usage:
  node pdf.mjs <url-or-file> [options]

The document contract: each sheet is one element matching --page (default
".page"), sized to the paper, with "@page { size: A4; margin: 0 }" (or the
size you print) and "break-after: page" on every sheet but the last.

Options:
  --out FILE        The PDF to write (default: <name>.pdf beside the source)
  --pages DIR       Where the per-page PNGs go (default: <out dir>/pages)
  --page SELECTOR   Element that is one sheet (default: .page)
  --min-pt N        Smallest text allowed, in points (default: 7)
  --scale N         Device scale factor of the page PNGs (default: 1)
  --wait MS         Settle time after fonts are ready (default: 300)
  --json            Print a JSON report

Checks:
  overflow  an element or line of text that runs past its sheet, which print
            would cut or push onto an unplanned page. Mark a deliberate
            full-bleed element with data-bleed.
  clip      text cut off by a box inside the sheet that hides its overflow
  count     the PDF has a different number of pages than the document authored
  type      text that renders under --min-pt points, after any scaling
  fonts     a webfont that failed to load
  page      console errors, uncaught exceptions, failed requests

Exit codes: 0 passed; 1 findings (fix and run again); 2 the check could not run
(bad arguments, no browser, a page that would not load, no sheets found).
Exit 2 is never a pass. Set CHROME_PATH to choose the browser.
`;

class Unchecked extends Error {}

function parse(argv) {
  const o = { target: "", out: "", pages: "", page: ".page", minPt: 7, scale: 1, wait: 300, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { const x = argv[++i]; if (x === undefined) throw new Unchecked(`${a} needs a value`); return x; };
    if (a === "--help" || a === "-h") { process.stdout.write(HELP); process.exit(0); }
    else if (a === "--out") o.out = v();
    else if (a === "--pages") o.pages = v();
    else if (a === "--page") o.page = v();
    else if (a === "--min-pt") o.minPt = Number(v());
    else if (a === "--scale") o.scale = Number(v());
    else if (a === "--wait") o.wait = Number(v());
    else if (a === "--json") o.json = true;
    else if (a.startsWith("--")) throw new Unchecked(`unknown option ${a}`);
    else if (!o.target) o.target = a;
    else throw new Unchecked(`unexpected argument ${a}`);
  }
  if (!o.target) throw new Unchecked("give a URL or an HTML file (see --help)");
  if (!(o.minPt > 0) || !(o.scale > 0) || !(o.wait >= 0)) throw new Unchecked("--min-pt, --scale and --wait take positive numbers");
  const local = !/^https?:\/\//.test(o.target);
  if (local && !existsSync(o.target)) throw new Unchecked(`file not found: ${o.target}`);
  const path = local ? o.target : new URL(o.target).pathname;
  const stem = basename(path, extname(path)) || "document";
  if (!o.out) o.out = local ? join(dirname(resolve(o.target)), `${stem}.pdf`) : `${stem}.pdf`;
  if (!o.pages) o.pages = join(dirname(resolve(o.out)), "pages");
  o.stem = stem;
  if (local) o.target = pathToFileURL(resolve(o.target)).href;
  return o;
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
  const profile = mkdtempSync(join(tmpdir(), "pdf-profile-"));
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


// Runs in the page under print media: measures each sheet without changing layout.
const INSPECT = (selector, minPx) => `(() => {
  let sheets;
  try { sheets = [...document.querySelectorAll(${JSON.stringify(selector)})]; }
  catch { return { error: "selector" }; }
  const label = el => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
    (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "");
  const shown = s => s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0;
  const past = (r, box) => r.width > 0 && r.height > 0 && (r.bottom > box.bottom + 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.left < box.left - 1);
  // How much larger or smaller the element paints than its CSS size says.
  const scaleOf = el => {
    if (el instanceof SVGGraphicsElement && el.getScreenCTM) { const m = el.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; }
    const r = el.getBoundingClientRect();
    return el.offsetWidth > 0 && r.width > 0 ? r.width / el.offsetWidth : 1;
  };
  const out = sheets.map((sheet, i) => {
    const box = sheet.getBoundingClientRect();
    const spill = [], clip = [], small = [], flagged = new Set();
    for (const el of sheet.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if (!shown(s) || el.closest("[data-bleed]")) continue;
      // Boxes: an image, table or block that leaves the sheet. Report the outermost only.
      if (past(el.getBoundingClientRect(), box) && ![...flagged].some(f => f.contains(el))) {
        flagged.add(el);
        const r = el.getBoundingClientRect();
        spill.push(label(el) + " (" + Math.round(r.width) + "x" + Math.round(r.height) + "px)");
        continue;
      }
      const own = [...el.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim());
      if (!own.length) continue;
      const words = own.map(c => c.textContent).join(" ").trim().replace(/\\s+/g, " ").slice(0, 40);
      const range = document.createRange(); range.selectNodeContents(el);
      const rects = [...range.getClientRects()];
      if (![...flagged].some(f => f.contains(el)) && rects.some(r => past(r, box))) spill.push(label(el) + ' "' + words + '"');
      // Text cut by a box between it and the sheet that hides its overflow.
      for (let up = el instanceof SVGElement ? null : el; up && up !== sheet; up = up.parentElement) {
        const us = getComputedStyle(up);
        if (us.overflowX === "visible" && us.overflowY === "visible") continue;
        const ub = up.getBoundingClientRect();
        if (rects.some(r => past(r, ub)) || up.scrollHeight > up.clientHeight + 1 || up.scrollWidth > up.clientWidth + 1) {
          clip.push(label(el) + ' "' + words + '" is cut by ' + label(up)); break; }
      }
      const size = parseFloat(s.fontSize) * scaleOf(el);
      if (size < ${minPx} - 0.05) small.push(label(el) + ' "' + words + '" renders at ' + (size * 0.75).toFixed(1) + "pt");
    }
    return { index: i + 1, x: box.left + scrollX, y: box.top + scrollY, width: box.width, height: box.height,
      spill: [...new Set(spill)].slice(0, 6), clip: [...new Set(clip)].slice(0, 6), small: [...new Set(small)].slice(0, 6) };
  });
  const faces = document.fonts ? [...document.fonts].filter(f => f.status === "error").map(f => f.family.replace(/^["']|["']$/g, "")) : [];
  return { sheets: out, faces: [...new Set(faces)] };
})()`;

async function run(browser, o) {
  const cdp = await connect(browser.port);
  const issues = { console: [], requests: [], load: null };
  const urls = new Map(), favicon = u => /\/favicon\.ico(\?|$)/.test(u ?? "");
  cdp.on(m => {
    if (m.method === "Network.requestWillBeSent") urls.set(m.params.requestId, m.params.request.url);
    if (m.method === "Runtime.exceptionThrown") issues.console.push(m.params.exceptionDetails?.exception?.description?.split("\n")[0] ?? "exception");
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
      issues.console.push(m.params.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 200));
    if (m.method === "Network.loadingFailed" && !m.params.canceled && !favicon(urls.get(m.params.requestId)))
      issues.requests.push(`${m.params.errorText} ${urls.get(m.params.requestId) ?? ""}`.trim());
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400 && !favicon(m.params.response.url)) {
      issues.requests.push(`${m.params.response.status} ${m.params.response.url}`);
      if (m.params.type === "Document" && !issues.load) issues.load = `page returned HTTP ${m.params.response.status}`;
    }
  });
  try {
    await cdp.send("Page.enable"); await cdp.send("Runtime.enable"); await cdp.send("Network.enable");
    await cdp.send("Emulation.setEmulatedMedia", { media: "print" });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 1600, deviceScaleFactor: o.scale, mobile: false });
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

    const inspect = async () => (await cdp.send("Runtime.evaluate", { expression: INSPECT(o.page, o.minPt / 0.75), returnByValue: true })).result.value;
    let page = await inspect();
    if (!page || page.error) throw new Unchecked(`--page is not a valid selector: ${o.page}`);
    if (!page.sheets.length) throw new Unchecked(`no element matches ${o.page}; mark each sheet or pass --page`);
    // Print lays the document out at the sheet's width, so measure it there:
    // a width media query must not show the gate a layout print never uses.
    const width = Math.ceil(page.sheets[0].width);
    if (width > 0 && width !== 1200) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 1600, deviceScaleFactor: o.scale, mobile: false });
      await sleep(100);
      page = await inspect();
    }
    mkdirSync(o.pages, { recursive: true });
    // Images from an earlier, longer run would be read as pages of this one.
    for (const f of readdirSync(o.pages)) if (f.startsWith(`${o.stem}-`) && /-\d+\.png$/.test(f)) rmSync(join(o.pages, f), { force: true });

    const findings = [], add = (check, message) => findings.push({ check, message });
    const files = [];
    for (const s of page.sheets) {
      const file = join(o.pages, `${o.stem}-${String(s.index).padStart(2, "0")}.png`);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
        clip: { x: s.x, y: s.y, width: s.width, height: s.height, scale: 1 } });
      writeFileSync(file, Buffer.from(shot.data, "base64"));
      files.push(file);
      for (const w of s.spill) add("overflow", `page ${s.index}: ${w} runs off the sheet`);
      for (const w of s.clip) add("clip", `page ${s.index}: ${w}`);
      for (const w of s.small) add("type", `page ${s.index}: ${w}, under ${o.minPt}pt`);
    }
    const pdf = await cdp.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true });
    const bytes = Buffer.from(pdf.data, "base64");
    writeFileSync(o.out, bytes);
    const printed = (bytes.toString("latin1").match(/\/Type\s*\/Page(?![A-Za-z])/g) ?? []).length;
    if (!printed) throw new Unchecked("could not count the pages of the PDF");
    if (printed !== page.sheets.length)
      add("count", `the PDF has ${printed} page(s) and the document authored ${page.sheets.length}; a sheet is the wrong size, spills, or lacks a page break`);
    for (const f of page.faces) add("fonts", `webfont failed to load: ${f}`);
    for (const e of [...new Set(issues.console)].slice(0, 5)) add("page", `console: ${e}`);
    for (const e of [...new Set(issues.requests)].slice(0, 5)) add("page", `request failed: ${e}`);
    return { pdf: o.out, bytes: bytes.length, authored: page.sheets.length, printed, pages: files, findings };
  } finally { cdp.close(); }
}

async function main() {
  let o;
  try { o = parse(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`pdf: ${e.message}\n`); process.exit(2); }
  mkdirSync(dirname(resolve(o.out)), { recursive: true });
  const browser = await launch();
  // An interrupted run must not leave Chrome or its temp profile behind.
  for (const sig of ["SIGINT", "SIGTERM"]) process.once(sig, () => { browser.close().finally(() => process.exit(2)); });
  let r;
  try { r = await run(browser, o); }
  finally { await browser.close(); }
  const passed = !r.findings.length;
  if (o.json) process.stdout.write(JSON.stringify({ target: o.target, passed, ...r }, null, 2) + "\n");
  else {
    process.stdout.write(`${r.pdf}: ${r.printed} page(s), ${Math.round(r.bytes / 1024)} KB\n`);
    for (const f of r.pages) process.stdout.write(`  ${f}\n`);
    for (const f of r.findings) process.stdout.write(`    ${f.check}: ${f.message}\n`);
    process.stdout.write(passed ? "pdf: pass, now read every page image\n" : "pdf: findings, fix and run again\n");
  }
  process.exitCode = passed ? 0 : 1;
}

main().catch(e => { process.stderr.write(`pdf: could not check: ${e.message}\n`); process.exit(2); });
