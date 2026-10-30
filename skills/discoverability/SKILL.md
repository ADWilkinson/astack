---
name: discoverability
description: "Diagnose and fix why Google, Bing or AI answers miss or misdescribe a product. Use for SEO/GEO/AEO, ranking or indexing problems, canonical/robots/sitemap checks and search-focused content."
---

# Discoverability

Most visibility problems are boring and fixable: a page that crawlers cannot read, a canonical pointing elsewhere, a blocked bot, content rendered only in JavaScript, or no page that answers the question buyers actually ask. Find those before writing anything new.

`<skill-dir>` below means this skill's own folder. Run its scripts from the project root so output lands in the project, not in the installed skill.

## 1. Audit what crawlers actually get

```sh
node <skill-dir>/scripts/page-audit.mjs https://example.com https://example.com/pricing https://example.com/vs/competitor
```

For each URL it reports the redirect chain, noindex, canonical, title and description length, `html lang`, h1 count, how much text exists in server HTML, the share card and og:image (status, type, real dimensions), JSON-LD validity, robots.txt rules for Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended and Applebot-Extended, and whether the URL is in the sitemap.

Fix errors first. The usual culprits:

- **Client-rendered content**: low "server text" means crawlers and answer engines see an empty shell. Render the core content on the server or prerender.
- **Canonical points elsewhere**, often a trailing-slash, `www` or locale mismatch.
- **Search bots blocked** by robots.txt, a WAF or bot protection. Training crawlers (GPTBot, Google-Extended) are a separate choice from search crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot); keep the owner's opt-outs deliberate.
- **Not in the sitemap**, or the sitemap lists redirected URLs.
- **Missing or broken share card**: also hurts click-through when links are shared.

## 2. Fix the query cohort before measuring

Pick 8 to 20 queries real buyers type, from Search Console, support questions, sales calls and competitor comparison terms. Group by intent: problem ("how to X"), solution category ("best X for Y"), comparison ("A vs B"), alternatives ("A alternative"), and branded. Map each group to the one page that should answer it. Freeze the exact wording, locale and engines; this cohort is your baseline.

## 3. Baseline

- **Search Console** (if available): impressions, clicks, CTR and position for the cohort's pages and queries, for a dated window, with country and device filters written down.
- **Answer engines**: a fresh conversation per query, no hints, three runs for the important ones. Record separately whether the product is **mentioned**, **cited** (linked) and **recommended**. A blocked or failed run is missing data, never a zero.

The full protocol is in [search and answer measurement](references/search-and-answer-measurement.md).

## 4. Find the reason, then make the smallest fix

For each gap, look at what the engines cite instead. Usually it is a page that answers the question directly with specifics: a comparison table, real prices, a how-to with steps, original data. Ask what this product can say that is true and that nobody else has.

Priority:

1. Technical blockers from step 1.
2. Improve the existing best page for the intent: answer in the first paragraph, specifics over adjectives, a table where buyers compare, updated dates, internal links from related pages.
3. A new page only for a distinct intent with no good existing page. Comparison and alternatives pages must be fair and current.

Keep structured data consistent with visible content. No special file or markup guarantees inclusion in AI answers; Google's guidance is that ordinary SEO eligibility applies (see the reference for current docs).

Ship the fix (`ship` if installed) and re-run `page-audit.mjs` against production.

## 5. Read out

Re-run the frozen cohort after the engines have had time to recrawl (days to weeks, not hours). Compare mention, citation and recommendation counts with valid-run totals, and Search Console for equal-length windows. Look at qualified conversions from the affected landing pages. Name concurrent releases, seasonality and model updates. Record continue, change or stop, and the next read date.

## Never

- Keyword-stuff, cloak, or show crawlers different content than users.
- Mass-generate thin pages per keyword or per city.
- Claim a ranking or AI-citation improvement from a single run or a single day.
