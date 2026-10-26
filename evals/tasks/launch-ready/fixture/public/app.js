document.getElementById("root").innerHTML = `
  <header><strong>Tidepool</strong><a href="https://github.com/example/tidepool">GitHub</a></header>
  <main>
    <h1>Self-hosted uptime checks that text you, not your inbox</h1>
    <p>Tidepool pings your sites every 30 seconds from a single Go binary and sends an SMS through your own Twilio account when something is down for two checks in a row.</p>
    <pre>docker run -p 8080:8080 ghcr.io/example/tidepool</pre>
    <ul>
      <li>One 9 MB binary, SQLite storage, no external services besides Twilio</li>
      <li>HTTP, TCP and TLS-expiry checks</li>
      <li>Status page you can put on your own domain</li>
    </ul>
    <p>MIT licensed. Free forever. Version 0.9.</p>
  </main>`;
