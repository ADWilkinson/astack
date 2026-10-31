---
name: web-design
description: "Design product-specific web UI, responsive layouts and motion; keep the direction in DESIGN.md. Use for new pages, redesigns, generic-looking UI, janky animation, awkward phone behavior or layouts stressed by long or empty data."
---

# Web design

Generated UI fails in predictable ways: the same fonts, the same violet gradient, cards inside cards, a centred hero with three icon tiles, decoration standing in for a point of view. This skill replaces defaults with decisions, then checks the rendered result.

`<skill-dir>` below means this skill's own folder. Run its scripts from the project root so output lands in the project, not in the installed skill.

## 1. Load or create the design context

Look for `DESIGN.md` (also `docs/DESIGN.md`, `BRAND.md`). If it exists, read it before touching UI; its tokens and rules win over your taste. If it does not exist and the work is more than a small fix, create one from [the template](references/design-md-template.md) by reading the code: real tokens from the CSS/Tailwind config, real fonts, real components. Mark anything you inferred as inferred.

Update DESIGN.md when a session makes a durable decision (a new token, a rejected direction and why). This is how the next session avoids regressing to defaults.

## 2. Decide the direction

**Name the mode first.** It sets how much boldness the surface earns:

- **Persuade** (landing, pricing, launch pages): the design is the product; commit to a point of view.
- **Operate** (app UI, dashboards, settings, forms): precision and restraint; familiar patterns earn their place; brand lives in details.
- **Read** (docs, articles, changelogs): structure for comprehension, then make reading pleasant.
- **Experience** (portfolios, showcases, games): the work leads; the interface recedes.

**Refining or redesigning?** Refining keeps the current identity, copy and behaviour and improves within it. Redesigning keeps the product's facts and function but replaces the look entirely. Never split the difference by polishing a look you mean to discard.

**Then plan in two passes before writing code.**

Pass one, the plan:

- **Job**: who is here, what they need first, the next action.
- **Palette**: four to six named hex values, with where the accent is allowed.
- **Type**: faces and their roles, the scale, numerals.
- **Layout**: a sentence and a rough ASCII wireframe; alignment stated.
- **The one bold thing**: the single memorable element. Everything around it stays quiet.

Pass two, the generic test: would you have produced this plan for any similar brief? Check it against the [current AI-default looks](references/anti-patterns.md#the-current-defaults), which change over time. Cream background with a serif display and a terracotta accent, near-black with one acid accent, and broadsheet hairlines are today's clusters, as purple gradients were last year's. If a part of the plan matches a default the brief did not ask for, replace it and write down what you changed and why. The brief's own words always win, including when it asks for one of these looks.

Choose from the subject's world: its materials, places, artefacts and vocabulary. A dog walker's site and an analyst's dashboard should not be able to swap palettes.

When the user gives references, study them properly: [reference study](references/reference-study.md) pulls computed styles from the live sites so you borrow relationships (scale, rhythm, density), not surface decoration.

## 3. Build in the product's system

- Use existing tokens, primitives and components. Add a token before adding a one-off value.
- Real content only: real names, long names, real numbers, empty data. Never lorem ipsum, never invented metrics to fill a layout. Before calling a data-driven screen done, run it on [worst-case data](references/worst-case-data.md): the longest plausible name, an unbreakable email, a count of 1 and of 1,284, an empty list, a missing avatar.
- Design the states with the screen: loading, empty, error, success, disabled, overflow. An empty state that looks broken is a bug. A loading state is the loaded layout with content replaced by bones of the same boxes. A shorter stack of bars is a jump. Mark the stable regions and compare the two states: [loading](references/loading.md).
- Hide what has nothing to say. Zero rows, zero balances and empty charts become an honest empty state or disappear; no walls of zeros.
- Headers are labels. A subtitle that re-explains the header gets deleted.
- Mobile is its own layout: reorder by priority, use horizontal snap rails where desktop uses grids, `dvh`/`svh` not `100vh`, inputs at 16px or larger, tap targets 44px. Anything people use on a phone gets the [mobile baseline](references/mobile.md): no tap flash, hover gated to real pointers, press feedback on touch, safe areas, no zoom on focus.

Hold the line on the [craft floor](references/craft-floor.md) while building, not as a final pass. For any animation or transition, read [motion](references/motion.md) first: decide whether it should animate at all (never for keyboard or high-frequency actions), ease-out and under 300ms for UI, press feedback and origin-aware popovers, interruptible transitions, only `transform` and `opacity`, reduced motion handled, and watched as a filmstrip. The same reference diagnoses janky animation by cause.

## 4. Look at it

```sh
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/page --full          # 390 + 1440, light + dark
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/page --widths 320,390,768,1440 --themes light
node <skill-dir>/scripts/shoot.mjs http://localhost:3000/page --click '[aria-controls=menu]' --widths 390
node <skill-dir>/scripts/shoot.mjs loading.html --shift loaded.html --widths 390 --themes light
```

Open every screenshot and actually read it. Then read the lines under each capture. `shoot.mjs` reports inputs under 16px, a viewport that disables zoom, `:hover` rules outside `@media (hover: hover)`, selectable controls on a narrow viewport, and a missing tap-highlight reset. None of those show up as overflow. A `--shift` run exits 1 when a marked region or the document scroll height moved, and exits 2 when nothing was marked. Exit 2 is not a pass. Then go through, in this order:

1. **First read**: squint. Is the most important thing the most prominent? Can you tell what this is and what to do in three seconds?
2. **Broken**: overflow, clipped text, overlapping layers, stranded words, invisible focus, dark mode contrast. `shoot.mjs` flags several of these; check its output.
3. **Hierarchy and rhythm**: more space above a heading than below it; consistent gaps within groups, larger between groups; one primary action per view.
4. **Generic**: run `deslop`'s scan or check [anti-patterns](references/anti-patterns.md). Would a stranger guess this product from a screenshot with the logo removed?
5. **Craft**: alignment to the pixel at 2x, optical balance of icons and text, tabular numbers in columns.
6. **Stress**: the worst-case fixture at the real container width, 320px and 200% text. Touch details need a real phone; say so if you had none.

Then gate what eyes miss. When the project has a DESIGN.md or the brief supplies copy, run:

```sh
node <skill-dir>/scripts/render-gate.mjs http://localhost:3000/page --size 390x844 --size 1440x900 --design DESIGN.md --expect "Exact headline"
```

It fails on a brand face that silently fell back, supplied copy that changed, text clipped by its box or cropped by the canvas, and painted colours or faces outside the tokens. Exit 2 means it could not check, which is not a pass.

Fix the worst problem, re-shoot, repeat. Compare against references at the same width and state. Two or three full loops is normal for new work.

For new pages, redesigns and anything public, finish with a verdict from the [review rubric](references/review-rubric.md): three gates, six areas scored 1 to 5 with evidence, ship / fix / rework. When an independent agent is available, it scores from its own renders, not yours.

## 5. Finish

Report the screens and states you inspected (widths, themes), the gate results and rubric verdict, the decisions you made, and anything not inspected (authenticated states you could not reach, real data you did not have). Commit DESIGN.md changes with the UI.

## Rules

- The user's brief and DESIGN.md beat this skill. If the brand is purple gradients, it is purple gradients.
- No new UI library, icon set or font for a local change.
- Do not invent social proof, testimonials, logos, user counts or "trusted by".
- Do not fake liveness: no pulsing "Live" dots, tickers or activity unless backed by real data at that cadence ("Updates every 10s" when that is true).
- Never collapse distinct states (submitted, accepted, confirmed) into one success tick.
