// Vercel serverless function: GET /api/explain?claimId=<approved id>&lang=<en|ar>
// GET + strict parameters let Vercel's edge cache serve repeat answers without re-calling the model.
const ai = require('../lib/ai');
module.exports = async (req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('allow', 'GET'); res.setHeader('cache-control', 'no-store'); return res.end(JSON.stringify({ error: 'method not allowed' })); }
  const q = new URL(req.url, 'http://x').searchParams;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
  const r = await ai.explain(q, ip);
  res.statusCode = r.status; res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', r.maxAge > 0 ? `public, s-maxage=${r.maxAge}, stale-while-revalidate=3600` : 'no-store');
  res.end(JSON.stringify(r.json));
};
