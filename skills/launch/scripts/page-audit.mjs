#!/usr/bin/env node
// Audit what search engines, answer engines and share previews actually get
// from a URL: status and redirects, indexability, canonical, metadata, share
// card, structured data, robots rules for search/AI crawlers and the sitemap.
const HELP = `page-audit: what crawlers and link previews see at a URL

Usage:
  node page-audit.mjs <url> [more urls...] [--json]

Checks per URL: redirect chain, status, x-robots-tag and meta robots,
canonical (and whether it points elsewhere), title/description length,
Open Graph and Twitter card tags, og:image reachability, type and size,
JSON-LD blocks that fail to parse, html lang, h1 count, hreflang, and
robots.txt rules for major search and AI crawlers plus sitemap presence.
Exit code: 0 no errors, 2 errors found, 1 could not run.
`;

const argv = process.argv.slice(2);
if (!argv.length || argv.includes("--help") || argv.includes("-h")) { process.stdout.write(HELP); process.exit(argv.length ? 0 : 1); }
const json = argv.includes("--json");
const urls = argv.filter(a => !a.startsWith("--"));
const UA = "Mozilla/5.0 (compatible; page-audit/1; +https://github.com/ADWilkinson/astack)";
const CRAWLERS = ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"];

async function fetchChain(url, method = "GET") {
  const chain = [];
  let current = url;
  for (let i = 0; i < 10; i++) {
    const res = await fetch(current, { method, redirect: "manual", headers: { "user-agent": UA, accept: "text/html,*/*" } });
    chain.push(`${res.status} ${current}`);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, current).href; continue; }
    return { res, chain, finalUrl: current };
  }
  throw new Error(`redirect loop from ${url}`);
}

const attr = (tag, name) => new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)?.slice(2).find(v => v !== undefined);
const decode = s => s?.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
function metas(html) {
  const out = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(m[0], "property") ?? attr(m[0], "name"))?.toLowerCase();
    const content = attr(m[0], "content");
    if (key && content !== undefined) (out[key] ??= decode(content));
  }
  return out;
}
const links = (html, rel) => [...html.matchAll(/<link\b[^>]*>/gi)].filter(m => (attr(m[0], "rel") ?? "").toLowerCase().split(/\s+/).includes(rel)).map(m => m[0]);

