#!/usr/bin/env node
// Prove what a URL is actually serving: the expected revision and/or the
// changed content, fetched past caches, polled until the rollout lands.
const HELP = `verify-live: is the deployed target serving this change?

Usage:
  node verify-live.mjs <url> [--expect SHA] [--contains TEXT]... [--absent TEXT]...
                       [--version-path PATH]... [--poll SECONDS] [--json]

  --expect SHA         Revision that must appear (prefix >= 7 chars) in a response
                       header or body of the URL or a version endpoint
  --contains TEXT      Text the page must contain (repeatable)
  --absent TEXT        Text the page must no longer contain (repeatable)
  --version-path PATH  Extra endpoint to search for the revision (repeatable).
                       Always tried: /version, /api/version, /version.json,
                       /api/health, /health, /.well-known/version
  --poll SECONDS       Keep retrying until everything passes or time runs out
  --json               Machine-readable result

Exit code: 0 verified, 2 not (yet) serving or unreachable, 1 bad arguments.
Each request adds a unique query parameter and no-cache headers, which busts
caches keyed on the query string; CDNs and ISR caches that ignore it can still
serve a stale page, so the cache headers seen are reported. After a merge,
expect the commit that was deployed (often the merge or squash commit on the
base branch), not the PR's head commit.
`;

const argv = process.argv.slice(2);
if (!argv.length || argv.includes("--help") || argv.includes("-h")) { process.stdout.write(HELP); process.exit(argv.length ? 0 : 1); }
const o = { url: "", expect: "", contains: [], absent: [], paths: [], poll: 0, json: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i], v = () => { const x = argv[++i]; if (x === undefined || x.startsWith("--")) { process.stderr.write(`${a} needs a value\n`); process.exit(1); } return x; };
  if (a === "--expect") o.expect = v().toLowerCase();
  else if (a === "--contains") o.contains.push(v());
  else if (a === "--absent") o.absent.push(v());
  else if (a === "--version-path") o.paths.push(v());
  else if (a === "--poll") { o.poll = Number(v()); if (!Number.isFinite(o.poll) || o.poll < 0) { process.stderr.write("--poll needs a number of seconds\n"); process.exit(1); } }
  else if (a === "--json") o.json = true;
  else if (a.startsWith("--")) { process.stderr.write(`Unknown option ${a}\n`); process.exit(1); }
  else o.url = a;
}
if (!o.url) { process.stderr.write("A URL is required\n"); process.exit(1); }
if (o.expect && o.expect.length < 7) { process.stderr.write("--expect needs at least 7 characters of the SHA\n"); process.exit(1); }

const CACHE_HEADERS = ["age", "cache-control", "x-vercel-cache", "x-vercel-id", "cf-cache-status", "x-cache", "etag", "last-modified", "server", "x-nf-request-id", "fly-request-id"];
const VERSION_PATHS = ["/version", "/api/version", "/version.json", "/api/health", "/health", "/.well-known/version"];

async function get(url) {
  const u = new URL(url);
  u.searchParams.set("__verify", Date.now().toString(36));
  const res = await fetch(u, { redirect: "follow", headers: { "cache-control": "no-cache", pragma: "no-cache", "user-agent": "verify-live/1" } });
  const body = await res.text();
  return { status: res.status, finalUrl: res.url.replace(/[?&]__verify=[^&]+/, ""), headers: Object.fromEntries(res.headers), body };
}

function findSha(resp, sha) {
  for (const [k, v] of Object.entries(resp.headers)) if (v.toLowerCase().includes(sha)) return `header ${k}`;
  const i = resp.body.toLowerCase().indexOf(sha);
  return i >= 0 ? `body: …${resp.body.slice(Math.max(0, i - 40), i + sha.length + 10).replace(/\s+/g, " ")}…` : null;
}

async function attempt() {
  const page = await get(o.url);
  const result = { url: o.url, finalUrl: page.finalUrl, status: page.status,
    cache: Object.fromEntries(CACHE_HEADERS.filter(h => page.headers[h]).map(h => [h, page.headers[h]])),
    revision: null, contains: {}, absent: {}, failures: [] };
  if (page.status >= 400) result.failures.push(`HTTP ${page.status}`);
  for (const t of o.contains) { result.contains[t] = page.body.includes(t); if (!result.contains[t]) result.failures.push(`missing "${t}"`); }
  for (const t of o.absent) { result.absent[t] = !page.body.includes(t); if (!result.absent[t]) result.failures.push(`still contains "${t}"`); }
  if (o.expect) {
    let where = findSha(page, o.expect);
    if (!where) {
      const origin = new URL(page.finalUrl).origin;
      for (const p of [...o.paths, ...VERSION_PATHS]) {
        try {
          const r = await get(new URL(p, origin).href);
          if (r.status < 400 && (where = findSha(r, o.expect))) { where = `${p} ${where}`; break; }
        } catch { /* endpoint absent or unreachable: try the next one */ }
      }
    }
    result.revision = where;
    if (!where) result.failures.push(`revision ${o.expect.slice(0, 12)} not found in headers, body or version endpoints`);
  }
  return result;
}

const deadline = Date.now() + o.poll * 1000;
let result, tries = 0;
// Connection errors during a deploy swap are expected; keep polling until the deadline.
for (;;) {
  tries++;
  try { result = await attempt(); }
  catch (e) {
    const why = [e.message, e.cause?.code ?? e.cause?.message].filter(Boolean).join(": ");
    result = { url: o.url, finalUrl: o.url, status: 0, cache: {}, revision: null, contains: {}, absent: {}, failures: [`request failed (${why})`] };
  }
  if (!result.failures.length || Date.now() >= deadline) break;
  await new Promise(r => setTimeout(r, Math.min(15000, 3000 * tries)));
}

result.attempts = tries;
result.verified = result.failures.length === 0;
if (o.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
else {
  const lines = [`${result.verified ? "SERVING" : "NOT SERVING"} ${result.finalUrl} (HTTP ${result.status}, ${tries} attempt${tries > 1 ? "s" : ""})`];
  if (result.revision) lines.push(`  revision found: ${result.revision}`);
  for (const [k, v] of Object.entries(result.cache)) lines.push(`  ${k}: ${v}`);
  for (const f of result.failures) lines.push(`  !! ${f}`);
  if (!o.expect && !o.contains.length && !o.absent.length) lines.push("  note: no --expect/--contains given; this only proves the URL responds");
  process.stdout.write(lines.join("\n") + "\n");
}
process.exit(result.verified ? 0 : 2);
