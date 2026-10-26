# Review and release

## Gate integrity

A green check obtained by weakening the check is a failed ship. Never do these to get green; if one is genuinely right, it is a separate, explained change the owner approves:

| Id | Move |
| --- | --- |
| G1 | `.skip`, `.only`, `xit`, `@pytest.mark.skip`, commenting out a test |
| G2 | Deleting a failing test or assertion |
| G3 | Loosening an assertion (`toEqual` to `toBeTruthy`, widening tolerances, snapshot update without reading the diff) |
| G4 | Raising timeouts, retry counts or flaky-test allowances to mask a slow or racy path |
| G5 | Lowering coverage, lint, type or bundle-size thresholds |
| G6 | `// @ts-ignore`, `eslint-disable`, `# type: ignore`, `as any` to silence a real error |
| G7 | `--no-verify`, `[skip ci]`, disabling a required workflow, changing branch protection |
| G8 | Catching and discarding the error the test was catching |
| G9 | A PR that edits its own review or gate policy and then relies on the edit |

Before pushing, grep your diff for these: `git diff origin/main...HEAD | grep -nE '\.skip|\.only|xit\(|ts-ignore|eslint-disable|no-verify|skip ci|timeout'`.

## GitHub rate limits

`gh pr view`, `gh pr checks` and `pr-state.mjs` use GraphQL. When it is exhausted (`gh api rate_limit --jq .resources.graphql`), `pr-state.mjs` falls back to REST for checks and reports that review threads could not be read. Wait for the reset with one background command rather than retrying in a loop.

## Diagnosing CI

1. Confirm the failure is on the current head (`pr-state.mjs` reads checks on the exact head commit).
2. Read the first real error in the log, not the last line. `gh run view <run-id> --log-failed | head -200`.
3. Classify: product bug, wrong test expectation, environment (missing secret, service down, runner disk), or flake.
4. Reproduce locally with the same command CI runs (read the workflow file).
5. Fix the cause. For a flake, find the race or the external dependency; a rerun is a stopgap you name as such.
6. When unrelated jobs fail together (timeouts across the board), suspect the runner or a shared service before your code.

External status checks (Vercel, Netlify, third-party reviewers) have no Actions run id; open their details URL.

## Review threads

- Fetch every thread, including replies and outdated ones. Summaries and "latest review" views miss things.
- For each actionable comment: fix, push, reply with what changed (one line), then resolve if allowed.
- For a comment you disagree with: reply with the concrete reason. Do not resolve silently.
- Automated reviewers are input, not authority. Verify their claim against the code before acting.
- Batch fixes into as few pushes as practical; each push restarts CI.

## Release proof by target

| Target | Proof |
| --- | --- |
| PR-ready | `pr-state.mjs` exit 0 on current head; screenshots for UI; acceptance noted in the PR body. |
| Merged | Merge commit on the base branch; post-merge CI on that commit green. |
| Staging / production | Deployment for that commit succeeded; `verify-live.mjs` finds the commit or the changed content at the real URL; changed behaviour exercised there. |

Serving proof comes from the target itself: a version endpoint, a response header, the changed content. A local file with the expected SHA, a "deployment succeeded" message, a healthy process or a preview URL are narrower evidence. Caches (CDN, service workers, ISR) can serve the old build after a successful deploy; `verify-live.mjs` busts query-keyed caches and reports the cache headers it saw; a CDN or ISR cache that ignores the query string can still serve the old page, so check those headers.

## Exposing the revision (recommended)

Make every app answer "what are you running?":

- Next.js: `app/api/version/route.ts` returning `{ sha: process.env.VERCEL_GIT_COMMIT_SHA }` (or your platform's equivalent).
- Any server: an `x-app-version` response header set from the build's commit.
- Static sites: write `/version.json` at build time.

Then `verify-live.mjs --expect <sha>` works without guessing.
