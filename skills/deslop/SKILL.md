---
name: deslop
description: "Write or revise public copy, UI and code without generated tells, preserving facts and voice. Use for \"deslop\", \"sounds like AI\", tightening prose, user emails, removing generic UI or learning a voice from real writing."
---

# Deslop

Slop is what fills the space where a decision should be. The fix is the decision, not a synonym. Apply this while writing, not only afterwards.

`<skill-dir>` below means this skill's own folder. Run its scripts from the project root so output lands in the project, not in the installed skill.

## 1. Scan

```sh
node <skill-dir>/scripts/slop-scan.mjs src/ content/ README.md          # prose, UI and code tells with file:line
node <skill-dir>/scripts/slop-scan.mjs landing.md --only prose --min medium
node <skill-dir>/scripts/slop-scan.mjs . --fail-on high                    # use as a CI or pre-merge gate
```

Every hit is a lead. Read it in context and decide: cut, replace with the specific thing, or keep (with a reason if it will be reviewed). Do not chase a zero count; a word list cannot judge a sentence.

## 2. Fix prose

Work through [prose patterns](references/prose-patterns.md). The ones that matter most:

1. **Say the specific thing.** "Seamless syncing" becomes "Syncs every 5 minutes, and on save". If you cannot name the specific, the claim is empty: delete it. <!-- slop-scan: ignore-line -->
2. **Lead with the answer.** Cut throat-clearing ("It's worth noting", "When it comes to", "In today's…"). <!-- slop-scan: ignore-line -->
3. **No staged reveals.** "Here's the thing:", "The result?", "That's it.", "Not a X. Not a Y. A Z." State it. <!-- slop-scan: ignore-line -->
4. **No reflexive contrast.** "It's not just X, it's Y" only when someone actually believes X. <!-- slop-scan: ignore-line -->
5. **Vary rhythm by meaning,** not by formula: no triads by default, no one-line paragraph closers, no em dash as the default joint.
6. **Keep what carries information:** numbers, names, caveats that change a decision, the author's odd but deliberate phrases.
7. **One caveat, where it applies.** Not a disclaimer paragraph, not hedges stacked ("may potentially").

## 3. Fix UI

Run the scan on components and check the rendered page against `web-design`'s anti-patterns if installed. The usual repairs: delete the eyebrow labels and explainer subtitles; replace gradient text with solid ink; remove glass, glows and sparkles; flatten nested cards; give CTAs real verbs; remove emoji from interface copy. Re-shoot and look after removing structure: a deleted container can take a needed grouping with it.

## 4. Fix code

See the code section of [prose patterns](references/prose-patterns.md). Delete comments that narrate the next line; keep comments that say why. Remove empty catches and defensive checks on trusted paths; let unexpected errors surface. Inline pass-through wrappers with one caller. Remove speculative options nobody passes. Never "simplify" away validation, auth, error context or required compatibility. Run the tests.

## 5. Match a voice

If the project has a voice file (`VOICE.md`, `docs/voice.md`, or a section of DESIGN.md), follow it over these defaults. If the user wants writing in their voice and none exists, build one with [voice profile](references/voice-profile.md) from their real, accepted writing, not from one draft they disliked.

## 6. Verify

Re-read the whole piece start to finish (sentence fixes create new repetition). Check that no fact, number, link or required disclosure was lost or added. Re-run the scan. For UI, re-shoot. Then report the material changes in a few lines, not a findings essay.

## Rules

- Never invent a stronger claim to replace a vague one. Vague and true becomes specific and true, or gets cut.
- Translations get the same pass in every locale: fluency, length fit at 390px, exact domain terms.
- Quotes, legal text and other people's words are not yours to deslop.
- If the user's own style uses a "tell" deliberately, it stays.
