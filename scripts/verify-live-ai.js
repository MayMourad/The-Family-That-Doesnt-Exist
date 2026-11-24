// Run AFTER ANTHROPIC_API_KEY is set on the deployment:  node scripts/verify-live-ai.js [baseUrl]
// Calls the real endpoint for all three investigations in both languages, checks structure, and prints the answers for HUMAN review.
const base = (process.argv[2] || 'https://the-family-that-doesnt-exist.vercel.app').replace(/\/$/, '');
const ids = ['c1-size', 'c2-age', 'c3-belonging'];
(async () => {
  const st = await (await fetch(base + '/api/status')).json();
  console.log('liveAI configured:', st.liveAI);
  if (!st.liveAI) { console.log('NOT CONFIGURED: the site is in labelled offline mode. See docs/AI_ACTIVATION.md.'); process.exitCode = 2; return; }
  const ev = await (await fetch(base + '/data/evidence.json')).json();
  let failures = 0;
  for (const id of ids) for (const lang of ['en', 'ar']) {
    const r = await (await fetch(`${base}/api/explain?claimId=${id}&lang=${lang}`)).json();
    const claim = ev.claims.find(c => c.id === id);
    const problems = [];
    if (r.mode !== 'live') problems.push(`mode=${r.mode} reason=${r.reason}`);
    if (r.verdict !== claim.verdict) problems.push('verdict differs from verified status');
    if (!r.citationIds || !r.citationIds.every(c => claim.citationIds.includes(c))) problems.push('citation outside catalogue');
    for (const k of ['whatDataShows', 'whatMayBeInferred', 'whatItDoesNotShow', 'visitorQuestion']) if (!r[k] || r[k].length > 400) problems.push('bad field ' + k);
    if (r.flagged) problems.push('model disagreed with verified verdict (flagged)');
    console.log(`\n=== ${id} [${lang}] ${problems.length ? 'PROBLEMS: ' + problems.join('; ') : 'structure OK'}`);
    for (const k of ['whatDataShows', 'whatMayBeInferred', 'whatItDoesNotShow', 'visitorQuestion']) console.log(` ${k}: ${r[k]}`);
    failures += problems.length;
  }
  console.log(`\nStructural problems: ${failures}. Now READ the answers: each should address its assumption, contain only figures from the sources, express uncertainty, and say nothing about any particular family.`);
  process.exitCode = failures ? 1 : 0;
})();
