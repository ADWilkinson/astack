# Synthetic rate board

Run `node server.mjs`. It binds loopback and prints its URL. GET `/api/feed` reads
`src/feed.mjs`; its reference comes from settled fills, not an FX oracle.
GET `/sell` serves `public/sell.html` unchanged for every query string: there is no
client script to read or prefill parameters. Non-GET/HEAD requests return 405.
The process has no sessions, cookies, database, analytics store or external calls.

No board endpoint, authentication system or tests exist yet. Files called **new**
in a plan are proposed additions, rather than claims about existing source.
