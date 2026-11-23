// Vercel serverless function: GET /api/status -> { liveAI: boolean } (never exposes the key)
const ai = require('../lib/ai');
module.exports = (req, res) => { res.setHeader('cache-control', 'no-store'); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(ai.status())); };
