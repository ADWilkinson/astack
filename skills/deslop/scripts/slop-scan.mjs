#!/usr/bin/env node
// Find candidate AI-default patterns in prose, UI source and code comments.
// Hits are leads to read in context, not verdicts: a phrase can be right in
// one sentence and filler in the next.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const HELP = `slop-scan: list likely AI-default patterns with file:line

Usage:
  node slop-scan.mjs [paths...] [--only prose,ui,code] [--min high|medium|info]
                     [--fail-on high|medium] [--json]

Exit code: 0 done, 2 a hit at or above --fail-on, 1 bad arguments or path.

Defaults to the current directory. Skips node_modules, dist, build, .git,
.next, coverage, vendored and generated files, and files over 512 KB.
Prose rules run on .md/.mdx/.txt/.html and on string/JSX text in UI files.
Suppress deliberate examples with "slop-scan: ignore-line" on the line, or
"slop-scan: ignore-file" anywhere in the file (e.g. in an HTML comment).
`;

const PROSE_EXT = new Set([".md", ".mdx", ".txt", ".html", ".htm"]);
const UI_EXT = new Set([".tsx", ".jsx", ".vue", ".svelte", ".astro", ".html", ".htm", ".css", ".scss"]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".rb", ".swift", ".kt"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", ".next", ".nuxt", ".svelte-kit", "coverage", "vendor", ".turbo", ".vercel", "out", "target", "__pycache__"]);

const w = s => new RegExp(`\\b(?:${s})\\b`, "gi");
// [id, kind, severity, pattern, why]
const RULES = [
  // Vocabulary that models reach for when there is nothing specific to say.
  ["inflated-verb", "prose", "medium", w("delv(?:e|es|ing)|unlock(?:s|ing)?|unleash(?:es|ing)?|supercharg(?:e|es|ing)|revolutioni[sz](?:e|es|ing)|empower(?:s|ing)?|elevat(?:e|es|ing) your|harness(?:es|ing)? the power|streamlin(?:e|es|ing) your|transform(?:s|ing)? the way"), "Inflated verb; name the actual action and result."],
  ["empty-adjective", "prose", "medium", w("seamless(?:ly)?|effortless(?:ly)?|cutting-edge|state-of-the-art|game-?chang(?:er|ing)|next-gen(?:eration)?|world-class|best-in-class|robust|powerful|innovative|transformative|unparalleled|groundbreaking|revolutionary"), "Adjective with no checkable content; replace with the specific property or delete."],
  ["model-vocabulary", "prose", "medium", w("tapestry|testament to|realm of|ever-evolving|fast-paced world|landscape of|navigat(?:e|ing) the complexit(?:y|ies)|in today's (?:digital|fast-paced|modern)|embark(?:s|ing)? on|plethora|myriad of|meticulous(?:ly)?|intricacies|nestled|bustling|vibrant community|rich history|holistic|synerg(?:y|ies)|paradigm shift|pivotal role|underscor(?:e|es|ing) the importance"), "Common model-default vocabulary; readers recognise it as generated."],
  ["throat-clearing", "prose", "medium", /\b(?:it(?:'s| is) (?:worth noting|important to (?:note|remember|understand))|it should be noted|needless to say|in conclusion|in summary|to summari[sz]e|at the end of the day|when it comes to|in order to|the fact that|let's dive (?:in|into)|dive deep(?:er)? into|without further ado|here's the thing|here's the kicker|the best part\?|buckle up|look no further|say goodbye to|imagine a world|in a world where|whether you're an? .{3,40} or an?)\b/gi, "Framing that delays the point; start with the point."],
  ["not-just-but", "prose", "medium", /\b(?:(?:is|isn't|it's|are|aren't) not (?:just|only|merely)|(?:isn't|aren't|wasn't) (?:just|only|merely)|more than just|not just [^.,;]{2,40}, but)\b/gi, "'Not just X, but Y' contrast; state Y directly unless the contrast is real."],
  ["staged-reveal", "prose", "medium", /(?:^|[.!?]\s+)(?:That's it\.|That's the (?:thing|point)\.|Here's (?:what|why|how)\b[^.]{0,40}:|What if [^?]{3,60}\?|And that's okay\.|The result\?|The catch\?|The answer\?|Simple\.)/gm, "Staged run-up or dramatic fragment; say the thing."],
  ["negative-listing", "prose", "medium", /\bNot an? [^.]{2,30}\. Not an? [^.]{2,30}\./g, "'Not a X. Not a Y.' cadence; describe what it is."],
  ["aphorism", "prose", "info", /(?:^|[.!?]\s+)[A-Z][a-z]+(?: \w+){0,3}\. No \w+(?: \w+){0,3}\./gm, "Aphoristic 'X. No Y.' cadence used as decoration."],
  ["metaphor-noun", "prose", "info", w("north star|flywheel|moat|unlock value|single pane of glass|source of truth for everything|force multiplier|table stakes|low-hanging fruit"), "Borrowed strategy metaphor; name the mechanism."],
  ["copula-avoidance", "prose", "medium", /\b(?:serves|stands|functions|acts) as (?:a|an|the)\b/gi, "'Serves as a' where 'is a' was meant; say is."],
  ["ing-rider", "prose", "medium", /,\s(?:highlighting|underscoring|showcasing|reflecting|emphasi[sz]ing|cementing|solidifying|reinforcing|signaling|marking)\s(?:the|its|their|a|an|how)\b/gi, "Trailing '-ing' clause that inflates the sentence's significance; end the sentence or make it its own claim."],
  ["false-agency", "prose", "info", /\bthe (?:data|numbers|results|research|evidence) (?:reveals?|tells? us|speaks? for itself|paints? a picture)\b/gi, "Data doesn't reveal; say what the numbers are and what you conclude."],
  ["significance-inflation", "prose", "medium", /\b(?:marks? a (?:pivotal|significant|major) (?:moment|milestone|shift)|plays? a (?:crucial|pivotal|vital|key) role|a significant milestone|stands? as a testament|cannot be overstated)\b/gi, "Inflated significance; state the concrete effect."],
  ["vague-attribution", "prose", "medium", /\b(?:experts (?:say|agree|believe)|studies (?:show|suggest)|research (?:shows|suggests)|many (?:people )?believe|it is widely (?:known|accepted))\b/gi, "Unattributed authority; name and link the source or drop the claim."],
  ["cutoff-disclaimer", "prose", "high", /\b(?:as of my (?:last|knowledge) (?:update|cutoff)|my training data|i (?:don't|do not) have access to real-time)\b/gi, "Model disclaimer left in published text."],
  ["intensifier", "prose", "info", /\b(?:quietly|genuinely|truly|actually|incredibly|remarkably) (?:powerful|elegant|simple|important|useful|transformative|different)\b|\bthe real (?:magic|power|value|win)\b/gi, "Intensifier doing the work a fact should; show the property instead."],
  ["arrow-chain", "prose", "info", /\S+\s*(?:→|->)\s*\S+\s*(?:→|->)\s*\S+/g, "Arrow chains as prose ('idea → build → ship'); write the sentence."],
  ["assistant-residue", "prose", "high", /\b(?:as an ai(?: language model)?|i hope this helps|great question|certainly!|absolutely!|i'd be happy to|feel free to reach out|let me know if you (?:have any|need))\b/gi, "Chat-assistant residue in a published artifact."],
  ["hedge-stack", "prose", "info", /\b(?:may potentially|could potentially|might possibly|could possibly|somewhat arguably|generally tends to|it seems that)\b/gi, "Stacked hedges; keep one qualifier that matches the real uncertainty."],
  ["emoji-bullet", "prose", "medium", /^\s*(?:[-*]\s*)?(?:\p{Extended_Pictographic}|✅|❌|🚀|✨|💡|🔥|👉|📈|🎯|⚡)\s+\S/gmu, "Emoji as a bullet or line lead; use words or real structure."],
  ["bold-lead-list", "prose", "info", /^\s*[-*]\s+\*\*[^*]{2,40}:?\*\*:?\s/gm, "Bold-lead bullet; fine once, slop when every list is built this way (see density)."],
  ["sparkle", "ui", "medium", /✨|\bSparkles\b|\bsparkles-icon\b|\bWand2?\b|\bMagicWand\b/g, "Sparkle/magic icon: the default signifier for 'AI', rarely the clearest one."],
  ["gradient-text", "ui", "medium", /\bbg-clip-text\b[^"'`]*\btext-transparent\b|\btext-transparent\b[^"'`]*\bbg-clip-text\b|-webkit-background-clip:\s*text|background-clip:\s*text/g, "Gradient-filled headline text; a strong generated-landing-page tell."],
  ["violet-gradient", "ui", "medium", /\b(?:from|via|to)-(?:purple|violet|indigo|fuchsia)-\d{2,3}\b|linear-gradient\([^)]*(?:#(?:8b5cf6|7c3aed|6366f1|4f46e5|a855f7|9333ea|c026d3|d946ef)|purple|violet|indigo)[^)]*\)/gi, "Purple/indigo gradient: the most common default palette in generated UI. Is it the brand?"],
  ["glass", "ui", "info", /\bbackdrop-blur(?:-[a-z0-9]+)?\b|backdrop-filter:\s*blur/g, "Glass blur; justify it with layering, not decoration (see density)."],
  ["hover-scale", "ui", "info", /\bhover:scale-1(?:0[2-9]|1\d)\b|transform:\s*scale\(1\.0[2-9]\)/g, "Hover zoom on cards/buttons; often motion without meaning."],
  ["decorative-pulse", "ui", "info", /\banimate-(?:pulse|bounce|ping)\b/g, "Looping animation; fine for loading/live status, noise elsewhere."],
  ["blob-glow", "ui", "info", /\bblur-(?:2xl|3xl)\b|\bblur-\[\d{2,3}px\]|filter:\s*blur\((?:[4-9]\d|\d{3})px\)/g, "Large blurred glow blobs behind content; a stock 'premium' backdrop."],
  ["default-font", "ui", "info", /font-family:\s*["']?(?:Inter|Roboto|Geist|Plus Jakarta Sans|Space Grotesk|Poppins)\b|\b(?:Inter|Roboto|Geist|Plus_Jakarta_Sans|Space_Grotesk|Poppins)\s*\(|fonts\.googleapis\.com\/css2?\?family=(?:Inter|Roboto|Poppins|Plus\+Jakarta|Space\+Grotesk)/g, "Most common default typeface; fine if chosen, slop if unexamined."],
  ["side-stripe", "ui", "info", /\bborder-l-(?:4|8)\b[^"'`]*\brounded|\brounded[^"'`]*\bborder-l-(?:4|8)\b/g, "Thick accent stripe on a rounded card; a stock 'callout' tell."],
  ["icon-circle-grid", "ui", "info", /\brounded-full\b[^"'`]*\b(?:h|w|size)-(?:10|12|14|16)\b[^"'`]*\bflex\b[^"'`]*\bitems-center\b/g, "Icon-in-circle tile; the three-column feature grid default."],
  ["mid-dot-meta", "ui", "info", />[^<{]{0,60}\s·\s[^<{]{0,60}\s·\s[^<]{0,60}</g, "'A · B · C' meta string: template chrome, and it strands at line ends. Use separate elements."],
  ["arrow-suffix", "ui", "info", />[^<{]{2,40}\s(?:→|&rarr;|->)\s*</g, "Arrow appended to link or button text; the default chrome of generated pages."],
  ["caps-eyebrow", "ui", "info", /\buppercase\b[^"'`]*\btracking-(?:widest|\[0\.[1-9]\d*em\])|\btracking-(?:widest|\[0\.[1-9]\d*em\])[^"'`]*\buppercase\b|text-transform:\s*uppercase;\s*letter-spacing:\s*0?\.[12]\d*em/g, "Tracked-out all-caps label; the eyebrow above every heading."],
  ["generic-cta", "ui", "info", />\s*(?:Get Started|Learn More|Start (?:your )?(?:free )?trial|Join the waitlist|Explore (?:now|features))\s*</g, "Generic CTA label; name what happens next ('Create a listing', 'See rates')."],
  ["emoji-in-ui", "ui", "medium", />[^<{]*?(?:🚀|✨|🔥|💡|⚡|🎉|👋|💪|🙌|📈|🎯)[^<]*?</gu, "Emoji in interface copy; usually stands in for an icon system or a point of view."],
  ["section-index", "ui", "info", />\s*0[1-9]\s*(?:<\/|—|–|-|\/)/g, "Numbered marker (01, 02) on content that is not a sequence. Delete it, or keep it only where order is the point."],
  // Motion and mobile details that make an interface feel slightly off.
  ["transition-all", "ui", "medium", /\btransition-all\b|transition:\s*all\b/g, "Transitions every property, including layout ones nobody meant to animate. Name them: transform, opacity."],
  ["ease-in-ui", "ui", "info", /\bease-in\b(?!-out)|(?:transition|animation)(?:-timing-function)?:[^;]*\bease-in\b(?!-out)/g, "ease-in starts slowly, exactly when the user is watching; UI enters and exits on ease-out."],
  ["scale-from-zero", "ui", "info", /\bscale-0\b|scale\(\s*0\s*\)|\bscale:\s*0\b/g, "Enters from nothing. Start at scale 0.95 with opacity 0."],
  ["zoom-disabled", "ui", "high", /user-scalable\s*=\s*(?:no|0)|maximum-scale\s*=\s*1(?:\.0)?\b/g, "Disables pinch zoom for everyone. Fix the cause instead: inputs at 16px stop iOS focus zoom."],
  ["vh-shell", "ui", "info", /\b(?:min-)?h-screen\b|(?:min-)?height:\s*100vh\b/g, "100vh is taller than the visible area on phones; use dvh for app shells and svh for heroes."],
  ["narrating-comment", "code", "info", /(?:\/\/|#)\s*(?:This (?:function|method|component|code)|Function to|Helper (?:function )?to|Initiali[sz]e the|Define the|Create a new|Loop through|Check if|Return the|Import (?:the )?(?:necessary|required))\b/g, "Comment paraphrases the next line; keep comments that explain why."],
  ["placeholder-code", "code", "high", /(?:\/\/|#)\s*(?:TODO:? implement|Add (?:your|more) .{0,30} here|Rest of (?:the )?code|\.\.\. ?existing code|implementation goes here)|\bthrow new Error\(["']Not implemented["']\)/gi, "Placeholder left in shipped code."],
  ["swallowed-error", "code", "medium", /catch\s*(?:\(\s*\w*\s*\))?\s*\{\s*\}|except(?:\s+\w+)?:\s*\n\s*pass\b/g, "Empty catch hides failures; handle, log with context, or let it throw."],
];
const DENSITY = { "em-dash": 1 / 120, "bold-lead-list": 4, "glass": 6, "triad": 1 / 150 };

function die(msg) { process.stderr.write(`slop-scan: ${msg}\n`); process.exit(1); }

function parse(argv) {
  const o = { paths: [], only: new Set(["prose", "ui", "code"]), min: "info", failOn: "", json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") { process.stdout.write(HELP); process.exit(0); }
    else if (a === "--only") o.only = new Set((argv[++i] ?? "").split(","));
    else if (a === "--min") o.min = argv[++i];
    else if (a === "--fail-on") o.failOn = argv[++i];
    else if (a === "--json") o.json = true;
    else if (a.startsWith("-")) die(`unknown option ${a}`);
    else o.paths.push(a);
  }
  // A gate that silently scans nothing would always pass, so bad input is an error.
  if (!(o.min in rank)) die(`--min must be one of high, medium, info`);
  if (o.failOn && !(o.failOn in rank)) die(`--fail-on must be one of high, medium, info`);
  for (const k of o.only) if (!["prose", "ui", "code"].includes(k)) die(`--only accepts prose, ui, code`);
  if (!o.paths.length) o.paths.push(".");
  for (const p of o.paths) if (!statSync(p, { throwIfNoEntry: false })) die(`no such file or directory: ${p}`);
  return o;
}

function* walk(path) {
  const st = statSync(path, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isFile()) { yield path; return; }
  if (!st.isDirectory()) return;
  for (const name of readdirSync(path)) {
    if (SKIP_DIRS.has(name) || name.startsWith(".") && name !== ".github") continue;
    yield* walk(join(path, name));
  }
}

// For UI/code files, run prose rules only over human-visible text: JSX text
// nodes and string literals long enough to be copy.
function visibleText(src) {
  const parts = [];
  for (const m of src.matchAll(/>([^<>{}]{12,})</g)) parts.push([m.index + 1, m[1]]);
  for (const m of src.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.){24,})\1/g)) if (/\s\w+\s/.test(m[2])) parts.push([m.index + 1, m[2]]);
  return parts;
}

const rank = { info: 0, medium: 1, high: 2 };
function lineOf(text, index) { let n = 1; for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++; return n; }

function scanFile(file, o) {
  const ext = extname(file).toLowerCase();
  const isProse = PROSE_EXT.has(ext), isUi = UI_EXT.has(ext), isCode = CODE_EXT.has(ext);
  if (!isProse && !isUi && !isCode) return null;
  const st = statSync(file);
  if (st.size > 512 * 1024) return null;
  const src = readFileSync(file, "utf8");
  if (/^\s*(?:\/\/|\/\*|#)\s*(?:@generated|auto-generated|this file was generated)/i.test(src.slice(0, 300))) return null;
  if (src.includes("slop-scan: ignore-file")) return null;
  const ignored = new Set(src.split("\n").flatMap((l, i) => l.includes("slop-scan: ignore-line") ? [i + 1] : []));
  const hits = [], seen = new Set();
  const add = (rule, index, match, base = 0) => ignored.has(lineOf(src, base + index)) || seen.has(`${rule[0]}:${base + index}`) || seen.add(`${rule[0]}:${base + index}`) && hits.push({ rule: rule[0], kind: rule[1], severity: rule[2], line: lineOf(src, base + index), match: match.trim().replace(/\s+/g, " ").slice(0, 80), why: rule[4] });
  const segments = isProse ? [[0, src]] : visibleText(src);
  for (const rule of RULES) {
    if (!o.only.has(rule[1]) || rank[rule[2]] < rank[o.min]) continue;
    if (rule[1] === "prose") for (const [base, text] of segments) for (const m of text.matchAll(rule[3])) add(rule, m.index, m[0], base);
    if (rule[1] === "ui" && isUi) for (const m of src.matchAll(rule[3])) add(rule, m.index, m[0]);
    if (rule[1] === "code" && isCode) for (const m of src.matchAll(rule[3])) add(rule, m.index, m[0]);
  }
  const words = segments.reduce((n, [, t]) => n + (t.match(/\b\w+\b/g)?.length ?? 0), 0);
  const density = [];
  if (o.only.has("prose") && words >= 150) {
    const dashes = segments.reduce((n, [, t]) => n + (t.match(/—|\s--\s/g)?.length ?? 0), 0);
    if (dashes / words > DENSITY["em-dash"]) density.push({ rule: "em-dash-density", severity: "medium", detail: `${dashes} em dashes in ${words} words`, why: "Dashes doing the work of commas, colons and full stops; vary the punctuation." });
    const triads = segments.reduce((n, [, t]) => n + (t.match(/\b\w+(?: \w+)?, \w+(?: \w+)?,? and \w+/g)?.length ?? 0), 0);
    if (triads / words > DENSITY.triad) density.push({ rule: "triad-density", severity: "info", detail: `${triads} "X, Y and Z" lists in ${words} words`, why: "Reflexive groups of three; keep the items that carry information." });
  }
  // Whole-file palette clusters: today's generated-design defaults.
  if (isUi && o.only.has("ui")) {
    const hexes = [...src.matchAll(/#([0-9a-f]{6})\b/gi)].map(m => [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)));
    const cream = hexes.some(([r, g, b]) => r >= 0xf0 && g >= 0xe6 && b >= 0xd0 && b <= 0xf0 && r - b >= 8);
    const serif = /font-family:[^;]*(?:serif|Georgia|Garamond|Playfair|Fraunces|Newsreader|Iowan|Instrument Serif)/i.test(src.replace(/sans-serif/gi, ""))
      || /\bfont-serif\b|(?:Playfair_Display|Fraunces|Newsreader|Instrument_Serif|EB_Garamond)\s*\(/.test(src);
    const clay = hexes.some(([r, g, b]) => r >= 0xb0 && g >= 0x40 && g <= 0x80 && b <= 0x60);
    const nearBlack = hexes.some(([r, g, b]) => Math.max(r, g, b) <= 0x14);
    const acid = hexes.some(([r, g, b]) => (g >= 0xd0 && r >= 0x80 && r <= 0xe0 && b <= 0x60) || (r >= 0xe0 && g <= 0x60 && b <= 0x40)) || /\b(?:text|bg|border)-lime-\d{3}\b/.test(src);
    if (cream && serif) density.push({ rule: "warm-editorial", severity: "medium", detail: `cream background with a serif display${clay ? " and a clay/terracotta accent" : ""}`, why: "Today's most common generated look; fine if the brief asked for it, slop if it arrived by default." });
    if (nearBlack && acid) density.push({ rule: "dark-acid", severity: "info", detail: "near-black background with an acid/vermilion accent", why: "A current generated-design default; check it was a choice." });
    const opacities = [...src.matchAll(/\b(?:text|bg)-(?:black|white|neutral|zinc|gray|slate|stone)\/(?:[1-9]\d)\b/g)].map(m => m[0].replace(/.*\//, ""));
    const distinct = [...new Set(opacities)];
    if (distinct.length >= 4) density.push({ rule: "opacity-ramp", severity: "info", detail: `${distinct.length} opacities of one neutral (${distinct.sort().join(", ")})`, why: "A ladder of opacities standing in for a type scale. Two inks, primary and secondary, are enough unless the brand defines more." });
  }
  const boldLeads = hits.filter(h => h.rule === "bold-lead-list").length;
  if (boldLeads > DENSITY["bold-lead-list"]) density.push({ rule: "bold-lead-density", severity: "medium", detail: `${boldLeads} bold-lead bullets`, why: "Every list as '**Label:** text' reads as generated; use prose or a table where it fits." });
  const glass = hits.filter(h => h.rule === "glass").length;
  if (glass > DENSITY.glass) density.push({ rule: "glass-density", severity: "medium", detail: `${glass} blur surfaces`, why: "Blur as default surface treatment." });
  return { file, words, hits, density };
}

const o = parse(process.argv.slice(2));
const results = [];
for (const p of o.paths) for (const f of walk(p)) { const r = scanFile(f, o); if (r && (r.hits.length || r.density.some(d => rank[d.severity] >= rank[o.min]))) results.push(r); }
for (const r of results) r.density = r.density.filter(d => rank[d.severity] >= rank[o.min]);
const all = results.flatMap(r => [...r.hits, ...r.density]);
const counts = all.reduce((c, h) => (c[h.severity] = (c[h.severity] ?? 0) + 1, c), {});
if (o.json) process.stdout.write(JSON.stringify({ counts, files: results }, null, 2) + "\n");
else {
  for (const r of results) {
    const rel = relative(process.cwd(), r.file);
    process.stdout.write(`\n${rel && !rel.startsWith("..") ? rel : r.file}\n`);
    for (const h of r.hits.sort((a, b) => a.line - b.line))
      process.stdout.write(`  ${String(h.line).padStart(5)}  ${h.severity.padEnd(6)} ${h.rule}: "${h.match}"\n`);
    for (const d of r.density) process.stdout.write(`      -  ${d.severity.padEnd(6)} ${d.rule}: ${d.detail}\n`);
  }
  const why = new Map(all.map(h => [h.rule, h.why]));
  if (why.size) { process.stdout.write("\nWhy these matter:\n"); for (const [k, v] of why) process.stdout.write(`  ${k}: ${v}\n`); }
  process.stdout.write(`\n${results.length} file(s): ${counts.high ?? 0} high, ${counts.medium ?? 0} medium, ${counts.info ?? 0} info. Read each hit in context before changing it.\n`);
}
if (o.failOn && all.some(h => rank[h.severity] >= rank[o.failOn])) process.exit(2);
