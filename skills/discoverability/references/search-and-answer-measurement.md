# Search and answer measurement

## The cohort

8 to 20 queries a real buyer would type, frozen before you measure. Record per query:

| Field | Example |
| --- | --- |
| id | `q07` |
| text (exact) | `best invoicing app for uk freelancers` |
| intent | problem / category / comparison / alternative / branded |
| branded | no |
| target page | `/` or `/vs/competitor` |
| locale, country, device | en-GB, GB, mobile |

Keep exploratory queries in a separate list. If the cohort must change, version it (`cohort-v2`) and compare only the shared queries across versions.

## Answer-engine runs

- One fresh conversation per run. No hints, no follow-ups, no brand name in an unbranded query.
- Same surface each time, written down: e.g. "ChatGPT web, search on, logged in, memory off". An API model with search is a different surface; record it separately.
- Three runs for the queries that matter, decided before looking at results.
- Do not wipe someone's history or settings to get a clean session; record what you could not control.

Record each run as one row:

| Field | Values |
| --- | --- |
| run status | `valid`, `no-answer`, `tool-unavailable`, `blocked`, `error` |
| mentioned | the answer names the product |
| cited | the answer links to the product's site (record URL and the claim it supports) |
| recommended | the answer presents it as a good choice for the stated need |
| citation ok | the link resolves, is the right site and supports the claim |
| competitors | named alternatives and the sources cited for them |

Mention, citation and recommendation are separate facts; record all that apply. Only `valid` runs are scored. Report as "2 of 3 valid runs cited; 1 run blocked", never as a bare percentage. Do not pool engines or locales into one number. For Google AI Overviews, record whether the overview appeared at all; no overview is not a failed run.

## Diagnosing a gap

For the page that should answer the query:

1. Fetches cleanly, one redirect at most, canonical points to itself (`page-audit.mjs`).
2. Crawlers allowed in robots.txt and not blocked by a WAF or bot challenge.
3. Indexing confirmed where possible (Search Console URL inspection); a fetchable page is not proof of indexing, and indexing is not proof of citation.
4. The answer is in server-rendered text, early, specific and true.
5. Compare with the pages engines cite instead: what question do they answer that this page does not, and what can this product say that they cannot?

One run's omission is an observation; a repeated pattern is a finding.

Current platform guidance: [Google AI features](https://developers.google.com/search/docs/appearance/ai-features), [OpenAI crawlers](https://developers.openai.com/api/docs/bots). Training and search crawlers are separate controls; keep the owner's opt-outs deliberate.

## Readout after a release

- Confirm the fix is live first (`verify-live.mjs`, `page-audit.mjs`). Then wait for recrawl; days to weeks depending on the site. A same-day unchanged answer is not a failed fix.
- Re-run the same cohort, same protocol. Report valid-run counts per engine.
- Search Console: equal-length windows, same country and device filters, impressions, clicks and CTR together, page and query detail kept. AI Overview traffic is folded into the Web report; it cannot be isolated there.
- Analytics: visits to the affected landing pages and the qualified action, test traffic excluded. Referrers from AI products are often missing; say so.
- Name what else changed in the window: other releases, campaigns, seasonality, model updates.
- End with continue, change, stop or wait, and the next read date. Use causal language only if the design supports it.
