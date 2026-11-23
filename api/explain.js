// Vercel serverless function: POST /api/explain  (same logic as the local server via lib/ai.js)
const ai = require('../lib/ai');
module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store'); res.setHeader('x-content-type-options', 'nosniff');
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('allow', 'POST'); return res.end(JSON.stringify({ error: 'method not allowed' })); }
  const raw = typeof req.body === 'string' ? req.body : req.body ? JSON.stringify(req.body) : '';
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
  const r = await ai.explain(raw, ip);
  res.statusCode = r.status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(r.json));
};