function robotsRules(txt) {
  const groups = []; let cur = null, lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim(); if (!line) continue;
    const [k, ...rest] = line.split(":"); const key = k.trim().toLowerCase(), val = rest.join(":").trim();
    if (key === "user-agent") { if (!lastWasAgent) groups.push(cur = { agents: [], rules: [] }); cur.agents.push(val.toLowerCase()); lastWasAgent = true; }
    else { lastWasAgent = false; if (cur && (key === "allow" || key === "disallow")) cur.rules.push({ allow: key === "allow", path: val }); }
  }
  return groups;
}
function allowed(groups, agent, path) {
  const g = groups.find(x => x.agents.includes(agent.toLowerCase())) ?? groups.find(x => x.agents.includes("*"));
  if (!g) return true;
  let best = null;
  for (const r of g.rules) {
    if (!r.path) continue;
    const re = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return best ? best.allow : true;
}

async function audit(url) {
  const errors = [], warnings = [], facts = {};
  const { res, chain, finalUrl } = await fetchChain(url);
  const html = await res.text();
  facts.chain = chain; facts.status = res.status; facts.finalUrl = finalUrl;
  if (chain.length > 2) warnings.push(`${chain.length - 1} redirects before the final page`);
  if (res.status >= 400) errors.push(`final status ${res.status}`);
  const xr = res.headers.get("x-robots-tag");
  const m = metas(html);
  const robotsMeta = [m.robots, m.googlebot].filter(Boolean).join(", ");
  facts.robots = [xr && `header: ${xr}`, robotsMeta && `meta: ${robotsMeta}`].filter(Boolean).join("; ") || "indexable (no directives)";
  if (/noindex/i.test(`${xr} ${robotsMeta}`)) errors.push("noindex directive present");
  if (/nosnippet|max-snippet:\s*0/i.test(`${xr} ${robotsMeta}`)) warnings.push("snippet restricted: answer engines and results get little or no text");

  const canonical = links(html, "canonical").map(t => attr(t, "href"))[0];
  facts.canonical = canonical ? new URL(canonical, finalUrl).href : null;
  if (!canonical) warnings.push("no canonical link");
  else if (facts.canonical.replace(/\/$/, "") !== finalUrl.replace(/\/$/, "")) warnings.push(`canonical points elsewhere: ${facts.canonical}`);

  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, " "));
  facts.title = title ?? null; facts.description = m.description ?? null;
  if (!title) errors.push("missing <title>"); else if (title.length > 65) warnings.push(`title ${title.length} chars (likely truncated past ~60)`); else if (title.length < 15) warnings.push(`title only ${title.length} chars`);
  if (!m.description) warnings.push("missing meta description"); else if (m.description.length > 170 || m.description.length < 50) warnings.push(`meta description ${m.description.length} chars (aim ~70-160)`);
  const lang = /<html\b[^>]*\blang\s*=\s*["']?([\w-]+)/i.exec(html)?.[1];
  facts.lang = lang ?? null; if (!lang) warnings.push("no html lang attribute");
  const h1 = (html.match(/<h1\b/gi) ?? []).length; facts.h1 = h1;
  if (h1 === 0) warnings.push("no <h1> in server HTML (client-rendered pages give crawlers less)"); if (h1 > 1) warnings.push(`${h1} <h1> elements`);
  const textLen = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ").replace(/\s+/g, " ").trim().length;
  facts.serverTextChars = textLen; if (textLen < 400) warnings.push(`only ${textLen} chars of text in server HTML; content may be client-rendered`);

  const og = Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith("og:") || k.startsWith("twitter:")));
  facts.share = og;
  for (const k of ["og:title", "og:description", "og:image", "og:url"]) if (!m[k]) (k === "og:image" ? errors : warnings).push(`missing ${k}`);
  if (!m["twitter:card"]) warnings.push("missing twitter:card (X falls back to a small or no preview)");
  else if (m["twitter:card"] !== "summary_large_image" && m["og:image"]) warnings.push(`twitter:card is ${m["twitter:card"]}; use summary_large_image for a full-width card`);
  if (m["og:image"]) {
    const img = new URL(m["og:image"], finalUrl).href;
    if (!/^https:/.test(img)) warnings.push("og:image is not absolute https");
    try {
      const r = await fetch(img, { headers: { "user-agent": UA } });
      const buf = new Uint8Array(await r.arrayBuffer());
      const type = r.headers.get("content-type") ?? "";
      facts.ogImage = { url: img, status: r.status, type, bytes: buf.length, ...imageSize(buf) };
      if (r.status >= 400) errors.push(`og:image returns ${r.status}`);
      if (!/image\/(png|jpe?g|webp|gif)/.test(type)) warnings.push(`og:image content-type ${type || "missing"}`);
      if (buf.length > 5 * 1024 * 1024) warnings.push(`og:image ${(buf.length / 1048576).toFixed(1)} MB (some previewers give up above ~5 MB)`);
      if (facts.ogImage.width && (facts.ogImage.width < 1200 || Math.abs(facts.ogImage.width / facts.ogImage.height - 1.91) > 0.15))
        warnings.push(`og:image ${facts.ogImage.width}x${facts.ogImage.height}; 1200x630 renders cleanly everywhere`);
    } catch (e) { errors.push(`og:image fetch failed: ${e.message}`); }
  }

  const ld = [...html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  facts.jsonLd = [];
  for (const [, body] of ld) {
    try { const data = JSON.parse(body); const items = [].concat(data["@graph"] ?? data); facts.jsonLd.push(...items.map(x => x["@type"]).flat()); }
    catch { errors.push("a JSON-LD block does not parse"); }
  }
  const hreflang = links(html, "alternate").filter(t => attr(t, "hreflang")).map(t => `${attr(t, "hreflang")} ${attr(t, "href")}`);
  if (hreflang.length) facts.hreflang = hreflang;

  const origin = new URL(finalUrl).origin, path = new URL(finalUrl).pathname;
  try {
    const r = await fetch(`${origin}/robots.txt`, { headers: { "user-agent": UA } });
    const txt = r.ok ? await r.text() : "";
    facts.robotsTxt = r.ok ? "present" : `HTTP ${r.status}`;
    const groups = robotsRules(txt);
    facts.crawlers = Object.fromEntries(CRAWLERS.map(c => [c, allowed(groups, c, path) ? "allowed" : "blocked"]));
    if (facts.crawlers.Googlebot === "blocked") errors.push("robots.txt blocks Googlebot for this path");
    for (const c of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "Bingbot"]) if (facts.crawlers[c] === "blocked") warnings.push(`robots.txt blocks ${c}: excluded from that engine's answers`);
    const sitemaps = [...txt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(x => x[1]);
    const sm = sitemaps[0] ?? `${origin}/sitemap.xml`;
    const s = await fetch(sm, { headers: { "user-agent": UA } });
    let body = s.ok ? await s.text() : "";
    const listed = text => text.includes(`<loc>${finalUrl}</loc>`) || text.includes(`<loc>${finalUrl.replace(/\/$/, "")}</loc>`) || text.includes(finalUrl);
    if (!s.ok) { facts.sitemap = `none at ${sm} (HTTP ${s.status})`; warnings.push("no sitemap found"); }
    else if (/<sitemapindex/i.test(body)) {
      // Follow up to 10 child sitemaps before deciding the URL is missing.
      const children = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
      let found = false, read = 0, locs = 0;
      for (const child of children.slice(0, 10)) {
        try { const r = await fetch(child, { headers: { "user-agent": UA } }); if (!r.ok) continue;
          const t = await r.text(); read++; locs += (t.match(/<loc>/g) ?? []).length; if (listed(t)) { found = true; break; } } catch { /* try the next child */ }
      }
      facts.sitemap = `${sm} (index of ${children.length}; read ${read}, ${locs} locs)`;
      if (!found) warnings.push(children.length > 10 ? "URL not found in the first 10 child sitemaps (could not confirm)" : "URL not found in the sitemap declared in robots.txt (it may live in a section sitemap; check before adding it)");
    } else {
      facts.sitemap = `${sm} (${(body.match(/<loc>/g) ?? []).length} locs)`;
      if (!listed(body)) warnings.push("URL not found in the sitemap declared in robots.txt");
    }
  } catch (e) { warnings.push(`robots/sitemap check failed: ${e.message}`); }
  return { url, errors, warnings, facts };
}

