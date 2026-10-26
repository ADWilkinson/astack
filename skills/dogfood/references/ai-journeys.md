# AI journeys

Model-backed features fail differently from forms: the same input can pass once and fail on the next run, and a correct-looking answer can sit on top of a failed tool call.

## Build a small case set

Five to ten cases from the product's actual promise:

- the core useful answer or action
- missing or ambiguous context
- a follow-up that depends on the previous turn
- something the product should refuse or hand off
- any step that needs confirmation before a real effect (sending, buying, deleting)

Use synthetic records and test accounts for anything that writes. Decide the number of repeats and the cost limit before running.

## Run them properly

- Fresh conversation per case, except cases that test follow-ups.
- Repeat the important cases (three runs is a reasonable floor). Keep failures and interrupted runs in the record.
- Record the model/provider configuration and revision, so a later run is comparable.
- After a fix, replay the original failing case under the same conditions and label the new revision.

## Check each layer

| Layer | Look at |
| --- | --- |
| Stream | Events arrive in order, finish, and errors surface instead of hanging. |
| Tool call | Which tool, which arguments, what it returned, and whether the effect really happened (the row exists, the email was sent). |
| Model answer | The raw answer before display formatting: correct, complete, no claims beyond what the tools returned. |
| What renders | What the user actually sees: citations, links, buttons, truncation, markdown. |

A clean stream is not a good answer. A good answer does not prove its claimed write happened. Before retrying a case whose effect is uncertain, check the destination.

## Inside someone else's assistant

When the product is a tool or app inside another assistant (a connector, an MCP server, a GPT), test from that host with the intended account state. Compare the tool's result with the host's final answer, and follow the link the answer gives. Hosts drop results, rewrite URLs and reformat content; record those separately from your own bugs, but do not count the journey as passing until the user can actually get the result.

## Keep it private

Traces contain user data and prompts. Keep raw traces in the project's private storage, strip secrets, and share summaries. Do not turn on broad production logging just to debug.

## Report

Cases run, repeats per case, pass/fail per layer, fixes with the replay result, and what remains uncertain. One green run is not reliability.
