// Live verification of the Gemini-backed critic. Run AFTER GEMINI_API_KEY is set on the deployment:
//   node scripts/verify-live-ai.js [baseUrl]
// Six tests (3 investigations x English/Arabic), each checked on 8 criteria. Failure modes (missing/invalid key, timeout,
// rate limit, invalid response, fallback) are covered by `npm test` against a mock provider, because they cannot be triggered safely on production.
// Criteria 6-8 are heuristics: the printed answers must still be READ by a human.
const base = (process.argv[2] || 'https://the-family-that-doesnt-exist.vercel.app').replace(/\/$/, '');
const IDS = ['c1-size', 'c2-age', 'c3-belonging'];
const TOPIC = {   // 7. "addresses the question": each answer must mention its own topic
  'c1-size': { en: /household|size|member|people|residents|count/i, ar: /أسرة|الأسرة|حجم|أفراد|عدد|سكان|نسمة/ },
  'c2-age': { en: /age|median|midpoint|older|younger/i, ar: /عمر|أعمار|الوسيط|أصغر|أكبر/ },
  'c3-belonging': { en: /close|belong|relationship|care|theme|measure/i, ar: /قرب|انتماء|علاقات|رعاية|موضوع|تقيس|قياس/ }
};
const UNCERTAIN = { en: /\b(not|cannot|can't|does not|do not|unknown|limit|only|interpretation|reasonable|might|may|presum|no figure|nor)\b/i, ar: /لا |غير|مجهول|حدود|قراءة|تفسير|من المرجّح|قد |فقط|ليس/ };
const FAMILY = { en: /\b(your|their|this|that|the)\s+(own\s+)?family\s+(is|has|have|are|lives|consists|includes|will|feels)\b|\bin your family\b|\bthis household (has|is|consists)\b/i, ar: /أسرتك|عائلتك|هذه الأسرة (تتكون|لديها|تضم|يعيش)|هذه العائلة (تتكون|لديها|تضم)/ };
const digits = t => String(t).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0);
const nums = t => (digits(t).match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/,/g, ''));

(async () => {
  const st = await (await fetch(base + '/api/status')).json();
  console.log('1. Live AI configured:', st.liveAI);
  if (!st.liveAI) { console.log('NOT CONFIGURED: the site is in labelled offline mode. See docs/AI_ACTIVATION.md.'); process.exitCode = 2; return; }
  const ev = await (await fetch(base + '/data/evidence.json')).json();
  const results = [];
  for (const id of IDS) for (const lang of ['en', 'ar']) {
    const claim = ev.claims.find(c => c.id === id), p = [];
    const resp = await fetch(`${base}/api/explain?claimId=${id}&lang=${lang}`);
    const r = resp.ok ? await resp.json() : {};
    const text = ['whatDataShows', 'whatMayBeInferred', 'whatItDoesNotShow', 'visitorQuestion'].map(k => r[k] || '').join(' ');
    const allowed = new Set(nums(JSON.stringify(claim) + claim.citationIds.map(c => JSON.stringify(ev.sources.find(s => s.id === c))).join(' ')));
    const checks = {
      '2 API responds (HTTP 200, mode live)': resp.ok && r.mode === 'live',
      '3 structure (4 text fields <=400 chars, verdict, citations)': ['whatDataShows', 'whatMayBeInferred', 'whatItDoesNotShow', 'visitorQuestion'].every(k => typeof r[k] === 'string' && r[k].length > 0 && r[k].length <= 400) && r.verdict === claim.verdict && Array.isArray(r.citationIds),
      '4 no unsupported statistics': nums(text).every(n => allowed.has(n)),
      '5 only approved citations': Array.isArray(r.citationIds) && r.citationIds.length > 0 && r.citationIds.every(c => claim.citationIds.includes(c)),
      '6 no specific family identified (heuristic)': !FAMILY[lang].test(text),
      '7 addresses the question (heuristic)': TOPIC[id][lang].test(text) && (lang === 'ar' ? /[؀-ۿ]/.test(text) : !/[؀-ۿ]/.test(text)),
      '8 communicates uncertainty (heuristic)': UNCERTAIN[lang].test(r.whatItDoesNotShow || '') && UNCERTAIN[lang].test(r.whatMayBeInferred || '')
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    results.push(failed.length === 0);
    console.log(`\n=== ${id} [${lang}] ${failed.length ? 'FAILED: ' + failed.join(' | ') : 'all 8 checks pass'}${r.flagged ? '  (model disagreed with verified verdict: flagged)' : ''}`);
    if (r.mode !== 'live') console.log(`  fell back to offline: reason=${r.reason}`);
    for (const k of ['whatDataShows', 'whatMayBeInferred', 'whatItDoesNotShow', 'visitorQuestion']) console.log(` ${k}: ${r[k]}`);
  }
  const ok = results.filter(Boolean).length;
  console.log(`\n${ok}/6 tests pass the automated checks. Now READ the answers: they must be defensible, specific to the assumption, and say nothing about any particular family.`);
  process.exitCode = ok === 6 ? 0 : 1;
})();
