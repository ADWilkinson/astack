#!/usr/bin/env node
// What stands between a PR and merge: the head commit, every check on that
// exact head (plus required checks that have not started), unresolved review
// threads with replies, review decision and mergeability. One read by default;
// --watch keeps reading until the PR is ready or needs action.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HELP = `pr-state: what stands between this PR and merge

Usage:
  node pr-state.mjs [PR number or URL] [--repo OWNER/NAME] [--json]
  node pr-state.mjs [PR] --watch [--interval SECONDS] [--timeout SECONDS]

Without a PR argument, uses the PR for the current branch.

One-shot exit code: 0 ready, 2 blocked or pending, 1 error.

--watch polls (default every 30s, for up to 3600s) and prints one line per
change: checks finishing, new review comments, head or base moving (with the
files the PR and the new base commits both touch), merge state changes. It is
silent while nothing changes. It exits:
  0  ready on two consecutive identical reads, or merged
  2  action needed: a check failed, changes requested, new unresolved
     comments, conflict, branch behind, or the PR was closed
  3  timed out while still pending
  1  error, or another watcher already holds this PR
Run it as a background task and act when it exits; do not post progress
comments while it runs.
`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) { process.stdout.write(HELP); process.exit(0); }
const flag = name => args.includes(name);
const opt = (name, fallback) => { const i = args.indexOf(name); if (i < 0) return fallback;
  const v = Number(args[i + 1]); if (!Number.isFinite(v) || v <= 0) die(`${name} needs a positive number`); return v; };
function die(msg) { process.stderr.write(`pr-state: ${msg}\n`); process.exit(1); }
const json = flag("--json"), watch = flag("--watch");
const interval = opt("--interval", 30), timeout = opt("--timeout", 3600);
const valued = new Set(["--repo", "--interval", "--timeout"]);
const target = args.find((a, i) => !a.startsWith("--") && !valued.has(args[i - 1]));
const repoArg = args.includes("--repo") ? args[args.indexOf("--repo") + 1] : undefined;
for (const a of args) if (a.startsWith("--") && !["--json", "--watch", "--help", ...valued].includes(a)) die(`unknown option ${a}`);

function gh(argv) {
  try { return execFileSync("gh", argv, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }); }
  catch (e) { throw new Error((e.stderr || e.message).toString().trim()); }
}

const query = `query($owner:String!,$name:String!,$number:Int!,$after:String){
  repository(owner:$owner,name:$name){ pullRequest(number:$number){
    commits(last:1){ nodes{ commit{ oid statusCheckRollup{ contexts(first:100){ pageInfo{ hasNextPage } nodes{
      __typename
      ... on CheckRun{ name status conclusion detailsUrl isRequired(pullRequestNumber:$number) checkSuite{ workflowRun{ databaseId } } }
      ... on StatusContext{ context state targetUrl isRequired(pullRequestNumber:$number) }
    } } } } } }
    reviewThreads(first:100, after:$after){ pageInfo{ hasNextPage endCursor } nodes{
      id isResolved isOutdated path line originalLine
      comments(first:30){ totalCount nodes{ author{ login } body url createdAt } }
    } }
  } } }`;

const passing = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
const pendingStates = new Set(["QUEUED", "IN_PROGRESS", "PENDING", "WAITING", "REQUESTED", "EXPECTED"]);
let requiredContexts = null;   // from branch protection, read once; null when not readable

// GraphQL (and so `gh pr view`) has its own rate limit; REST usually still has room.
const rateLimited = e => /rate limit|RATE_LIMITED|secondary rate/i.test(e.message);
function restTarget() {
  let owner, name, number;
  const url = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(target ?? "");
  if (url) [, owner, name, number] = url;
  else {
    if (repoArg) [owner, name] = repoArg.split("/");
    else {
      const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
      [, owner, name] = /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/.exec(remote) ?? [];
    }
    if (target && /^\d+$/.test(target)) number = target;
    else {
      const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
      number = JSON.parse(gh(["api", `repos/${owner}/${name}/pulls?head=${owner}:${branch}&state=all`]))[0]?.number;
    }
  }
  if (!owner || !name || !number) throw new Error("could not resolve the PR for the REST fallback; pass its URL");
  return { owner, name, number };
}
function readRest() {
  const { owner, name, number } = restTarget();
  const p = JSON.parse(gh(["api", `repos/${owner}/${name}/pulls/${number}`]));
  const runs = JSON.parse(gh(["api", `repos/${owner}/${name}/commits/${p.head.sha}/check-runs?per_page=100`])).check_runs ?? [];
  const statuses = JSON.parse(gh(["api", `repos/${owner}/${name}/commits/${p.head.sha}/status`])).statuses ?? [];
  const all = [
    ...runs.map(r => ({ name: r.name, state: r.status === "completed" ? (r.conclusion ?? "unknown").toUpperCase() : r.status.toUpperCase(), required: null, url: r.html_url, runId: /\/runs\/(\d+)/.exec(r.details_url ?? "")?.[1] ?? null })),
    ...statuses.map(x => ({ name: x.context, state: x.state.toUpperCase(), required: null, url: x.target_url, runId: null })),
  ];
  const rank = c => passing.has(c.state) ? 0 : pendingStates.has(c.state) ? 1 : 2;
  const failed = all.filter(c => rank(c) === 2), pending = all.filter(c => rank(c) === 1);
  const state = p.merged ? "MERGED" : p.state.toUpperCase();
  const mergeState = (p.mergeable_state ?? "unknown").toUpperCase();
  const blockers = ["GraphQL rate limit reached: review threads and review decision not read (REST fallback)"];
  if (state !== "OPEN") blockers.push(`PR is ${state}`);
  if (p.draft) blockers.push("PR is a draft");
  if (failed.length) blockers.push(`${failed.length} failing check(s)`);
  if (pending.length) blockers.push(`${pending.length} pending check(s)`);
  if (mergeState === "DIRTY") blockers.push("merge conflict with base");
  if (mergeState === "BEHIND") blockers.push("branch is behind base; update it");
  if (mergeState === "BLOCKED") blockers.push("branch protection blocks merge (required review or check)");
  return { pr: p.html_url, owner, name, number: p.number, state, head: p.head.sha, base: p.base.sha,
    branch: `${p.head.ref} -> ${p.base.ref}`, reviewDecision: "UNKNOWN", mergeable: p.mergeable === null ? "UNKNOWN" : p.mergeable ? "MERGEABLE" : "CONFLICTING",
    mergeState, isDraft: p.draft, checks: { total: all.length, failed, pending, all }, unresolvedThreads: [], blockers, ready: false, degraded: true };
}

function read() {
  if (process.env.PR_STATE_FORCE_REST) return readRest();
  try { return readGraphql(); }
  catch (e) { if (rateLimited(e)) return readRest(); throw e; }
}

function readGraphql() {
  const viewArgs = ["pr", "view", ...(target ? [target] : []), "--json",
    "number,url,headRefOid,headRefName,baseRefName,baseRefOid,isDraft,state,mergeable,mergeStateStatus,reviewDecision"];
  if (repoArg) viewArgs.push("--repo", repoArg);
  const pr = JSON.parse(gh(viewArgs));
  const [, owner, name] = /github\.com\/([^/]+)\/([^/]+)\/pull\//.exec(pr.url) ?? [];

  let threads = [], after = null, commit;
  do {
    const data = JSON.parse(gh(["api", "graphql", "-f", `query=${query}`, "-f", `owner=${owner}`, "-f", `name=${name}`,
      "-F", `number=${pr.number}`, ...(after ? ["-f", `after=${after}`] : [])])).data.repository.pullRequest;
    commit ??= data.commits.nodes[0]?.commit;
    threads.push(...data.reviewThreads.nodes);
    after = data.reviewThreads.pageInfo.hasNextPage ? data.reviewThreads.pageInfo.endCursor : null;
  } while (after);

  if (requiredContexts === null) {
    try { requiredContexts = JSON.parse(gh(["api", `repos/${owner}/${name}/branches/${encodeURIComponent(pr.baseRefName)}/protection/required_status_checks`])).contexts ?? []; }
    catch { requiredContexts = []; /* no protection, or no permission to read it */ }
  }

  const checks = (commit?.statusCheckRollup?.contexts.nodes ?? []).map(c => c.__typename === "CheckRun"
    ? { name: c.name, state: c.status === "COMPLETED" ? (c.conclusion ?? "UNKNOWN") : c.status, required: c.isRequired, url: c.detailsUrl, runId: c.checkSuite?.workflowRun?.databaseId ?? null }
    : { name: c.context, state: c.state, required: c.isRequired, url: c.targetUrl, runId: null });
  // A required check that has not started yet does not appear in the rollup at all.
  for (const ctx of requiredContexts) if (!checks.some(c => c.name === ctx)) checks.push({ name: ctx, state: "EXPECTED", required: true, url: null, runId: null });
  // The same check can report more than once (re-runs); keep the worst result.
  const rank = c => passing.has(c.state) ? 0 : pendingStates.has(c.state) ? 1 : 2;
  const byName = new Map();
  for (const c of checks) if (!byName.has(c.name) || rank(c) > rank(byName.get(c.name))) byName.set(c.name, c);
  const all = [...byName.values()];
  const failed = all.filter(c => rank(c) === 2), pending = all.filter(c => rank(c) === 1);
  const open = threads.filter(t => !t.isResolved).map(t => ({
    path: t.path, line: t.line ?? t.originalLine, outdated: t.isOutdated, id: t.id,
    comments: t.comments.nodes.map(c => ({ author: c.author?.login ?? "ghost", body: c.body.trim(), url: c.url, at: c.createdAt })),
    moreReplies: Math.max(0, t.comments.totalCount - t.comments.nodes.length),
  }));

  const blockers = [];
  if (pr.state !== "OPEN") blockers.push(`PR is ${pr.state}`);
  if (pr.isDraft) blockers.push("PR is a draft");
  if (commit && commit.oid !== pr.headRefOid) blockers.push("check rollup is not for the current head; re-read");
  if (failed.length) blockers.push(`${failed.length} failing check(s)`);
  if (pending.length) blockers.push(`${pending.length} pending check(s)`);
  if (open.length) blockers.push(`${open.length} unresolved review thread(s)`);
  if (commit?.statusCheckRollup?.contexts.pageInfo.hasNextPage) blockers.push("more than 100 checks; only the first 100 were read (gh pr checks for the rest)");
  if (pr.reviewDecision === "CHANGES_REQUESTED") blockers.push("changes requested");
  if (pr.reviewDecision === "REVIEW_REQUIRED") blockers.push("approving review required");
  if (pr.mergeable === "CONFLICTING") blockers.push("merge conflict with base");
  if (pr.mergeable === "UNKNOWN") blockers.push("mergeability not computed yet; re-read in a minute");
  const mergeStates = { BLOCKED: "branch protection blocks merge (required review or check)", BEHIND: "branch is behind base; update it",
    DIRTY: "merge conflict with base", UNSTABLE: "a non-passing check affects merge" };
  if (pr.state === "OPEN" && mergeStates[pr.mergeStateStatus] && !blockers.includes(mergeStates[pr.mergeStateStatus]))
    blockers.push(mergeStates[pr.mergeStateStatus]);

  return { pr: pr.url, owner, name, number: pr.number, state: pr.state, head: pr.headRefOid, base: pr.baseRefOid,
    branch: `${pr.headRefName} -> ${pr.baseRefName}`, reviewDecision: pr.reviewDecision || "NONE",
    mergeable: pr.mergeable, mergeState: pr.mergeStateStatus, isDraft: pr.isDraft,
    checks: { total: all.length, failed, pending, all }, unresolvedThreads: open, blockers, ready: blockers.length === 0 };
}

function render(r) {
  const out = [r.pr, `head ${r.head.slice(0, 12)}  ${r.branch}  review: ${r.reviewDecision}  merge: ${r.mergeState}`,
    `checks: ${r.checks.total - r.checks.failed.length - r.checks.pending.length}/${r.checks.total} passing`];
  for (const c of r.checks.failed) out.push(`  FAIL ${c.required ? "(required) " : ""}${c.name}  ${c.runId ? `gh run view ${c.runId} --log-failed` : c.url ?? ""}`);
  for (const c of r.checks.pending) out.push(`  wait ${c.required ? "(required) " : ""}${c.name}${c.state === "EXPECTED" ? " (not started)" : ""}`);
  if (r.unresolvedThreads.length) out.push(`unresolved threads: ${r.unresolvedThreads.length}`);
  for (const t of r.unresolvedThreads) {
    out.push(`  ${t.path}:${t.line ?? "?"}${t.outdated ? " (outdated - check if still true)" : ""}`);
    for (const c of t.comments) out.push(`    @${c.author}: ${c.body.split("\n")[0].slice(0, 160)}`);
    if (t.moreReplies) out.push(`    (+${t.moreReplies} more replies: open the thread)`);
    out.push(`    ${t.comments[0]?.url ?? ""}`);
  }
  out.push(r.ready ? "READY: no blockers on this head" : `BLOCKED: ${r.blockers.join("; ")}`);
  return out.join("\n") + "\n";
}

if (!watch) {
  let r;
  try { r = read(); } catch (e) { die(e.message); }
  process.stdout.write(json ? JSON.stringify(r, null, 2) + "\n" : render(r));
  process.exit(r.ready ? 0 : 2);
}

// ---- watch mode ----
const sleep = ms => new Promise(res => setTimeout(res, ms));
const stamp = () => new Date().toISOString().slice(11, 19);
const emit = (kind, text, data = {}) => process.stdout.write(json
  ? JSON.stringify({ at: new Date().toISOString(), kind, text, ...data }) + "\n" : `${stamp()} ${kind.padEnd(8)} ${text}\n`);

let first;
for (let attempt = 0; ; attempt++) {
  try { first = read(); break; }
  catch (e) { if (attempt >= 3) die(e.message); await sleep(2000 * 2 ** attempt); }
}

// One watcher per PR, so two agents do not race on the same thread or merge.
const stateDir = join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "astack");
const lock = join(stateDir, `pr-${first.owner}-${first.name}-${first.number}.lock`);
mkdirSync(stateDir, { recursive: true });
try {
  const holder = Number(readFileSync(lock, "utf8"));
  if (holder && holder !== process.pid) { try { process.kill(holder, 0); die(`another watcher (pid ${holder}) already holds ${first.pr}`); } catch (e) { if (e.code !== "ESRCH") throw e; } }
} catch (e) { if (e.code !== "ENOENT") throw e; }
writeFileSync(lock, String(process.pid));
const release = () => rmSync(lock, { force: true });
process.on("exit", release);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(130));

const checkKey = c => `${c.name}`;
const commentKeys = r => new Set(r.unresolvedThreads.flatMap(t => t.comments.map(c => c.url)));
emit("watching", `${first.pr} head ${first.head.slice(0, 7)}: ${first.ready ? "ready, confirming" : first.blockers.join("; ")}`);

const actionNeeded = r => {
  const why = [];
  if (r.state === "CLOSED") why.push("PR was closed");
  if (r.checks.failed.length) why.push(`failing: ${r.checks.failed.map(c => c.name).join(", ")}`);
  if (r.reviewDecision === "CHANGES_REQUESTED") why.push("changes requested");
  if (r.mergeable === "CONFLICTING" || r.mergeState === "DIRTY") why.push("merge conflict");
  if (r.mergeState === "BEHIND") why.push("branch is behind base");
  return why;
};

let prev = first, readyStreak = first.ready ? 1 : 0, errors = 0;
const startWhy = actionNeeded(first);
if (first.state === "MERGED") { emit("merged", first.pr); process.exit(0); }
if (startWhy.length) { emit("action", startWhy.join("; ")); process.stdout.write(json ? "" : render(first)); process.exit(2); }
const deadline = Date.now() + timeout * 1000;

while (Date.now() < deadline) {
  await sleep(interval * 1000);
  let r;
  try { r = read(); errors = 0; }
  catch (e) {
    if (++errors >= 10) die(`giving up after 10 failed reads: ${e.message}`);
    emit("retry", `read failed (${errors}/10): ${e.message.split("\n")[0]}`);
    await sleep(Math.min(120000, 5000 * 2 ** errors));
    continue;
  }
  if (r.head !== prev.head) { emit("head", `${prev.head.slice(0, 7)} -> ${r.head.slice(0, 7)}; earlier check results no longer count`); readyStreak = 0; }
  if (r.base && prev.base && r.base !== prev.base) {
    let overlap = [];
    try {
      const changed = JSON.parse(gh(["api", `repos/${r.owner}/${r.name}/compare/${prev.base}...${r.base}`, "--jq", "[.files[].filename]"]));
      const mine = JSON.parse(gh(["pr", "view", String(r.number), "--repo", `${r.owner}/${r.name}`, "--json", "files", "--jq", "[.files[].path]"]));
      overlap = mine.filter(f => changed.includes(f));
    } catch { /* comparison unavailable; still report the move */ }
    emit("base", `base moved ${prev.base.slice(0, 7)} -> ${r.base.slice(0, 7)}${overlap.length ? `; also touched by the PR: ${overlap.join(", ")}` : ""}`);
  }
  const before = new Map(prev.checks.all.map(c => [checkKey(c), c.state]));
  for (const c of r.checks.all) {
    const was = before.get(checkKey(c));
    if (was !== c.state && !pendingStates.has(c.state)) emit(passing.has(c.state) ? "pass" : "fail", `${c.name}${c.runId && !passing.has(c.state) ? `  gh run view ${c.runId} --log-failed` : ""}`);
  }
  const seen = commentKeys(prev);
  const fresh = r.unresolvedThreads.flatMap(t => t.comments.filter(c => !seen.has(c.url)).map(c => ({ ...c, path: t.path, line: t.line })));
  for (const c of fresh) emit("comment", `@${c.author} on ${c.path}:${c.line ?? "?"}: ${c.body.split("\n")[0].slice(0, 140)}  ${c.url}`);
  if (r.mergeState !== prev.mergeState) emit("merge", `${prev.mergeState} -> ${r.mergeState}`);
  if (r.reviewDecision !== prev.reviewDecision) emit("review", `${prev.reviewDecision} -> ${r.reviewDecision}`);

  if (r.state === "MERGED") { emit("merged", r.pr); process.exit(0); }
  const why = actionNeeded(r);
  if (fresh.length) why.push(`${fresh.length} new review comment(s)`);
  if (why.length) { emit("action", why.join("; ")); if (!json) process.stdout.write(render(r)); process.exit(2); }

  // Green only counts when two consecutive reads agree on the same head.
  readyStreak = r.ready && (r.head === prev.head) ? readyStreak + 1 : r.ready ? 1 : 0;
  if (readyStreak >= 2) { emit("ready", `${r.pr} head ${r.head.slice(0, 7)}: no blockers on two consecutive reads`); process.exit(0); }
  prev = r;
}
emit("timeout", `still blocked after ${timeout}s: ${prev.blockers.join("; ")}`);
process.exit(3);
