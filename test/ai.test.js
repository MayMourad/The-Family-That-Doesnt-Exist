// Exercises the live-AI code path (Gemini via @google/genai) against a LOCAL MOCK of the Gemini REST API. It does NOT call Google.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
delete process.env.GEMINI_API_KEY;   // the in-process handler test below must see "no key"

let mock, srv, srvNoKey, srvLimit, mode = 'good', hits = 0, sawThinking = 0, sawKey = '';
const gem = o => ({ candidates: [{ content: { role: 'model', parts: [{ text: typeof o === 'string' ? o : JSON.stringify(o) }] }, finishReason: 'STOP' }] });
const good = (id = 'c2-age') => ({ claimId: id, verdict: 'limited', whatDataShows: 'SCAD reports a median age of 33 years in 2024.', whatMayBeInferred: 'About half of residents are younger.', whatItDoesNotShow: 'Any household’s ages.', visitorQuestion: 'Whose age is 33?', citationIds: ['scad-pop-2024'] });
const get = (port, qs) => fetch(`http://localhost:${port}/api/explain?${qs}`);
const ask = async (port, id, lang = 'en') => (await get(port, `claimId=${id}&lang=${lang}`)).json();

before(async () => {
  mock = http.createServer((req, res) => { hits++; let body = ''; req.on('data', d => body += d); req.on('end', () => {
    sawKey = req.headers['x-goog-api-key'] || '';
    res.setHeader('content-type', 'application/json');
    if (!/:generateContent$/.test(req.url.split('?')[0])) { res.statusCode = 404; return res.end('{}'); }
    const cfg = (() => { try { return JSON.parse(body).generationConfig || {}; } catch { return {}; } })();
    if (cfg.thinkingConfig) sawThinking++;
    if (mode === 'down') { res.statusCode = 500; return res.end(JSON.stringify({ error: { code: 500, message: 'boom', status: 'INTERNAL' } })); }
    if (mode === 'ratelimit') { res.statusCode = 429; return res.end(JSON.stringify({ error: { code: 429, message: 'quota', status: 'RESOURCE_EXHAUSTED' } })); }
    if (mode === 'badkey') { res.statusCode = 400; return res.end(JSON.stringify({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } })); }
    if (mode === 'nothinking' && cfg.thinkingConfig) { res.statusCode = 400; return res.end(JSON.stringify({ error: { code: 400, message: 'thinking level not supported', status: 'INVALID_ARGUMENT' } })); }
    if (mode === 'timeout') return setTimeout(() => { try { res.end('{}'); } catch {} }, 4000);
    const m = mode === 'badcite' ? { ...good(), citationIds: ['made-up'] } : mode === 'mismatch' ? { ...good(), verdict: 'supported' }
      : mode === 'invented' ? { ...good(), whatDataShows: 'The median age is 33 and 72% of families have five members.' } : mode === 'prose' ? 'no json here'
      : mode === 'fenced' ? '```json\n' + JSON.stringify(good()) + '\n```' : good();
    res.end(JSON.stringify(gem(m))); }); });
  await new Promise(r => mock.listen(3301, r));
  const env = { ...process.env, GEMINI_BASE_URL: 'http://localhost:3301', GEMINI_TIMEOUT_MS: '1500' };
  srv = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...env, PORT: '3302', GEMINI_API_KEY: 'AIzaSyTESTKEYFORMOCKONLY1234567890', AI_IP_LIMIT: '1000' }, stdio: 'ignore' });
  srvNoKey = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...env, PORT: '3303', GEMINI_API_KEY: '' }, stdio: 'ignore' });
  srvLimit = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...env, PORT: '3304', GEMINI_API_KEY: 'AIzaSyTESTKEYFORMOCKONLY1234567890', AI_IP_LIMIT: '2' }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1000));
});
after(() => { srv.kill(); srvNoKey.kill(); srvLimit.kill(); mock.close(); });

