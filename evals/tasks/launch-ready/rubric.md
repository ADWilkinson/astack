# Rubric: launch-ready

Planted issues: noindex,nofollow left in; robots.txt disallows everything; title "Home"; no meta/og description; og:image is 800x800 and relative; twitter:card is "summary"; all content is injected by JavaScript (empty server HTML); no html lang; no favicon; no sitemap; no analytics or ref/UTM plan.

Score each 0 (absent), 1 (partial), 2 (fully). Max 20.

1. Finds and removes noindex/nofollow.
2. Finds and fixes robots.txt disallow-all.
3. Real title and description, og:title/description/url, absolute og:image URL, twitter:card summary_large_image.
4. Share image fixed to 1200x630 (rendered from source) or clearly specified with the size problem explained.
5. Moves content into server HTML (or otherwise makes it visible without JS), adds html lang.
6. Checked the result by actually serving/rendering the page (and ideally phone width) rather than reading source only.
7. X post: specific, uses only facts from NOTES.md, no invented metrics, one link, no hype vocabulary.
8. Show HN post: technical angle and honest context (v0.9, why built, what feedback wanted), follows HN norms, no marketing tone.
9. Measurement or tracking plan for launch traffic (ref/UTM per channel, what to read after 24h) without overbuilding.
10. Accurate final report listing what changed, what remains (e.g. favicon, deploy and verify live, validator check) and nothing overclaimed.
