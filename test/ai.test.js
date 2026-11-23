// Exercises the live-AI code path against a LOCAL MOCK of the provider (not the real Anthropic API).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

let mock, srv, mode = 'good';
const body = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o) }] });
const good = { claimId: 'c2-age', verdict: 'limited', whatDataShows: 'a', whatMayBeInferred: 'b', whatItDoesNotShow: 'c', visitorQuestion: 'd?', citationIds: ['scad-pop-2024'] };
const ask = (port, claimId, extra = {}) => fetch(`http://localhost:${port}/api/explain`, { method: 'POST', body: JSON.stringify({ claimId, lang: 'en', ...extra }) }).then(r => r.json());

before(async () => {
  mock = http.createServer((req, res) => { req.resume(); req.on('end', () => { res.setHeader('content-type', 'application/json');
    if (mode === 'down') { res.statusCode = 500; return res.end('{}'); }
    res.end(JSON.stringify(body(mode === 'good' ? good : mode === 'badcite' ? { ...good, citationIds: ['made-up'] } : mode === 'mismatch' ? { ...good, verdict: 'supported' } : mode === 'prose' ? 'no json here' : good))); }); });
  await new Promise(r => mock.listen(3301, r));
  srv = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '3302', ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: 'http://localhost:3301' }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
});
after(() => { srv.kill(); mock.close(); });

test('valid model reply is passed through, labelled live, verified verdict kept', async () => { mode = 'good'; const r = await ask(3302, 'c2-age'); assert.equal(r.mode, 'live'); assert.equal(r.verdict, 'limited'); assert.equal(r.flagged, false); assert.equal(r.whatMayBeInferred, 'b'); });
test('citation outside the catalogue is rejected -> offline fallback', async () => { mode = 'badcite'; const r = await ask(3302, 'c2-age'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'provider-error'); });
test('model disagreeing with verified verdict is flagged, verified verdict shown', async () => { mode = 'mismatch'; const r = await ask(3302, 'c2-age'); assert.equal(r.mode, 'live'); assert.equal(r.flagged, true); assert.equal(r.verdict, 'limited'); });
test('non-JSON reply and provider outage fall back to offline', async () => { mode = 'prose'; assert.equal((await ask(3302, 'c2-age')).mode, 'offline'); mode = 'down'; assert.equal((await ask(3302, 'c2-age')).mode, 'offline'); });
test('unknown claim and oversized input are refused', async () => { mode = 'good'; const r = await fetch('http://localhost:3302/api/explain', { method: 'POST', body: JSON.stringify({ claimId: 'zzz' }) }); assert.equal(r.status, 400); const big = await fetch('http://localhost:3302/api/explain', { method: 'POST', body: 'x'.repeat(3000) }); assert.equal(big.status, 413); });
test('API key never appears in any served file', async () => { for (const f of ['/', '/app.js', '/art.js', '/data/evidence.json']) assert.ok(!(await (await fetch('http://localhost:3302' + f)).text()).includes('test-key')); });
test('rate limit trips after 10 live calls', async () => { mode = 'good'; let last; for (let i = 0; i < 12; i++) last = await ask(3302, 'c1-size'); assert.equal(last.reason, 'rate-limited'); });
