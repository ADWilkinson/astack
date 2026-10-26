# Tidepool launch notes

- Launching tomorrow 9am UK on X and Show HN. Site deploys from `public/` to https://tidepool.example.
- Facts: Go, single ~9 MB binary, SQLite, checks every 30s, alerts after 2 consecutive failures, SMS via the user's own Twilio account, HTTP/TCP/TLS-expiry checks, custom-domain status page, MIT, v0.9.
- 3 beta users so far (friends). No paid plan. Built because email alerts got lost in my inbox during an outage.
- To preview locally: `python3 -m http.server 8000 -d public`