function imageSize(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return { width: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, height: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1], len = b[i + 2] << 8 | b[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: b[i + 5] << 8 | b[i + 6], width: b[i + 7] << 8 | b[i + 8] };
      i += 2 + len;
    }
  }
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" && String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP") {
    const kind = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (kind === "VP8X") return { width: 1 + (b[24] | b[25] << 8 | b[26] << 16), height: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
    if (kind === "VP8 ") return { width: (b[26] | b[27] << 8) & 0x3fff, height: (b[28] | b[29] << 8) & 0x3fff };
    if (kind === "VP8L") { const bits = b[21] | b[22] << 8 | b[23] << 16 | b[24] << 24;
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
  }
  return {};
}

let failed = false;
const results = [];
for (const url of urls) {
  try { const r = await audit(url); results.push(r); if (r.errors.length) failed = true; }
  catch (e) { results.push({ url, errors: [`could not audit: ${e.message}`], warnings: [], facts: {} }); failed = true; }
}
if (json) process.stdout.write(JSON.stringify(results, null, 2) + "\n");
else for (const r of results) {
  const f = r.facts, out = [`\n${r.url}`];
  if (f.chain) out.push(`  ${f.chain.join("  ->  ")}`);
  if (f.title !== undefined) out.push(`  title: ${f.title ?? "-"}`, `  description: ${f.description ?? "-"}`, `  robots: ${f.robots}`, `  canonical: ${f.canonical ?? "-"}`, `  lang: ${f.lang ?? "-"}  h1: ${f.h1}  server text: ${f.serverTextChars} chars`);
  if (f.ogImage) out.push(`  og:image: ${f.ogImage.status} ${f.ogImage.type} ${f.ogImage.width ?? "?"}x${f.ogImage.height ?? "?"} ${Math.round(f.ogImage.bytes / 1024)} KB`);
  if (f.jsonLd) out.push(`  json-ld: ${f.jsonLd.length ? f.jsonLd.join(", ") : "none"}`);
  if (f.crawlers) out.push(`  crawlers: ${Object.entries(f.crawlers).map(([k, v]) => v === "blocked" ? `${k} BLOCKED` : k).join(", ")}`);
  if (f.sitemap) out.push(`  sitemap: ${f.sitemap}`);
  for (const e of r.errors) out.push(`  ERROR ${e}`);
  for (const w of r.warnings) out.push(`  warn  ${w}`);
  process.stdout.write(out.join("\n") + "\n");
}
process.exit(failed ? 2 : 0);
