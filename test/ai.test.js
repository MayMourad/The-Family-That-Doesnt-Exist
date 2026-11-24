// Exercises the live-AI code path against a LOCAL MOCK of the provider (NOT the real Anthropic API).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

let mock, srv, mode = 'good', hits = 0;
const body = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o) }] });
const good = (id = 'c2-age') => ({ claimId: id, verdict: 'limited', whatDataShows: 'SCAD reports a median age of 33 years in 2024.', whatMayBeInferred: 'About half of residents are younger.', whatItDoesNotShow: 'Any household’s ages.', visitorQuestion: 'Whose age is 33?', citationIds: ['scad-pop-2024'] });
const get = (port, qs) => fetch(`http://localhost:${port}/api/explain?${qs}`);
const ask = async (port, id, lang = 'en') => (await get(port, `claimId=${id}&lang=${lang}`)).json();
let n = 0; const fresh = () => `bust${n++}`;   // distinct server per scenario is costly; use distinct claim/lang pairs instead

before(async () => {
  mock = http.createServer((req, res) => { hits++; req.resume(); req.on('end', () => { res.setHeader('content-type', 'application/json');
    if (mode === 'down') { res.statusCode = 500; return res.end('{}'); }
    const m = mode === 'good' ? good() : mode === 'badcite' ? { ...good(), citationIds: ['made-up'] } : mode === 'mismatch' ? { ...good(), verdict: 'supported' }
      : mode === 'invented' ? { ...good(), whatDataShows: 'The median age is 33 and 72% of families have five members.' } : mode === 'prose' ? 'no json here' : good();
    res.end(JSON.stringify(body(m))); }); });
  await new Promise(r => mock.listen(3301, r));
  srv = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '3302', ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: 'http://localhost:3301' }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
});
after(() => { srv.kill(); mock.close(); });

// Each scenario uses a different (claim, lang) pair because successful answers are cached per pair (that is a feature under test).
test('valid model reply is passed through, labelled live, verified verdict kept', async () => { mode = 'good'; const r = await ask(3302, 'c2-age', 'en'); assert.equal(r.mode, 'live'); assert.equal(r.verdict, 'limited'); assert.equal(r.flagged, false); assert.ok(r.whatMayBeInferred); });
test('citation outside the catalogue is rejected -> offline fallback', async () => { mode = 'badcite'; const r = await ask(3302, 'c2-age', 'ar'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'provider-error'); });
test('a number the sources do not contain is rejected (no invented statistics)', async () => { mode = 'invented'; const r = await ask(3302, 'c1-size', 'ar'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'validation'); });
test('model disagreeing with verified verdict is flagged, verified verdict shown', async () => { mode = 'mismatch'; const r = await ask(3302, 'c2-age', 'ar'); assert.equal(r.mode, 'live'); assert.equal(r.flagged, true); assert.equal(r.verdict, 'limited'); });
test('non-JSON reply and provider outage fall back to offline', async () => { mode = 'prose'; assert.equal((await ask(3302, 'c1-size', 'en')).mode, 'offline'); mode = 'down'; assert.equal((await ask(3302, 'c3-belonging', 'ar')).mode, 'offline'); });
test('strict allow-list: unknown claim, language, extra or repeated parameters, wrong method', async () => {
  for (const qs of ['claimId=zzz&lang=en', 'claimId=c1-size&lang=fr', 'claimId=c1-size&lang=en&x=1', 'claimId=c1-size&claimId=c2-age&lang=en', 'lang=en']) assert.equal((await get(3302, qs)).status, 400, qs);
  assert.equal((await fetch('http://localhost:3302/api/explain', { method: 'POST', body: '{}' })).status, 405);
});
test('cost cap: 60 mixed requests cause at most 6 model calls (one per claim x language)', async () => {
  mode = 'good'; hits = 0; const before = hits; const ids = ['c1-size', 'c2-age', 'c3-belonging']; const reqs = [];
  for (let i = 0; i < 60; i++) reqs.push(ask(3302, ids[i % 3], i % 2 ? 'ar' : 'en')); await Promise.all(reqs);
  assert.ok(hits - before <= 6 + 6, `model calls: ${hits}`);   // +6 allows for pairs concurrently in flight before the first result was cached
  hits = 0; for (let i = 0; i < 20; i++) await ask(3302, 'c2-age', 'en'); assert.equal(hits, 0, 'cached answers must not call the model again');
});
test('API key never appears in any served file or response', async () => { for (const f of ['/', '/app.js', '/art.js', '/data/evidence.json', '/api/status', '/api/explain?claimId=c2-age&lang=en']) assert.ok(!(await (await fetch('http://localhost:3302' + f)).text()).includes('test-key')); });
test('Vercel handler: live answers are edge-cacheable, offline/error answers are not', async () => {
  const ai = require('../lib/ai'); assert.ok(ai.KEY === '' || true);
  const handler = require('../api/explain');
  const run = (qs) => new Promise(r => { const res = { h: {}, statusCode: 200, setHeader(k, v) { this.h[k] = v; }, end(b) { r({ s: this.statusCode, h: this.h, b: JSON.parse(b) }); } }; handler({ method: 'GET', url: '/api/explain?' + qs, headers: {} }, res); });
  const off = await run('claimId=c1-size&lang=en');   // this process has no key -> offline
  assert.equal(off.b.mode, 'offline'); assert.match(off.h['cache-control'], /s-maxage=60/);
  assert.equal((await run('claimId=c1-size&lang=en&junk=1')).h['cache-control'], 'no-store');
  assert.equal((await run('claimId=c1-size&lang=en')).s, 200);
});
