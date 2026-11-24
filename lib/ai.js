// Shared, evidence-bound AI logic used by BOTH server.js (local) and api/*.js (Vercel).
const KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const EVIDENCE = require('../public/data/evidence.json');   // static require so the bundler always includes it
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
    system: 'You are an evidence-aware critic inside an art installation about the limits of statistics. Use ONLY the approved sources given. Never add numbers, sources or facts not listed: every number you write must appear in the approved sources below. Do not infer anything about any individual household, its size, the ages of its members or its relationships from aggregate figures. Never describe any real family and never claim to know the feelings of any family, relationships or experiences. whatDataShows = KNOWN (only what the sources state); whatMayBeInferred = INFERRED (a cautious interpretation, explicitly labelled as interpretation); whatItDoesNotShow = UNKNOWN. Reply with ONE JSON object and nothing else: {"claimId":string,"verdict":"supported"|"limited"|"unsupported","whatDataShows":string,"whatMayBeInferred":string,"whatItDoesNotShow":string,"visitorQuestion":string,"citationIds":string[]}. Each string max 320 characters. Language: ' + (lang === 'ar' ? 'Modern Standard Arabic' : 'English') + '.',
    user: `Assumption being examined: "${claim.assumption.en}"\nApproved sources:\n${srcs}\nExplain what the sources measure (known), what may reasonably be inferred with its limits (inferred), what they do not justify (unknown), and one respectful question for the visitor.`
  };
}

async function liveAI(claim, lang) {
  const { system, user } = buildPrompt(claim, lang);
  const r = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 600, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error('provider ' + r.status);
  const j = await r.json();
  const text = (j.content || []).map(b => b.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  return validate(JSON.parse(m[0]), claim);
}

// Anti-fabrication guard: every number in the model's text must already appear in the approved material for this claim.
const digits = t => String(t).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0);
const nums = t => (digits(t).match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/,/g, ''));
function allowedNumbers(claim) {
  const base = JSON.stringify(claim) + claim.citationIds.map(id => JSON.stringify(SOURCES[id])).join(' ');
  return new Set(nums(base));
}
function validate(o, claim) {
  const str = v => typeof v === 'string' && v.length > 0 && v.length <= 400;
  if (!o || !str(o.whatDataShows) || !str(o.whatItDoesNotShow) || !str(o.whatMayBeInferred) || !str(o.visitorQuestion)) throw new Error('schema');
  if (!Array.isArray(o.citationIds) || o.citationIds.length > 4 || !o.citationIds.every(id => SOURCES[id] && claim.citationIds.includes(id))) throw new Error('citations');
  if (!['supported', 'limited', 'unsupported'].includes(o.verdict)) throw new Error('verdict');
  const ok = allowedNumbers(claim);
  if (nums([o.whatDataShows, o.whatMayBeInferred, o.whatItDoesNotShow, o.visitorQuestion].join(' ')).some(n => !ok.has(n))) throw new Error('unsupported-number');
  return {
    mode: 'live', claimId: claim.id,
    verdict: claim.verdict,                       // verified status always wins
    flagged: o.verdict !== claim.verdict,         // model disagreed -> flag for review
    whatDataShows: o.whatDataShows, whatMayBeInferred: o.whatMayBeInferred, whatItDoesNotShow: o.whatItDoesNotShow,
    visitorQuestion: o.visitorQuestion, citationIds: o.citationIds
  };
}


// ---- cost protection (layered): strict allow-list -> in-memory result cache (<= 6 model calls per warm instance per day)
// -> edge cache via Cache-Control (api/explain.js) -> per-IP limiter (best effort only, see README) -> Anthropic spend limit.
const cache = new Map(); const TTL = 24 * 3600 * 1000;
// query: URLSearchParams. Returns { status, json, maxAge } where maxAge > 0 means "safe for the CDN to cache".
async function explain(query, ip) {
  const keys = [...query.keys()];
  if (keys.some(k => k !== 'claimId' && k !== 'lang') || keys.length !== new Set(keys).size) return { status: 400, json: { error: 'unknown parameter' }, maxAge: 0 };
  const lang = query.get('lang'), claim = CLAIMS[query.get('claimId')];
  if (!claim || (lang !== 'en' && lang !== 'ar')) return { status: 400, json: { error: 'unknown claim or language' }, maxAge: 0 };
  if (!KEY) return { status: 200, json: { ...offline(claim, lang), reason: 'no-api-key' }, maxAge: 60 };
  const ck = claim.id + '|' + lang, hit = cache.get(ck);
  if (hit && Date.now() - hit.t < TTL) return { status: 200, json: hit.json, maxAge: hit.flagged ? 0 : 86400 };
  if (limited(ip)) return { status: 200, json: { ...offline(claim, lang), reason: 'rate-limited' }, maxAge: 0 };
  try {
    const json = await liveAI(claim, lang); cache.set(ck, { t: Date.now(), json, flagged: json.flagged });
    return { status: 200, json, maxAge: json.flagged ? 0 : 86400 };
  } catch (e) { return { status: 200, json: { ...offline(claim, lang), reason: e.message === 'unsupported-number' ? 'validation' : 'provider-error' }, maxAge: 0 }; }
}
const status = () => ({ liveAI: !!KEY });
module.exports = { explain, status, KEY, MODEL };
