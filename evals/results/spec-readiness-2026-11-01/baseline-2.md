**Task A: implementation should not start as written.** The supplied plan conflicts with observed source and behavior:

- `src/rates.mjs` does not exist.
- `/api/feed` contains a `settled-fills` reference and USD/GBP currencies, with no FX oracle or numeric rates.
- POST `/api/board` currently returns **405**, with `Allow: GET, HEAD`.
- `/sell?amount=100` leaves the amount empty; no script handles query parameters.
- Exact returning-visitor deduplication across processes requires stable identity and shared remembered state. Neither exists, and the stated constraints exclude the mechanisms needed to provide it.

The next action is to record these contract defects before choosing implementation slices. A coherent read-only projection is already specified in Task B. Prefilling needs an explicit query-handling change; exact visitor counting needs a compatible identity/state contract. Response schemas and tests cannot resolve those missing foundations.

**Task B: implementation can start.** The source supports the requested additive endpoint. The two files marked **new** are intentional additions, so their absence is expected.

Next actions:

1. Add the exact pure projection in `src/board.mjs`.
2. Add `/api/board` behind the existing global method guard, with JSON and `Cache-Control: no-store`; retain existing routes.
3. Add the specified Node tests using an isolated loopback server and no external calls.
4. Run `node --test tests/board.test.mjs`, then probe GET and HEAD on the changed local server. Verify the JSON, header, empty HEAD body, POST 405/Allow, unknown-route 404, and unchanged feed.
5. Deliver source only, with passing evidence; no release or publication.

Baseline evidence: feed GET returns the specified USD/GBP payload, board GET returns 404, board POST returns 405 with the required Allow header, and an unknown route returns 404. Post-change evidence remains to be collected.

**Task C: implementation can start immediately.** `public/sell.html` contains the exact `<title>Sell</title>` target, and the running `/sell` response confirms it.

Replace that title only. Then fetch `/sell` from the changed local server, confirm `<title>Sell USDC</title>`, and compare the heading and form against the baseline, including the empty amount and default GET behavior. Inspect the diff for only the requested replacement, then deliver source only. No separate plan or independent review is needed.

No files were changed; all probes used the supplied loopback fixture.
