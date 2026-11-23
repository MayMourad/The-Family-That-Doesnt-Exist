// Shared, evidence-bound AI logic used by BOTH server.js (local) and api/*.js (Vercel).
const fs = require('fs');
const path = require('path');
const KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const EVIDENCE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'evidence.json'), 'utf8'));
const SOURCES = Object.fromEntries(EVIDENCE.sources.map(s => [s.id, s]));
const CLAIMS = Object.fromEntries(EVIDENCE.claims.map(c => [c.id, c]));

// ---- rate limit: 10 AI calls / 10 min / IP, in memory, no personal data logged
const hits = new Map();
function limited(ip) {
  const now = Date.now(), w = (hits.get(ip) || []).filter(t => now - t < 600000);
  w.push(now); hits.set(ip, w); return w.length > 10;
}

function offline(claim, lang) {
  return {
    mode: 'offline', claimId: claim.id, verdict: claim.verdict,
    whatDataShows: claim.whatDataShows[lang], whatMayBeInferred: claim.whatMayBeInferred[lang], whatItDoesNotShow: claim.whatItDoesNotShow[lang],
    visitorQuestion: claim.visitorQuestion[lang], citationIds: claim.citationIds, flagged: false
  };
}

function buildPrompt(claim, lang) {
  const srcs = claim.citationIds.map(id => {
    const s = SOURCES[id];
    return `- id=${s.id} | ${s.publisher} | ${s.title} | geography: ${s.geography} | period: ${s.period} | findings: ${JSON.stringify(s.findings)} | limitation: ${s.limitation}`;
  }).join('\n');
  return {
    system: 'You are an evidence-aware critic inside an art installation about the limits of statistics. Use ONLY the approved sources given. Never add numbers, sources or facts not listed. Never describe any real family and never claim to know the feelings of any family, relationships or experiences. whatDataShows = KNOWN (only what the sources state); whatMayBeInferred = INFERRED (a cautious interpretation, explicitly labelled as interpretation); whatItDoesNotShow = UNKNOWN. Reply with ONE JSON object and nothing else: {"claimId":string,"verdict":"supported"|"limited"|"unsupported","whatDataShows":string,"whatMayBeInferred":string,"whatItDoesNotShow":string,"visitorQuestion":string,"citationIds":string[]}. Each string max 320 characters. Language: ' + (lang === 'ar' ? 'Modern Standard Arabic' : 'English') + '.',
    user: `Assumption being examined: "${claim.assumption.en}"\nApproved sources:\n${srcs}\nExplain what the sources measure (known), what may reasonably be inferred with its limits (inferred), what they do not justify (unknown), and one respectful question for the visitor.`
  };
}

async function liveAI(claim, lang) {
  const { system, user } = buildPrompt(claim, lang);
  const r = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(20000)
  });
  if (!r.ok) throw new Error('provider ' + r.status);
  const j = await r.json();
  const text = (j.content || []).map(b => b.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  return validate(JSON.parse(m[0]), claim);
}

function validate(o, claim) {
  const str = v => typeof v === 'string' && v.length > 0 && v.length <= 400;
  if (!o || !str(o.whatDataShows) || !str(o.whatItDoesNotShow) || !str(o.whatMayBeInferred) || !str(o.visitorQuestion)) throw new Error('schema');
  if (!Array.isArray(o.citationIds) || o.citationIds.length > 4 || !o.citationIds.every(id => SOURCES[id] && claim.citationIds.includes(id))) throw new Error('citations');
  if (!['supported', 'limited', 'unsupported'].includes(o.verdict)) throw new Error('verdict');
  return {
    mode: 'live', claimId: claim.id,
    verdict: claim.verdict,                       // verified status always wins
    flagged: o.verdict !== claim.verdict,         // model disagreed -> flag for review
    whatDataShows: o.whatDataShows, whatMayBeInferred: o.whatMayBeInferred, whatItDoesNotShow: o.whatItDoesNotShow,
    visitorQuestion: o.visitorQuestion, citationIds: o.citationIds
  };
}


// Returns { status, json }. rawBody is the request body text (max 1 KB); ip is used only for the in-memory rate limit.
async function explain(rawBody, ip) {
  if (rawBody.length > 1024) return { status: 413, json: { error: 'too large' } };
  let body; try { body = JSON.parse(rawBody); } catch { return { status: 400, json: { error: 'bad json' } }; }
  const claim = body && CLAIMS[body.claimId];
  const lang = body && body.lang === 'ar' ? 'ar' : 'en';
  if (!claim) return { status: 400, json: { error: 'unknown claim' } };
  if (!KEY) return { status: 200, json: { ...offline(claim, lang), reason: 'no-api-key' } };
  if (limited(ip)) return { status: 200, json: { ...offline(claim, lang), reason: 'rate-limited' } };
  try { return { status: 200, json: await liveAI(claim, lang) }; }
  catch (e) { return { status: 200, json: { ...offline(claim, lang), reason: 'provider-error' } }; }
}
const status = () => ({ liveAI: !!KEY });
module.exports = { explain, status, KEY, MODEL };
