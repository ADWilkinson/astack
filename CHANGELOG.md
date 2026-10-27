# Changelog

## 0.6.0

Motion and mobile craft from [Emil Kowalski's skills](https://github.com/emilkowalski/skills) and animated stickers from [fun-isometric](https://skills.klvn.dev/fun-isometric) by Kelvin Adithya, both MIT and credited where they are used.

- `web-graphics` makes animated sticker icons: flat-fill slabs with a thick outline that move on After Effects grade keyframe presets, for onboarding, empty states and rewards. The kit (`kit/fun.ts`, `motions.ts`, 24 worked icons, a React `<Sticker>`) is bundled, recolours from a brand's two colours, and plays live on canvas or exports to alpha webm and HEVC with a poster.
- New `fi.mjs` checks, sheets, frames and exports stickers. It is a dependency-free port of the original renderer: types are stripped per file and Chrome is driven over the DevTools protocol, so nothing installs Playwright at run time. Runs on Node 22.13+ or Bun.
- `web-design` motion reference rewritten around a decision order: whether it should animate at all (never keyboard or high-frequency actions), ease by what is happening (never `ease-in` on UI), durations under 300ms, press feedback, origin-aware popovers, interruptible transitions and `@starting-style`, gesture rules, and a symptom table for janky animation. Reviews come back as a Before / After / Why table.
- New `web-design` references: a mobile baseline (tap flash, stuck hover, `dvh`/`svh`, input zoom, safe areas, `touch-action`) and a worst-case data method with a catalogue of plausible values that break layouts.
- `slop-scan.mjs` flags `transition: all`, `ease-in` on UI, `scale(0)` entrances, disabled zoom and `100vh` app shells.
- Routing eval gains nine cases for stickers, janky motion, mobile feel and worst-case data.

## 0.5.0

Each skill was reviewed against tstack, pstack, gstack, impeccable, Anthropic's skills and the slop packs, and kept, rewritten or extended accordingly.

- New `oneshot`: idea to merged, deployed, verified live and announced. User-invoked only. `astack` now stops at a review-ready PR.
- `astack` copies its stages into the todo list and closes each with proof or a reason, has an explicit grant and a short list of when to ask, and waits on CI instead of stopping.
- `ship` classifies CI failures before retrying, treats review comments with scepticism, gets an independent verdict from an agent that didn't write the change, re-checks right before merging and reads the merge back.
- `web-design` names the current AI-design defaults (warm cream with serif and terracotta, dark with an acid accent, broadsheet hairlines, template chrome), plans in two passes with a generic test, and scales boldness by mode.
- `slop-scan.mjs` detects those defaults and newer prose tells (copula avoidance, trailing -ing clauses, false agency, inflated significance, vague attribution).
- `pr-state.mjs` falls back to REST when GitHub's GraphQL limit runs out. `pr-state` and `verify-live` now ship inside every skill that uses them.
- `dogfood` gains diff-aware mode and red-first, one-commit-per-fix repairs; `context` anchors in git history and tags threads; `delivery-plan` skips trivial changes and settles questions by prototype; `delivery-update` scans for secrets before sending.
- `shoot.mjs` works on CI runners (`--no-sandbox` under CI or root) and reports why Chrome failed to start.
- Plain-English docs, a personal README, and a cleaner repo.
- Cut to 11 skills. `delivery-plan` folds into `astack` as a planning reference and `motion` into `web-design` as a motion reference. `delivery-update` and `automate` are gone: a capable model writes a good update or a cron job without them, and `oneshot` now carries the update step itself.

## 0.4.0

- Add a blind comparison eval: six realistic tasks with planted problems, each run with and without astack by the same model and scored against a hidden rubric by a separate judge. astack scored 117/120 against 97/120 and was preferred in 5 of 6 tasks. Fixtures, rubrics, method and raw scores are in `evals/`.
- Add a routing eval: 66 requests, including 24 near-misses, all routed to the right skill or to none.
- `pr-state.mjs --watch`: background PR watcher with one line per change, required checks that have not started, two agreeing reads before ready, base-branch moves with overlapping files, a per-PR lock and exit codes for ready, action needed and timeout.
- `ship` gains a procedure for checking someone else's "it's shipped" claim, from the one eval task where astack did not beat the baseline.
- `shoot.mjs` measures the real width of the last word when detecting stranded words, removing false positives on large type.
- Rewrite the discoverability measurement, automation retries and AI journey references as concise procedures.
- One-page guides for every skill in `docs/skills/`, and a before/after case study.

## 0.3.0

- Rewrite every skill as a concrete procedure: done-gates per stage, closed lists of what to refuse, bad/good examples and real commands instead of general guidance.
- Add six dependency-free Node tools bundled inside the skills that use them: `shoot.mjs` (390/1440 light/dark captures with overflow, stranded-word, tap-target, tiny-text, console and network checks, plus filmstrips), `pr-state.mjs` (checks and unresolved threads on the exact PR head), `verify-live.mjs` (cache-busting proof that a URL serves a commit or content), `slop-scan.mjs` (30+ prose, UI and code tells with ignore directives and a CI gate mode), `page-audit.mjs` (indexability, share card, JSON-LD, AI-crawler robots rules, sitemap) and `iso.mjs` (isometric scene compiler).
- Add `launch`: launch-ready page audit, share cards rendered from source, demo media, channel-specific copy, a submission tracker and a launch-week readout.
- `web-design` keeps a `DESIGN.md` per project, measures references instead of eyeballing them, and adds a craft floor and a named anti-pattern catalogue.
- `deslop` adds a voice-profile procedure; `instrument` adds a starter event taxonomy; `ship` adds a gate-integrity list; `motion` adds a timing system and filmstrip verification.
- Shared scripts have one canonical copy in `shared/`; `bun run metadata` syncs them and `bun run check` rejects drift.
- Tests cover every script against local fixtures; CI runs on Node 22.

## 0.2.0

- Publish thirteen skills covering context, delivery planning, creative craft, analytics, discoverability, real product use, release, reporting and automation.
- Add a dependency-free Node.js installer on npm, with explicit agent, scope and skill selection, dry-run, conflict protection and safe replacement.
- Strengthen product/demo parity, interaction stability, repeated AI-product QA, telemetry redaction, cohort definitions and multi-agent ownership.
- Provide Claude Code and Codex metadata over one canonical, self-contained skill tree.
