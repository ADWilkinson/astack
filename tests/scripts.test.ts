import { afterAll, beforeAll, expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const script = (skill: string, name: string) => resolve(root, "skills", skill, "scripts", name);
const temp = mkdtempSync(resolve(tmpdir(), "astack-scripts-"));
afterAll(() => rmSync(temp, { recursive: true, force: true }));

// Parse a script's JSON output, surfacing its stderr when it printed nothing useful.
function parsed(r: { code: number | null; out: string; err: string }) {
  try { return JSON.parse(r.out); }
  catch { throw new Error(`script exited ${r.code} without JSON\nstderr: ${r.err}\nstdout: ${r.out}`); }
}

// Async so the in-process fixture server can answer while the script runs.
async function node(args: string[]) {
  const p = Bun.spawn(["node", ...args], { cwd: temp, stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  return { code, out, err };
}

// A 1200x630 PNG header is enough for the size sniffing in page-audit.
function pngHeader(width: number, height: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width); new DataView(b.buffer).setUint32(20, height);
  return b;
}

let server: ReturnType<typeof Bun.serve>;
let base = "";
beforeAll(() => {
  server = Bun.serve({ port: 0, fetch(req) {
    const url = new URL(req.url);
    const html = (body: string, headers: Record<string, string> = {}) => new Response(body, { headers: { "content-type": "text/html", ...headers } });
    switch (url.pathname) {
      case "/": return html(`<!doctype html><html lang="en"><head><title>Fixture product for sellers</title>
        <meta name="description" content="A fixture page with enough description text to sit inside the recommended length range.">
        <link rel="canonical" href="${base}/"><meta property="og:title" content="Fixture"><meta property="og:description" content="Fixture card">
        <meta property="og:image" content="${base}/og.png"><meta property="og:url" content="${base}/"><meta name="twitter:card" content="summary_large_image">
        <script type="application/ld+json">{"@type":"Organization","name":"Fixture"}</script></head>
        <body><h1>Fixture</h1><p>${"Real server rendered text. ".repeat(30)}</p><p>Release 3f9c2ab71d</p></body></html>`, { "x-app-version": "3f9c2ab71d0e" });
      case "/hidden": return html(`<html><head><title>x</title><meta name="robots" content="noindex"><link rel="canonical" href="${base}/"></head><body></body></html>`);
      case "/broken-ld": return html(`<html lang="en"><head><title>Broken structured data page</title><script type="application/ld+json">{nope</script></head><body><h1>a</h1></body></html>`);
      case "/og.png": return new Response(pngHeader(1200, 630), { headers: { "content-type": "image/png" } });
      case "/robots.txt": return new Response(`User-agent: GPTBot\nDisallow: /\n\nUser-agent: PerplexityBot\nDisallow: /\n\nUser-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
      case "/sitemap.xml": return new Response(`<urlset><url><loc>${base}/</loc></url></urlset>`);
      case "/old": return Response.redirect(`${base}/`, 301);
      default: return new Response("not found", { status: 404 });
    }
  } });
  base = `http://localhost:${server.port}`;
});
afterAll(() => server.stop(true));

test("slop-scan flags prose, UI and code tells with lines and a failing gate", async () => {
  writeFileSync(resolve(temp, "post.md"), "# Launch\n\nDelve into our seamless platform. I hope this helps!\n\nThat's it. Not a tool. Not a toy.\n");
  writeFileSync(resolve(temp, "Hero.tsx"), `export const Hero = () => <h1 className="bg-clip-text text-transparent from-purple-500">Unlock it 🚀</h1>;\ntry { x() } catch (e) {}\n`);
  writeFileSync(resolve(temp, "clean.md"), "Sellers see the network fee before they confirm a sale.\n");
  const json = await node([script("deslop", "slop-scan.mjs"), ".", "--json"]);
  const result = JSON.parse(json.out);
  const rules = result.files.flatMap((f: any) => f.hits.map((h: any) => h.rule));
  for (const rule of ["inflated-verb", "empty-adjective", "assistant-residue", "staged-reveal", "negative-listing", "gradient-text", "violet-gradient", "emoji-in-ui", "swallowed-error"])
    expect(rules).toContain(rule);
  expect(result.files.some((f: any) => f.file.endsWith("clean.md"))).toBe(false);
  expect((await node([script("deslop", "slop-scan.mjs"), "post.md", "--fail-on", "high"])).code).toBe(2);
  expect((await node([script("deslop", "slop-scan.mjs"), "clean.md", "--fail-on", "medium"])).code).toBe(0);
});

test("slop-scan flags current design defaults and newer prose tells", async () => {
  writeFileSync(resolve(temp, "cream.css"), `body { background: #F4F1EA; color: #1a1a1a; } h1 { font-family: "Fraunces", serif; } .cta { background: #D97757; }`);
  writeFileSync(resolve(temp, "copy.md"), "Ledgerly serves as a hub for invoices, highlighting the importance of cash flow. Experts say it plays a crucial role.\n");
  writeFileSync(resolve(temp, "Nav.tsx"), `export const N = () => <nav><a href="/docs">Read the docs →</a><span className="uppercase tracking-widest">Features</span><p>Fast · Simple · Secure</p></nav>;\n`);
  const result = JSON.parse((await node([script("deslop", "slop-scan.mjs"), "cream.css", "copy.md", "Nav.tsx", "--json"])).out);
  const rules = result.files.flatMap((f: any) => [...f.hits, ...f.density].map((h: any) => h.rule));
  for (const rule of ["warm-editorial", "copula-avoidance", "ing-rider", "vague-attribution", "significance-inflation", "arrow-suffix", "caps-eyebrow", "mid-dot-meta"])
    expect(rules).toContain(rule);
});

test("slop-scan reports each match once even when JSX text and string literals overlap", async () => {
  writeFileSync(resolve(temp, "Dup.tsx"), `export const D = () => <p>{"It is a seamless and powerful way to pay friends"}</p>;\n`);
  const result = JSON.parse((await node([script("deslop", "slop-scan.mjs"), "Dup.tsx", "--json"])).out);
  const seamless = result.files[0].hits.filter((h: any) => h.match.toLowerCase() === "seamless");
  expect(seamless.length).toBe(1);
});

test("slop-scan flags motion and mobile details that feel off", async () => {
  writeFileSync(resolve(temp, "menu.css"), `.menu { transition: all 300ms ease-in; transform: scale(0); height: 100vh; }\n.calm { transition: transform 200ms ease-in-out; }\n`);
  writeFileSync(resolve(temp, "shell.html"), `<meta name="viewport" content="width=device-width, maximum-scale=1"><div class="h-screen transition-all scale-0"></div>`);
  const result = JSON.parse((await node([script("deslop", "slop-scan.mjs"), "menu.css", "shell.html", "--json"])).out);
  const hits = result.files.flatMap((f: any) => f.hits);
  for (const rule of ["transition-all", "ease-in-ui", "scale-from-zero", "zoom-disabled", "vh-shell"])
    expect(hits.map((h: any) => h.rule)).toContain(rule);
  expect(hits.filter((h: any) => h.rule === "ease-in-ui").every((h: any) => h.line === 1)).toBe(true);
  expect((await node([script("deslop", "slop-scan.mjs"), "shell.html", "--fail-on", "high"])).code).toBe(2);
});

test("iso compiles a scene with all three faces, painter order and a fitted viewBox", async () => {
  const { compile } = await import(script("web-graphics", "iso.mjs"));
  const svg: string = compile({ unit: 10, padding: 0, items: [
    { box: [3, 3, 0, 1, 1, 1], fill: "#336699", id: "near" },
    { box: [0, 0, 0, 1, 1, 1], fill: "#336699", id: "far" },
    { tile: [0, 0, 0, 4, 4], fill: "#eeeeee" },
  ] });
  expect(svg.match(/<polygon/g)!.length).toBe(7);
  expect(svg.indexOf('id="far"')).toBeLessThan(svg.indexOf('id="near"'));
  expect(svg.indexOf("#eeeeee")).toBeLessThan(svg.indexOf('id="far"'));
  const [, , w, h] = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(svg)!.slice(1).map(Number);
  expect(w).toBeCloseTo(4 * 2 * Math.cos(Math.PI / 6) * 10, 1);
  expect(h).toBeGreaterThan(40);
  expect(compile({ items: [{ box: [0, 0, 0, 1, 1, 1], fill: "#123456" }] })).toBe(compile({ items: [{ box: [0, 0, 0, 1, 1, 1], fill: "#123456" }] }));
});

test("iso orders tiles on pedestals, routes behind boxes and long back boxes by separating axis", async () => {
  const { compile } = await import(script("web-graphics", "iso.mjs"));
  const ids = (svg: string) => [...svg.matchAll(/id="(\w+)"/g)].map(m => m[1]);
  expect(ids(compile({ items: [{ box: [1, 2, 0, 1, 1, 1], id: "front" }, { box: [0, 0, 0, 8, 1, 1], id: "longback" }] }))).toEqual(["longback", "front"]);
  expect(ids(compile({ items: [{ tile: [0, 0, 1.5, 1, 1], id: "top" }, { box: [0, 0, 0, 1, 1, 1.5], id: "pedestal" }] }))).toEqual(["pedestal", "top"]);
  expect(ids(compile({ items: [{ box: [2, 2, 0, 1, 1, 1], id: "box" }, { path: [[0, 0, 0.01], [2, 0.5, 0.01]], id: "route" }] }))).toEqual(["route", "box"]);
});

test("slop-scan refuses bad arguments instead of passing a gate silently", async () => {
  expect((await node([script("deslop", "slop-scan.mjs"), "does-not-exist"])).code).toBe(1);
  expect((await node([script("deslop", "slop-scan.mjs"), ".", "--failon", "high"])).code).toBe(1);
  expect((await node([script("deslop", "slop-scan.mjs"), ".", "--fail-on", "hgh"])).code).toBe(1);
});

test("verify-live keeps polling through connection errors and rejects bad arguments", async () => {
  const r = await node([script("ship", "verify-live.mjs"), "http://127.0.0.1:9/", "--poll", "1", "--json"]);
  expect(r.code).toBe(2);
  expect(JSON.parse(r.out).failures[0]).toContain("request failed");
  expect((await node([script("ship", "verify-live.mjs"), `${base}/`, "--poll", "soon"])).code).toBe(1);
});

test("page-audit reads metadata, share card size, crawler rules and sitemap", async () => {
  const r = await node([script("discoverability", "page-audit.mjs"), `${base}/old`, "--json"]);
  expect(r.code).toBe(0);
  const [audit] = JSON.parse(r.out);
  expect(audit.facts.chain.length).toBe(2);
  expect(audit.facts.ogImage).toMatchObject({ width: 1200, height: 630, status: 200 });
  expect(audit.facts.crawlers).toMatchObject({ Googlebot: "allowed", GPTBot: "blocked", PerplexityBot: "blocked", ClaudeBot: "allowed" });
  expect(audit.facts.jsonLd).toContain("Organization");
  expect(audit.warnings.some((w: string) => w.includes("PerplexityBot"))).toBe(true);
  expect(audit.errors).toEqual([]);
});

test("page-audit fails noindex pages and unparseable JSON-LD", async () => {
  const r = await node([script("launch", "page-audit.mjs"), `${base}/hidden`, `${base}/broken-ld`, "--json"]);
  expect(r.code).toBe(2);
  const [hidden, broken] = JSON.parse(r.out);
  expect(hidden.errors).toContain("noindex directive present");
  expect(hidden.errors).toContain("missing og:image");
  expect(broken.errors).toContain("a JSON-LD block does not parse");
});

test("verify-live finds a revision in headers, checks content and fails on a wrong SHA", async () => {
  const ok = await node([script("ship", "verify-live.mjs"), `${base}/`, "--expect", "3f9c2ab71d", "--contains", "Fixture", "--absent", "Old plan", "--json"]);
  expect(ok.code).toBe(0);
  expect(JSON.parse(ok.out).revision).toContain("x-app-version");
  const bad = await node([script("ship", "verify-live.mjs"), `${base}/`, "--expect", "deadbeef00"]);
  expect(bad.code).toBe(2);
  expect(bad.out).toContain("NOT SERVING");
  expect((await node([script("ship", "verify-live.mjs"), `${base}/`, "--expect", "abc"])).code).toBe(1);
});

test("every script prints help and exits cleanly", async () => {
  for (const [skill, name] of [["ship", "pr-state.mjs"], ["ship", "verify-live.mjs"], ["ship", "shoot.mjs"], ["deslop", "slop-scan.mjs"],
    ["discoverability", "page-audit.mjs"], ["web-graphics", "iso.mjs"], ["web-graphics", "fi.mjs"], ["launch", "render-gate.mjs"], ["launch", "film.mjs"]]) {
    const r = await node([script(skill, name), "--help"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("Usage");
  }
});

const chrome = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(p => p && existsSync(p));
test.skipIf(!chrome)("shoot captures both themes and flags overflow, stranded words and small tap targets", async () => {
  const page = resolve(temp, "page.html");
  writeFileSync(page, `<!doctype html><meta name="viewport" content="width=device-width">
    <style>body{margin:0;font:16px/1.4 sans-serif} h1{width:300px;font-size:32px} .wide{width:900px;height:10px;background:red}</style>
    <h1>The quick brown fox jumps over everything</h1><div class="wide"></div><button style="width:30px;height:30px">x</button>`);
  const r = await node([script("dogfood", "shoot.mjs"), page, "--widths", "390", "--out", resolve(temp, "shots"), "--json"]);
  if (r.code !== 0) throw new Error(`shoot failed (${r.code}): ${r.err}\n${r.out}`);
  const { captures } = JSON.parse(r.out);
  expect(captures.map((c: any) => c.theme)).toEqual(["light", "dark"]);
  for (const c of captures) expect(readFileSync(c.files[0]).subarray(1, 4).toString()).toBe("PNG");
  expect(captures[0].horizontalOverflow).not.toBeNull();
  expect(captures[0].smallTapTargets.some((t: string) => t.startsWith("x 30x30"))).toBe(true);
  expect(captures[0].strandedWords.length).toBeGreaterThan(0);
  const calm = resolve(temp, "calm.html");
  writeFileSync(calm, `<!doctype html><meta name="viewport" content="width=device-width"><style>body{margin:0;font:16px/1.5 sans-serif}</style>
    <p style="width:300px">This sentence wraps across two lines and ends with the words after every walk.</p>`);
  const quiet = parsed(await node([script("dogfood", "shoot.mjs"), calm, "--widths", "390", "--themes", "light", "--out", resolve(temp, "calm"), "--json"]));
  expect(quiet.captures[0].strandedWords).toEqual([]);
  const dead = await node([script("dogfood", "shoot.mjs"), "127.0.0.1:9", "--widths", "390", "--themes", "light", "--out", resolve(temp, "dead")]);
  expect(dead.code).toBe(1);
  // macOS reports the refused connection in the capture; Linux runners can fail earlier, on stderr.
  expect(`${dead.out}\n${dead.err}`).toMatch(/navigation failed|ERR_CONNECTION|ECONNREFUSED|Chrome exited/);
}, 150000);

test.skipIf(!chrome)("fi passes the bundled sticker set and names what is wrong with a broken one", async () => {
  const kit = resolve(root, "skills/web-graphics/kit");
  const ok = await node([script("web-graphics", "fi.mjs"), "check", resolve(kit, "icons.ts"), "coins", "padlock"]);
  if (ok.code !== 0) throw new Error(`fi check failed (${ok.code}): ${ok.err}\n${ok.out}`);
  expect(ok.out).toContain("2 icons pass");
  const dir = resolve(temp, "stickers");
  mkdirSync(dir, { recursive: true });
  copyFileSync(resolve(kit, "fun.ts"), resolve(dir, "fun.ts"));
  writeFileSync(resolve(dir, "icons.ts"), `import { rect } from './fun'
import type { Icon } from './fun'
export const broken: Icon = { name: 'broken', frames: 120, layers: [{ id: 'a', parent: 'nope', shapes: [{ d: rect(0, 0, 500, 500), fill: 'purple' }] }] }
`);
  const bad = await node([script("web-graphics", "fi.mjs"), "check", resolve(dir, "icons.ts")]);
  expect(bad.code).toBe(1);
  expect(bad.out).toContain('parent "nope" not found');
  expect(bad.out).toContain('"purple" is not a palette slot');
  expect(bad.out).toContain("touches the canvas edge");
  const frame = await node([script("web-graphics", "fi.mjs"), "frame", resolve(kit, "icons.ts"), "coins", "40", "--px", "120", "--out", resolve(temp, "coins.png")]);
  if (frame.code !== 0) throw new Error(`fi frame failed (${frame.code}): ${frame.err}`);
  expect(readFileSync(resolve(temp, "coins.png")).subarray(1, 4).toString()).toBe("PNG");
}, 120000);

test("render-gate and film refuse bad arguments with exit 2, never a pass", async () => {
  for (const args of [[script("web-design", "render-gate.mjs")], [script("web-design", "render-gate.mjs"), "missing.html"],
    [script("web-design", "render-gate.mjs"), "x.html", "--size", "big"], [script("launch", "film.mjs"), "missing.html"],
    [script("launch", "film.mjs"), "x.html", "--size", "1281x720"]]) {
    writeFileSync(resolve(temp, "x.html"), "<p>x</p>");
    expect((await node(args)).code).toBe(2);
  }
  writeFileSync(resolve(temp, "empty.md"), "---\nname: x\n---\n");
  const r = await node([script("web-design", "render-gate.mjs"), "x.html", "--design", "empty.md"]);
  expect(r.code).toBe(2);
  expect(r.err).toContain("no colour or font tokens");
});

test.skipIf(!chrome)("render-gate fails fallen-back fonts, changed copy, clipping and off-token colours, and passes a clean card", async () => {
  // Linux runners ship Liberation Sans instead of Arial, and the gate rightly calls that a fallback.
  const face = process.platform === "linux" ? "Liberation Sans" : "Arial";
  writeFileSync(resolve(temp, "DESIGN.md"), `---\ncolors:\n  bg: "#F6F8FA"\n  ink: "#0E1726"\n  accent: "#2457D6"\ntypography:\n  display: "Astack Missing Face, serif"\n  text: \"${face}, sans-serif\"\n---\n# Fixture\n`);
  writeFileSync(resolve(temp, "card.html"), `<!doctype html><style>body{margin:0;background:#F6F8FA;color:#0E1726;font-family:"${face}",sans-serif}
    h1{font-family:"Astack Missing Face",serif;font-size:64px;margin:40px}
    .tag{color:#e4572e;width:120px;white-space:nowrap;overflow:hidden;margin:40px}
    .edge{position:absolute;right:-40px;bottom:20px;font-size:40px}</style>
    <h1>Rates you can see</h1><p class="tag">A long tag line that clips</p><div class="edge">cropped words</div>
    <span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">screen reader only text</span>
    <span style="position:absolute;left:40px;top:300px;clip-path:inset(50%)">clip path hidden text</span>
    <p style="color:oklch(0.6 0.25 300);margin:40px">Wide gamut note</p>`);
  const bad = await node([script("launch", "render-gate.mjs"), "card.html", "--size", "1200x630", "--design", "DESIGN.md",
    "--expect", "Rates you can see today", "--fonts", face, "--out", resolve(temp, "renders"), "--json"]);
  expect(bad.code).toBe(1);
  const report = parsed(bad);
  const messages = report.renders[0].findings.map((f: any) => `${f.check}: ${f.message}`).join("\n");
  expect(messages).toContain('"Astack Missing Face" fell back');
  expect(messages).toContain('missing or changed: "Rates you can see today"');
  expect(messages).toContain("cut off by its box: p.tag");
  expect(messages).toContain("cropped by the canvas edge: div.edge");
  expect(messages).toContain("rgb(228, 87, 46) is not a token");
  expect(messages).not.toContain("screen reader only");
  expect(messages).not.toContain("clip path hidden");
  expect(messages).toMatch(/rgb\(\d+, \d+, \d+\) is not a token: color on p\n|rgb\(\d+, \d+, \d+\) is not a token: color on p$/m);
  expect(readFileSync(report.renders[0].file).subarray(1, 4).toString()).toBe("PNG");
  writeFileSync(resolve(temp, "clean.html"), `<!doctype html><style>body{margin:0;background:#F6F8FA;color:#0E1726;font-family:"${face}",sans-serif}
    b{color:#2457D6}</style><h1 style="margin:40px">Rates you can <b>see</b></h1>
    <p style="width:200px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;margin:40px">A deliberately clamped description that runs long</p>`);
  const ok = await node([script("launch", "render-gate.mjs"), "clean.html", "--size", "1200x630", "--size", "600x600", "--design", "DESIGN.md",
    "--expect", "Rates you can see", "--fonts", face, "--out", resolve(temp, "renders")]);
  if (ok.code !== 0) throw new Error(`render-gate failed a clean card (${ok.code}): ${ok.err}\n${ok.out}`);
  const clamped = await node([script("launch", "render-gate.mjs"), "clean.html", "--size", "1200x630", "--expect", "A deliberately clamped description that runs long", "--out", resolve(temp, "renders")]);
  expect(clamped.code).toBe(1);
  expect(clamped.out).toContain("required copy is truncated");
}, 120000);

const ffmpeg = Bun.which("ffmpeg") !== null;
test.skipIf(!chrome || !ffmpeg)("film renders a seekable composition and fails black openings and clock-driven motion", async () => {
  writeFileSync(resolve(temp, "film.html"), `<!doctype html><html data-duration="1"><style>body{margin:0;background:#F6F8FA;font:600 48px Arial,sans-serif;color:#0E1726}
    h1{margin:40px;animation:in .4s both}.bar{position:absolute;left:0;bottom:0;height:12px;background:#2457D6;animation:grow 1s linear both}
    @keyframes in{from{opacity:.5;transform:translateY(20px)}}@keyframes grow{from{width:0}to{width:100%}}</style><h1>Rates you can see</h1><div class="bar"></div></html>`);
  const ok = await node([script("launch", "film.mjs"), "film.html", "--size", "640x360", "--fps", "12", "--out", resolve(temp, "film.mp4"),
    "--poster", resolve(temp, "poster.png"), "--json"]);
  if (ok.code !== 0) throw new Error(`film failed (${ok.code}): ${ok.err}\n${ok.out}`);
  const report = parsed(ok);
  expect([report.width, report.height, report.frames, report.duration]).toEqual([640, 360, 12, 1]);
  expect(readFileSync(resolve(temp, "poster.png")).subarray(1, 4).toString()).toBe("PNG");
  writeFileSync(resolve(temp, "black.html"), `<!doctype html><html data-duration="1"><style>body{margin:0;background:#000}h1{color:#fff;animation:in .2s .8s both}@keyframes in{from{opacity:0}}</style><h1>late</h1></html>`);
  const black = await node([script("launch", "film.mjs"), "black.html", "--size", "640x360", "--fps", "12", "--out", resolve(temp, "black.mp4")]);
  expect(black.code).toBe(1);
  expect(black.out).toContain("opens on black");
  writeFileSync(resolve(temp, "clock.html"), `<!doctype html><style>body{margin:0;background:#fff;font:48px Arial}</style><h1 id=h>0</h1><script>let n=0;setInterval(()=>h.textContent=++n,30)</script>`);
  const clock = await node([script("launch", "film.mjs"), "clock.html", "--size", "640x360", "--fps", "12", "--duration", "1", "--out", resolve(temp, "clock.mp4")]);
  expect(clock.code).toBe(1);
  expect(clock.out).toContain("not deterministic");
  expect((await node([script("launch", "film.mjs"), "clock.html", "--size", "640x360", "--out", resolve(temp, "x.mp4")])).code).toBe(2);
  writeFileSync(resolve(temp, "still.html"), `<!doctype html><style>body{margin:0;background:#F6F8FA;font:48px Arial}</style><h1>Nothing moves here</h1>`);
  const still = await node([script("launch", "film.mjs"), "still.html", "--size", "640x360", "--fps", "12", "--duration", "1.5", "--out", resolve(temp, "still.mp4")]);
  expect(still.code).toBe(1);
  expect(still.out).toContain("nothing moves");
}, 180000);
