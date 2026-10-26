# Prose and code patterns

<!-- slop-scan: ignore-file (this file quotes the patterns it teaches) -->

Ids match `slop-scan.mjs` where it detects them. Patterns marked (manual) need reading; no regex finds them reliably.

## Vocabulary

| Id | Examples | Repair |
| --- | --- | --- |
| inflated-verb | unlock, unleash, supercharge, elevate, empower, revolutionise, streamline, harness the power, delve | The literal action: "send", "compare", "see", "cut from 3 steps to 1". |
| empty-adjective | seamless, effortless, robust, powerful, innovative, cutting-edge, world-class, game-changing | The property it stands for, with a number if you have one, or nothing. |
| model-vocabulary | tapestry, testament to, realm, landscape, ever-evolving, navigate the complexities, embark, myriad, plethora, meticulous, pivotal, nestled, bustling, vibrant | Plain words. Usually the sentence improves by deletion. |
| metaphor-noun | north star, flywheel, moat, force multiplier, table stakes, single pane of glass | Name the mechanism. |
| filler (manual) | simply, just, really, actually, truly, quietly, genuinely; "real" as an intensifier | Delete. |
| plain-swaps (manual) | utilise→use, commence→start, facilitate→help, prior to→before, in order to→to, at this point in time→now | Swap. |

## Structure and rhythm

| Id | Pattern | Repair |
| --- | --- | --- |
| throat-clearing | "It's worth noting", "When it comes to", "In today's…", "Let's dive in", "At the end of the day" | Start at the point. |
| not-just-but | "It's not just X, it's Y"; "more than just" | State Y. Keep the contrast only if a reader holds belief X. |
| staged-reveal | "Here's the thing:", "The result?", "That's it.", "What if…?", "Simple." | State the thing. |
| negative-listing | "Not a tool. Not a toy. A platform." | Say what it is and does. |
| aphorism | "Ship fast. No excuses." used as decoration | Cut, or make it a real instruction. |
| triad-density | Lists of three by reflex ("fast, simple and secure") | Keep the items that carry information; two is fine, one is often better. |
| em-dash-density | Em dashes as the default joint | Full stops, commas, colons, brackets. Some writers use dashes well; density is the tell. |
| closer-line (manual) | A one-line paragraph that restates the section with a flourish | Delete. |
| bold-lead-density | Every bullet "**Label:** sentence" | Plain bullets, a table, or prose. |
| emoji-bullet | ✅ 🚀 ✨ leading lines | Words, or real list structure. |
| document-narration (manual) | "This guide will walk you through…", "In this section we…" | Just do it. |
| heading-echo (manual) | First sentence repeats the heading | Start with new information. |

## Inflation and evasion

| Id | Pattern | Repair |
| --- | --- | --- |
| copula-avoidance | "serves as a", "stands as a", "functions as a" | "is a". |
| ing-rider | ", highlighting the…", ", underscoring its…", ", cementing…" | End the sentence; make the claim separately if it is real. |
| significance-inflation | "marks a pivotal moment", "plays a crucial role", "cannot be overstated" | The concrete effect. |
| false-agency | "the data reveals", "the numbers tell us" | The numbers, then your conclusion. |
| vague-attribution | "experts say", "studies show", "many believe" | Name and link the source, or cut. |
| intensifier | "quietly powerful", "genuinely useful", "the real magic" | Show the property. |
| arrow-chain | "idea → build → ship" in prose | A sentence. |
| cutoff-disclaimer | "as of my last update", "my training data" | Delete. |

## Claims

| Id | Pattern | Repair |
| --- | --- | --- |
| unsupported (manual) | "Trusted by thousands", "the fastest", "guaranteed" | Source and date, or remove. |
| borrowed-metric (manual) | Someone else's volume, users or rating presented as yours | Label whose number it is, or remove. |
| status-inflation (manual) | "Ready", "done", "live" without saying what was checked | Say what passed, where, and what is unverified. |
| hedge-stack | "may potentially", "could possibly" | One qualifier that matches the real uncertainty. |
| assistant-residue | "I hope this helps", "Great question", "As an AI", "Feel free to reach out" | Delete. |

## Formatting

- Headings only where a reader would navigate to them. Three short paragraphs do not need three headings.
- Bold only for what a skimmer must not miss; one or two per screen.
- Sentence case for headings and buttons.
- Straight quotes in code and technical text; curly quotes only if the site's typography uses them consistently.
- Numbers as numerals; currency without trailing zeros where the product does that ("£9", not "£9.00").

## Code

| Id | Pattern | Repair |
| --- | --- | --- |
| narrating-comment | `// Loop through users` above a loop | Delete; keep comments that explain why or warn. |
| placeholder-code | `// TODO: implement`, "rest of code here" | Implement or remove the path. Never ship. |
| swallowed-error | `catch (e) {}`, `except: pass` | Handle a known failure explicitly, or let it throw. |
| defensive-clutter (manual) | Null checks and try/catch around values the types and callers guarantee | Remove; validate at the boundary once. |
| type-dodges (manual) | `any`, `as unknown as`, non-null `!` to silence errors | Fix the type. |
| wrapper-layers (manual) | Functions that only forward to another with the same arguments | Inline when private; keep real boundaries (public API, auth, instrumentation). |
| speculative-config (manual) | Options, flags and abstractions with one caller | Remove until there is a second caller. |
| mirror-tests (manual) | Tests that restate the implementation (mock everything, assert the mock was called) | Test behaviour at a boundary. |

Check callers before removing anything that looks unused; a text search does not prove an exported function, route or hook has no consumers.
