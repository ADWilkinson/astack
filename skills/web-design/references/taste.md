# Keeping the user's taste

Every correction a user makes is a preference the agent did not have. If it is not written down, the next session repeats the mistake and the user corrects it again. This procedure turns a session's corrections into rules where the next agent reads them. Adapted from the `learn-taste` skill in [Emil Kowalski's skills](https://github.com/emilkowalski/skills) (MIT), paraphrased.

Use it when the user asks to remember design feedback, or when the same correction arrives twice. It covers the user's preferences, which need their approval before they become rules. Your own durable decisions (a new token, a rejected direction) still go into DESIGN.md as the skill describes, without this procedure.

## Rules

1. **Only the user's taste.** Each rule traces to something the user said, edited or confirmed. A rule added because it seems like good practice is the agent's taste, which is what was being corrected.
2. **Never invent a reason.** When the user gave none, propose one marked *inferred* and have it confirmed. A wrong reason gets extended to cases it does not fit.
3. **Propose, then write what is approved.** A wrong rule repeats in every later session, as the mistake would have.
4. **A check beats a sentence.** If a violation can be found by matching code (a banned value, a raw hex where a token exists), propose a lint rule, a token restriction or a test, and keep one line of prose for the reason.
5. **Write for an agent that was not here.** Name the class of component, the value, the token and the file. No "like the card from earlier".

## Procedure

1. **Collect.** Read the session from the first turn. Explicit corrections are the minority. Also look for a silent edit (the user changed `400` to `200` in a file you wrote), a repeated nudge ("smaller", "still too big", "ok": record where it landed), a revert or a rejected variant, and a confirmed choice a fresh agent would not repeat. Keep the user's words or the diff. Skip bugs, content for one screen and misunderstandings of the task.
2. **Filter.** Would a fresh agent building a different component here make the same mistake? If not, skip it. If an existing rule already says it, the rule failed: rewrite it stricter (a number, a token, "never") instead of adding a second. If an existing rule contradicts it, show both and let the user choose.
3. **Generalise to the class, not the instance or the universe.** "The pricing card gets a shadow" protects one card. "Never use borders" breaks inputs and tables. "Raised surfaces (cards, popovers, menus) use `shadow-raised`, never a solid border" is the rule. Then test it: reading only the rule and its reason, would an agent with no other context produce what the user wanted?
4. **Place it.** The project's `DESIGN.md`, wherever it keeps it, under the section the rule belongs to (Layout, Components or Copy in [the template](design-md-template.md); add a Surfaces, Type or Motion heading when none fits), with a dated line in its decisions log. If neither AGENTS.md nor CLAUDE.md points to DESIGN.md, propose the one line that does; a file no agent loads changes nothing.
5. **Report and wait.** Show the rules with the user's words beside each, the questions (each inferred reason, each unclear level), the conflicts, the check candidates and what was skipped. Write only what is approved, then show the diff. A new check that flags existing code is reported with its count; fixing those is a separate decision.

## Entry format

```md
## Components

- **Raised surfaces (cards, popovers, menus) use `shadow-raised`, never a solid border.**
  Why: a solid border makes a raised surface look flat and heavy; a semi-transparent shadow adapts to both themes.
  <!-- 2026-11-12: "no, semi-transparent shadow, not a border" -->
```

The comment keeps the date and the user's words, so a later conflict shows which rule is newer and what was said.

No corrections in the session is a valid result. Say so in one line.
