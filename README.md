# astack

[![npm](https://img.shields.io/npm/v/astack-skills?color=24563a&label=npm)](https://www.npmjs.com/package/astack-skills)

I'm Andrew ([@andrewwilkinson](https://x.com/andrewwilkinson)). Product engineer in London, building at [Peer](https://peer.xyz), eight years deep in crypto, founded Galleon, and keeper of a GitHub that is mostly a graveyard of side projects I'm proud of.

These are the skills I use every day to ship my own products, things like [USDCtoFiat](https://usdctofiat.xyz), [Peerlytics](https://peerlytics.xyz), [KnowFulham](https://knowfulham.com), [Lettance](https://lettance.com) and [RampRidge](https://www.rampridge.xyz), with Claude and Codex doing most of the typing. Cleaned up so anyone can use them.

Agents are very good at saying "done". They're less good at checking the mobile layout, noticing the event never fired, or spotting that production is still serving yesterday's build. And left alone, everything they design ends up purple, glassy and three cards wide.

I got tired of typing the same follow-ups, so I wrote them down once and gave the agent the tools to check its own work. **astack makes done mean live, measured and not slop.**

## Install

```sh
npx astack-skills@latest install --agent all
```

That puts the skills in your project for Claude Code and Codex. `--scope global` installs them everywhere, and `--skill ship,deslop` picks a few. Folders you've edited are left alone; `--force` replaces them.

As a plugin:

```text
/plugin marketplace add ADWilkinson/astack
/plugin install astack@adwilkinson
```

```sh
codex plugin marketplace add ADWilkinson/astack
codex plugin add astack@adwilkinson
```

Or do what I do and paste this repo's link to your agent with "install this". It reads the same instructions you just did.

## Get started

Two ways in, depending on whether you're watching.

```text
astack this: add annual pricing to the billing page. phones matter most
```

`astack` takes it to a PR you'd be happy to merge. It reads the context, plans, builds, uses the thing like a customer, adds tracking, cleans up the slop, gets a second agent to check the work, and stops there for you.

```text
oneshot this: add annual pricing and get it live
```

`oneshot` is for when you're not watching. Same work, then it merges, deploys, proves production is serving it and tells the team. It only runs when you ask for it by name.

Both pull in the other skills as they need them.

## Skills

| Skill | Say | What it does |
| --- | --- | --- |
| [astack](skills/astack/SKILL.md) | "astack this" | Takes a task from idea to a proven, review-ready PR, with a done-check at every stage. |
| [oneshot](skills/oneshot/SKILL.md) | "oneshot this" | The same, all the way: merged, deployed, verified live and announced. You call it by name. |
| [context](skills/context/SKILL.md) | "read the thread first" | Pulls the Slack thread, issue, PRs, git history and analytics that actually change the task into a short brief. |
| [web-design](skills/web-design/SKILL.md) | "this looks AI-generated" | Gives the UI a real direction, keeps a DESIGN.md so it sticks, animates with purpose, and checks it on a phone in light and dark. |
| [web-graphics](skills/web-graphics/SKILL.md) | "make a hero graphic" | Isometric scenes, flat illustrations, ASCII art, icons and share cards, built in code. |
| [deslop](skills/deslop/SKILL.md) | "this sounds like AI" | Finds the tells in copy, UI and code, fixes them, and can learn your voice from your own writing. |
| [instrument](skills/instrument/SKILL.md) | "can we measure this" | Tracking that fires once, on real success, and a query you can actually trust. |
| [discoverability](skills/discoverability/SKILL.md) | "why doesn't ChatGPT mention us" | Checks what Google and AI crawlers really see, fixes it, measures before and after. |
| [dogfood](skills/dogfood/SKILL.md) | "use it like a customer" | Walks the real journeys signed in, fixes what breaks and goes round again. |
| [ship](skills/ship/SKILL.md) | "ship it" | Clears CI and review comments, gets an independent check, deploys, and proves production is serving it. Also checks other people's "it's shipped". |
| [launch](skills/launch/SKILL.md) | "we launch tomorrow" | Share cards, page checks, posts for X and Show HN, a tracker and how you'll read the results. |

Each one has a short guide in [docs/skills](docs/skills/).

## The tools

Most skill packs tell the model to be thorough. These come with small scripts so it can actually check. Node 22, nothing else to install, and every skill carries its own copy.

- `shoot.mjs` screenshots a page on a phone and on desktop, light and dark, and flags stranded words, tiny tap targets and anything spilling sideways.
- `pr-state.mjs` reads every check on the current commit and every unresolved review thread. `--watch` sits in the background and pings you when something changes.
- `verify-live.mjs` confirms the URL is serving the commit you shipped, not a cached copy of the last one.
- `slop-scan.mjs` finds the usual suspects, from "seamless" to gradient headlines to emoji bullets, and explains why each one reads as generated. <!-- slop-scan: ignore-line -->
- `page-audit.mjs` shows what crawlers and link previews see, like a forgotten noindex or a broken share card.
- `iso.mjs` turns a small scene description into clean isometric SVG with the geometry right, because nobody should hand-roll isometric maths.

## Does it actually help?

I gave the same model the same six tasks twice, once with astack and once without, and had a separate agent score both blind.

| Task | With astack | Without |
| --- | ---: | ---: |
| Rebrand a generic landing page | 20 | 14 |
| Add checkout analytics | 19 | 14 |
| Get a site ready to launch | 20 | 16 |
| QA and fix a signup flow | 20 | 17 |
| Deslop a landing page | 20 | 18 |
| Check an "it's shipped" claim | 18 | 18 |

Without it, the agent kept an unverified "Trusted by 10,000+ freelancers" on the page, let checkout count an order twice and launched with no idea where the traffic would come from. One run each and a same-family judge, so it's a strong signal rather than a benchmark. It also missed something: both brand results landed on the warm cream, serif and terracotta look that's everywhere right now, so 0.5 now catches that too. The [case study](docs/case-study-pawpath.md) shows both. Full setup and raw scores are in [evals](evals/RESULTS.md).

## Make them yours

Fork it, change it, send PRs. Keep your own preferences outside the skills so updates don't wipe them: house rules in `CLAUDE.md` or `AGENTS.md`, your design direction in `DESIGN.md`, your writing voice in `VOICE.md`. The skills read those first.

Nothing here posts, messages, deploys to production or spends money unless you've said so for that exact thing. No background services, no telemetry. When it can't check something, it tells you.

Working on astack itself: `bun run metadata` syncs shared scripts and picker metadata, `bun run check` validates everything and runs the tests. See [CONTRIBUTING](CONTRIBUTING.md) and [SCOPE](SCOPE.md).

[MIT](LICENSE) 🏴‍☠️
