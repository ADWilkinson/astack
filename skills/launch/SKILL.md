---
name: launch
description: "Prepare a product launch, share cards, OG images, demo clips, announcement copy, changelog or community listings, with a distribution tracker and measurement. Use for launch kits, X/Show HN posts and directory submissions."
---

# Launch

A launch is a set of links people will click once. Each click must land on something that loads, explains itself, looks right when shared, and is measured.

`<skill-dir>` below means this skill's own folder. Run its scripts from the project root so output lands in the project, not in the installed skill.

## 1. Make the destination ready

Run the audit against every URL you will share:

```sh
node <skill-dir>/scripts/page-audit.mjs https://example.com https://example.com/feature
node <skill-dir>/scripts/shoot.mjs https://example.com --full
```

Fix before announcing:

- Share card: `og:title`, `og:description`, a 1200x630 `og:image` that loads over https, `twitter:card` = `summary_large_image`. Check how it renders: paste the URL into the platforms' card validators or a private message to yourself.
- Title and description say what it is and for whom in plain words.
- First screen at 390px answers what it is, who it is for and what to do, with a working primary action.
- Server-rendered content (the audit's "server text"), so link unfurlers and answer engines see more than a shell.
- Favicon, `theme-color`, a real 404, no console errors, fast first load on mobile.
- Analytics on the primary action, verified arriving (`instrument` if installed), with UTM or `ref` parameters planned per channel.

## 2. Build the kit

Put it in one folder (`launch/` or `docs/launch/`). Contents and formats in [kit](references/kit.md):

- **Share card** rendered from HTML/SVG source with `render-gate.mjs`, committed with its source. The gate fails a card whose font fell back, whose copy drifted from `copy.md`, or whose text is cropped.
- **Demo media**: 3 to 5 screenshots at real sizes, and a 6 to 15 second clip of the core action if motion helps. Build the clip as an HTML composition and render it with `film.mjs`, so a fix is an edit and a re-render ([film](references/film.md)). Real product, real-looking data, no fake metrics.
- **Copy**: one-line description (60 characters or fewer), a short paragraph, a longer description, the X/LinkedIn post, a Show HN or community post if it fits, a changelog entry. Rules in [copy](references/copy.md).
- **Tracker**: a CSV of where you will post or submit.

Before anything goes out, score the card, screenshots and clip with `web-design`'s review rubric if it is installed, from your own renders at feed size. Only a ship verdict goes out.

## 3. Write copy that survives scrutiny

Specific, verifiable, in the product's voice. Lead with what someone can do now. Every number has a source; someone else's numbers are labelled as theirs. No guarantees you cannot keep. Run `deslop`'s scan on every piece. Vary the angle per audience rather than pasting one blurb everywhere.

## 4. Distribute deliberately

Order the tracker by fit, not by count: the communities where the product's users already are come first. Respect each place's rules (self-promotion limits, required formats, no voting rings). Draft the material, then send or submit within the user's authority for each destination; reuse authority already given for that action and target. Update the tracker with status and the live URL as each goes out.

## 5. Measure the week

Before launch, save the queries: visits by `ref`/UTM source, primary action conversions, signups. After 24 hours and 7 days, read them out: which channels sent people who did the thing, not just traffic. Record what to repeat and what to drop.

## Never

- Fake testimonials, invented user counts, borrowed metrics presented as your own.
- Buying votes, asking for upvotes in a way the platform forbids, sockpuppets.
- Submitting the same narrow piece to many catalogues as spam; list the whole product once, well.
- Announcing before the destination passes step 1.