// Each scenario uses a different (claim, lang) pair because successful answers are cached per pair (a feature under test).
test('valid model reply: live, structure kept, verified verdict kept, key sent only to the provider', async () => { mode = 'good'; const r = await ask(3302, 'c2-age', 'en'); assert.equal(r.mode, 'live'); assert.equal(r.verdict, 'limited'); assert.equal(r.flagged, false); assert.ok(r.whatMayBeInferred); assert.equal(sawKey, 'AIzaSyTESTKEYFORMOCKONLY1234567890'); assert.ok(sawThinking >= 1, 'minimal thinking requested'); });
test('missing API key -> labelled offline fallback, no provider call', async () => { hits = 0; const r = await ask(3303, 'c1-size', 'en'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'no-api-key'); assert.equal(hits, 0); assert.equal((await (await fetch('http://localhost:3303/api/status')).json()).liveAI, false); });
test('invalid API key -> offline fallback with reason invalid-key', async () => { mode = 'badkey'; const r = await ask(3302, 'c1-size', 'en'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'invalid-key'); });
test('provider timeout -> offline fallback with reason timeout, quickly', async () => { mode = 'timeout'; const t0 = Date.now(); const r = await ask(3302, 'c1-size', 'ar'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'timeout'); assert.ok(Date.now() - t0 < 3900, 'must not wait for the slow provider'); });
test('provider rate limit (429) -> offline fallback with reason rate-limited', async () => { mode = 'ratelimit'; const r = await ask(3302, 'c3-belonging', 'en'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'rate-limited'); });
test('provider outage (500) -> offline fallback', async () => { mode = 'down'; const r = await ask(3302, 'c3-belonging', 'ar'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'provider-error'); });
test('invalid AI responses: non-JSON, bad citation, invented number -> offline (validation)', async () => {
  mode = 'prose'; let r = await ask(3302, 'c2-age', 'ar'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'validation');
  mode = 'badcite'; r = await ask(3302, 'c2-age', 'ar'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'validation');
  mode = 'invented'; r = await ask(3302, 'c2-age', 'ar'); assert.equal(r.mode, 'offline'); assert.equal(r.reason, 'validation');
});
test('a model that rejects thinkingConfig is retried once without it, then validated normally', async () => { mode = 'nothinking'; hits = 0; const r = await ask(3302, 'c1-size', 'ar'); assert.equal(r.mode, 'live'); assert.equal(hits, 2, 'one rejected call + one retry'); });
test('markdown-fenced JSON is accepted when valid', async () => { mode = 'fenced'; const r = await ask(3302, 'c2-age', 'ar'); assert.equal(r.mode, 'live'); });
test('model disagreeing with the verified verdict is flagged; the verified verdict is shown', async () => { mode = 'mismatch'; const r = await ask(3302, 'c1-size', 'en'); assert.equal(r.mode, 'live'); assert.equal(r.flagged, true); assert.equal(r.verdict, 'unsupported'); });
test('strict allow-list: unknown claim, language, extra or repeated parameters, wrong method', async () => {
  for (const qs of ['claimId=zzz&lang=en', 'claimId=c1-size&lang=fr', 'claimId=c1-size&lang=en&x=1', 'claimId=c1-size&claimId=c2-age&lang=en', 'lang=en']) assert.equal((await get(3302, qs)).status, 400, qs);
  assert.equal((await fetch('http://localhost:3302/api/explain', { method: 'POST', body: '{}' })).status, 405);
});
test('cost cap: 60 mixed requests cause few model calls; cached answers cause none', async () => {
  mode = 'good'; hits = 0; const ids = ['c1-size', 'c2-age', 'c3-belonging']; const reqs = [];
  for (let i = 0; i < 60; i++) reqs.push(ask(3302, ids[i % 3], i % 2 ? 'ar' : 'en')); await Promise.all(reqs);
  assert.ok(hits <= 6, `model calls: ${hits}`);   // at most one per claim x language, even for a simultaneous burst
  hits = 0; for (let i = 0; i < 20; i++) await ask(3302, 'c2-age', 'en'); assert.equal(hits, 0, 'cached answers must not call the model again');
});
test('API key never appears in any served file or response', async () => { for (const f of ['/', '/app.js', '/art.js', '/data/evidence.json', '/api/status', '/api/explain?claimId=c2-age&lang=en', '/api/explain?claimId=c1-size&lang=ar']) assert.ok(!(await (await fetch('http://localhost:3302' + f)).text()).includes('AIzaSyTESTKEYFORMOCKONLY1234567890'), f); });
test('Vercel handler: offline answers get a short edge cache, rejects get none', async () => {
  const handler = require('../api/explain');
  const run = (qs) => new Promise(r => { const res = { h: {}, statusCode: 200, setHeader(k, v) { this.h[k] = v; }, end(b) { r({ s: this.statusCode, h: this.h, b: JSON.parse(b) }); } }; handler({ method: 'GET', url: '/api/explain?' + qs, headers: {} }, res); });
  const off = await run('claimId=c1-size&lang=en'); assert.equal(off.b.mode, 'offline'); assert.match(off.h['cache-control'], /s-maxage=60/);
  assert.equal((await run('claimId=c1-size&lang=en&junk=1')).h['cache-control'], 'no-store');
});
test('per-IP limiter (best effort) trips on repeated uncached calls and falls back to offline', async () => { mode = 'good'; const r1 = await ask(3304, 'c2-age', 'en'), r2 = await ask(3304, 'c2-age', 'ar'), r3 = await ask(3304, 'c1-size', 'en'); assert.equal(r1.mode, 'live'); assert.equal(r2.mode, 'live'); assert.equal(r3.mode, 'offline'); assert.equal(r3.reason, 'rate-limited'); });
