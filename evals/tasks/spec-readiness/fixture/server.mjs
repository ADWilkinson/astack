import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { feed } from "./src/feed.mjs";

// Synthetic read-only product. No accounts, external services or persistence.
const server = createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    return response.end();
  }
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/api/feed") {
    response.writeHead(200, { "Content-Type": "application/json" });
    return response.end(JSON.stringify(feed));
  }
  if (path === "/sell") {
    response.writeHead(200, { "Content-Type": "text/html" });
    return response.end(readFileSync(new URL("./public/sell.html", import.meta.url)));
  }
  response.writeHead(404);
  response.end();
});
server.listen(Number(process.env.PORT ?? 0), "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${server.address().port}`);
});
