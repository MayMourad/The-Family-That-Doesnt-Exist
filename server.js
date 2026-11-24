// Zero-dependency local server: static files from public/ + the shared AI endpoint (lib/ai.js).
// Run: node server.js   (optional: ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_BASE_URL, PORT)
const http = require('http');
const fs = require('fs');
const path = require('path');
const ai = require('./lib/ai');

const PORT = process.env.PORT || 3000;
const BASE = path.join(__dirname, 'public');
const MIME = { '.woff2': 'font/woff2', '.txt': 'text/plain', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/status') return send(res, 200, ai.status());
  if (url.pathname === '/api/explain') {
    if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
    const r = await ai.explain(url.searchParams, req.socket.remoteAddress);
    return send(res, r.status, r.json);
  }
  const p = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(BASE, p));
  if (!file.startsWith(BASE)) return send(res, 403, 'forbidden', 'text/plain');
  fs.readFile(file, (err, data) => err ? send(res, 404, 'not found', 'text/plain') : send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream'));
}).listen(PORT, () => console.log(`http://localhost:${PORT}  live AI: ${ai.KEY ? 'ON (' + ai.MODEL + ')' : 'OFF (offline curated mode)'}`));
