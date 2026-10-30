# Source selection

## Which source answers what

| Need | Go to | Watch for |
| --- | --- | --- |
| Why the task exists | Originating thread or issue, including all replies | The ask changing halfway down the thread |
| What was decided | Latest explicit human message; linked decision docs | Agent summaries presented as decisions |
| How it works now | Current code on the default branch; the running product | Docs and README drift; feature flags |
| Why it works that way | `git log -S`, `git blame`, the PR that introduced it | Squash merges hiding the reasoning in the PR body |
| What users experience | The live product with a real account; support tickets | Admin or seeded accounts that see a different product |
| How much / how often | An analytics query whose definition you can read | Test traffic, bots, changed event names, partial windows |
| Who owns it | CODEOWNERS, recent committers, the thread's assignee | Owners who have left |

## Multi-source tasks

1. List the sources in the order you will read them and why each one is needed.
2. Read the primary source fully before skimming secondary ones. A half-read thread produces confident wrong context.
3. Note dates. A three-week-old decision followed by a two-day-old correction is one decision: the correction.
4. Keep scope and workspace boundaries. Do not pull another team's or another client's material into this task because search returned it.
5. When a source is unavailable (no access, tool missing), write that as a gap. Do not substitute a public article for a private decision.

## Signs the context is wrong

- A material unknown is hidden. If no remaining uncertainty changes the next step, say "Open: none material" and proceed.
- The brief repeats the prompt. You read nothing that changed the work.
- A number appears without project, population, filter and window.
- A "decided" item has no link or date.
