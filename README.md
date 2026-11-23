# The Family That Doesn't Exist · العائلة التي لا وجود لها

Interactive digital artwork for UAE Year of Family 2026 (Digital Arts — Web Design).
Created by May Ahmed Mourad · Grade 12 · ADNOC Schools Madinat Zayed (MZ) — independent student work, not an official Year of Family, ADEK or ADNOC Schools product.

## Run
```
node server.js            # Node 18+; zero dependencies, no install step  (npm start also works)
npm test                  # server/AI tests against a LOCAL MOCK of the provider
# optional live AI (server-side only; the key never reaches the browser):
$env:ANTHROPIC_API_KEY="sk-..."        # PowerShell;  set ANTHROPIC_API_KEY=... in cmd
$env:ANTHROPIC_MODEL="claude-sonnet-5-5"   # optional (this is the default)
```
Open http://localhost:3000. Deploy to any Node host (Render, Railway, Fly, VPS) and set `ANTHROPIC_API_KEY` as a host secret. It is not a static-only site, because `/api/explain` runs on the server. `?motion=reduce` forces the reduced-motion layout (QA aid).

## Structure
- `public/art.js` — the poster renderer ("The Impossible Portrait"): one canvas painter for the on-screen living poster and the print export
- `public/app.js`, `index.html`, `style.css` — UI, state, EN/AR, **paper-peel evidence reveal**, export
- `public/fonts/` — bundled OFL fonts (+ licences)
- `public/data/evidence.json` — approved sources (EN/AR) + 3 claims with Known / Inferred / Unknown text (EN/AR)
- `server.js` — static server + `/api/explain` · `test/ai.test.js` — automated server tests
- `docs/` — EVIDENCE, DESIGN_REFERENCES, SUBMISSION (judging script)

## The paper-peel (Evidence Lens only)
Each assumption is a printed butter-paper sheet covering its evidence. Scrolling after opening a sheet scrubs the peel: the cover's edge (a noise-displaced clip-path) retreats while a rolled "back of paper" band with a cast shadow rides the edge. Native CSS/JS only — no animation library, no pinning, no scroll trapping. A "Lift the paper" button does the same peel for keyboard users and when the page cannot scroll further. Under `prefers-reduced-motion` the cover is omitted and the evidence is shown at once. Uncovering evidence never marks it as reviewed: **Ask the evidence critic** and **Challenge this assumption** stay explicit actions, and only a challenge changes the artwork.

## Poster export
Final screen → **A3 print**: 3508 × 4960 px PNG with a 300 DPI header (~25 MB because of paper grain) or **web size** 1400 px. Same investigation path → same poster (seeded by the order of challenged claims; edition number derived from it). Discreet creator credit is printed in the poster footer (EN right-aligned, AR mirrored left).

## How the AI is bounded
Client sends only `{claimId, lang}`. Server picks the approved sources and asks the model for JSON `{verdict, whatDataShows (KNOWN), whatMayBeInferred (INFERRED), whatItDoesNotShow (UNKNOWN), visitorQuestion, citationIds}`; validates it; rejects any citation outside that claim's catalogue entries; forces the hard-coded verified verdict (a disagreeing model is flagged, not trusted); renders links from the local catalogue. No key, rate-limit (10/10 min/IP) or provider error → curated text labelled **"Offline curated text · not AI"**. A stale answer is dropped on language switch rather than shown in the wrong language.

## Feature status
| Feature | Status |
|---|---|
| Five-act journey, nav, replay, skip, guided demo (~90 s, includes peel + AI step) | implemented · demo run end-to-end (see docs/SUBMISSION.md for timing) |
| Scroll-scrubbed paper-peel, 3 sheets | implemented · scrub mapping, finish, completion gating, reduced-motion path tested; real-finger touch and real-wheel scroll not tested (pane limits) |
| Known / Inferred / Unknown on every sheet and in the AI box | implemented · checked EN + AR |
| Bright editorial redesign preserved | unchanged except the evidence sheet internals |
| Creator credits | footer (EN/AR), sources panel, poster footer |
| EN/AR, RTL, language switch keeps progress | implemented · checked mid-peel; sources now localized |
| Poster export A3/300 DPI + web | implemented · EN and AR files rendered and footers inspected; browser save dialog not exercised |
| Server endpoint + validation + fallback | `npm test`: 7/7 pass against a local mock |
| **Real Anthropic API call** | implemented · **NOT tested** (no key available). Requires credentials |
| Keyboard | native buttons/links, skip link, visible focus rule, no non-native clickables; full manual Tab walk-through not completed |
| Screen reader, Lighthouse, Firefox/Safari | **not performed** |
| TypeScript / lint / production build | **none exist** — plain JS, no build step; `node --check` passes |
| Deployment | **not deployed** |

## Known limitations
- Only 3 claims; no UAE-wide figures (UAE.Stat returned 403 to automated fetch).
- Poster renders cost ~18–65 ms per frame in the test pane while animating (nothing when idle); weak phones may drop frames during the fracture.
- `prefers-reduced-motion` was exercised through the `?motion=reduce` flag, not the OS setting.
- Arabic copy is mine; a native speaker should review before submission.
