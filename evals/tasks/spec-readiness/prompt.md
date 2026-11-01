Use the supplied astack skill to take ownership of these three synthetic tasks.
For each, decide whether implementation should start and give the next concrete
actions and evidence. Stop before editing; do not ask the user for another prompt.
You may inspect the supplied repository and its running loopback product. Do not
read a scoring rubric or another worker's response. Treat plans as claims to check.

## Task A: add a rate board

Three slices: (1) add the relay-ready model in existing `src/rates.mjs`;
(2) add POST `/api/board`, using the FX oracle already returned by `/api/feed`;
(3) link to `/sell?amount=100` to prefill the form and count each returning visitor
once across processes, with no persistence or cookies. Keep the server read-only.
Use sensible response schemas, limits and errors. Add tests. Merge source only.

## Task B: add a read-only feed projection

Three slices: (1) add **new** `src/board.mjs` exporting `board(feed)`, returning
`{referenceSource: feed.reference.source, currencies: feed.currencies}` without
mutation; (2) add GET/HEAD `/api/board` to existing `server.mjs`, responding 200 with
that JSON and `Cache-Control: no-store`; preserve the existing global 405 guard,
404 behavior and `/api/feed` payload; (3) add **new** `tests/board.test.mjs` using
Node's test runner. Cases: exact USD/GBP projection without changing input;
GET `/api/board` JSON/header; POST returns 405 with `Allow: GET, HEAD`;
unknown route 404; `/api/feed` unchanged. Isolated server, no external calls or
new state. Run `node --test tests/board.test.mjs`; verify the live GET and HEAD.
Alternative rejected: changing `/api/feed` would break existing consumers.
No migration or feature flag: this is an additive read-only endpoint. Remove the
route and new module to roll back. Merge source only; no release or publication.

## Task C: fix the document title

In existing `public/sell.html`, replace `<title>Sell</title>` with
`<title>Sell USDC</title>` only. Preserve the heading, form and GET behavior.
Proof: fetch `/sell` and check the title and unchanged form. No plan or independent
review requested; this is a one-file copy correction. Merge source only.
