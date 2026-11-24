# Switching on live AI safely (5 minutes, done by the account owner)

The site is already safe to run **without** a key (labelled "Offline curated text · not AI"). To make the critic genuinely use a model:

1. **Anthropic Console** → create a *new, dedicated* API key and set a **monthly spend limit** (a few dollars is plenty; see "Cost" below). Never paste the key into chat, GitHub or a file in this repo.
2. **Vercel** → project `the-family-that-doesnt-exist` → *Settings → Environment Variables* → add `ANTHROPIC_API_KEY` for **Production** (mark it Sensitive). Optional: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).
   CLI alternative: `npx vercel env add ANTHROPIC_API_KEY production` (it prompts for the value without echoing it).
3. **Redeploy** (Deployments → ⋯ → Redeploy), because environment variables apply to new deployments only.
4. **Verify**: `node scripts/verify-live-ai.js` — exercises all 3 investigations × EN/AR against production and prints the answers. Read them. Then open the site, ask the critic: the badge must say **"Live AI · source-bound"**.
5. *Optional extra protection*: Vercel → Firewall → add a rate-limit rule for path `/api/explain` (e.g. 30 requests / minute / IP).

## Why the cost is bounded
- `/api/explain` accepts only `GET ?claimId=<one of 3>&lang=<en|ar>`; anything else is a 400 and never reaches the model. No visitor text is ever sent to the model.
- A successful answer is cached in the function (24 h) **and** at Vercel's edge (`s-maxage=86400`), so the model is called at most once per claim × language (6 combinations) per cache window, per region/instance, however many visitors there are.
- 12 s provider timeout, 600 max output tokens, strict output validation, offline fallback on any failure.
- Failures and flagged answers are never edge-cached.
- Worst case is therefore a few dozen small calls per day. The per-IP limiter in the code is best-effort only (in-memory, not shared across serverless instances) — the Anthropic spend limit is the real backstop.

## What the code refuses to show
The model's answer is discarded (offline text is shown instead, with the reason) if: JSON is invalid; a citation is not in that claim's approved list; any field is empty/too long; **any number appears that is not in the claim's approved material**. If the model disagrees with the hand-verified verdict, the verified verdict is shown and the answer is flagged.
