# Switching on live AI (Google Gemini) — about 3 minutes, done by the account owner

The site is already safe to run **without** a key (answers are badged "Offline curated text · not AI"). To use a real model:

1. Open https://aistudio.google.com/apikey → **Create API key** (free tier is enough; do not enable billing). Copy it once. Never paste it into chat, GitHub or a repo file.
2. Add it to Vercel as a Sensitive Production variable named `GEMINI_API_KEY`:
   - Dashboard: https://vercel.com/mam-e31b/the-family-that-doesnt-exist/settings/environment-variables (Production only, mark Sensitive), **or**
   - Terminal: `npx vercel@latest env add GEMINI_API_KEY production` (prompts without echoing).
3. Redeploy (Deployments → ⋯ → Redeploy, or `npx vercel@latest deploy --prod --yes`) — variables apply to new deployments only.
4. Verify: `node scripts/verify-live-ai.js` (6 tests × 8 checks against production) and read the printed answers. On the site, "Ask the evidence critic" must show **Live AI · source-bound**.

Optional: `GEMINI_MODEL` (default `gemini-3.5-flash-lite`, the cheapest stable Flash-family model in Google's model docs as of 2026-11-27; Google lists it at about $0.30 / $2.50 per 1M input / output tokens on the paid tier and free of charge on the free tier — re-check before relying on it, model IDs change).

## Privacy note (free tier)
Google states that free-tier API content may be used to improve its products. The only content this site sends is the project's own fixed prompt and its approved source excerpts. **No visitor text, no personal data** ever reaches the model (the endpoint accepts only a claim id and a language code).

## Why cost stays bounded
- `/api/explain` accepts only `GET ?claimId=<one of 3>&lang=<en|ar>`; anything else is a 400 before any model call.
- A successful answer is cached in the function (24 h) and at Vercel's edge (`s-maxage=86400`); simultaneous duplicate requests share one call. At most one model call per claim × language (6) per cache window and instance.
- 12 s timeout, `maxOutputTokens` 800, minimal thinking level, JSON-schema constrained output, each text field ≤ 400 characters.
- Failures and flagged answers are never edge-cached; on any failure the visitor sees labelled offline text.
- The per-IP limiter is best-effort only (in-memory, not shared across serverless instances). The real backstops are the cache and Google's free-tier quota. If you ever enable billing, set a budget alert in Google Cloud.

## What the code refuses to show
The model's answer is discarded (offline text shown, with the reason) if: it is not valid JSON; a citation is not in that claim's approved list; a field is empty or too long; **a number appears that is not in that claim's approved material**. If the model disagrees with the hand-verified verdict, the verified verdict is shown and the answer is flagged. The prompt tells the model that source text is data (not instructions) and never to describe or infer anything about an individual family.
