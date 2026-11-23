# Submission package (draft)

**Title:** The Family That Doesn't Exist · **Arabic:** العائلة التي لا وجود لها
**Category:** Digital Arts — Web Design · **Theme:** UAE Year of Family 2026

**Description (EN):** An interactive artwork asks an AI-style system to draw "the average family" from public statistics. A confident glass-like portrait appears. As visitors examine its assumptions against hand-checked public sources, it fractures and becomes a field of artistic possibilities. The work argues that data can describe a population but not everything that makes a family.

**الوصف (AR):** عمل تفاعلي يطلب من نظام ذكي «رسم العائلة المتوسطة» من الإحصاءات العامة، فيظهر مجسَّم واثق. وكلما فحص الزائر افتراضاته أمام مصادر عامة روجعت يدوياً، يتصدّع المجسَّم ويتحول إلى حقل من الإمكانات الفنية. يقول العمل إن البيانات تصف المجتمع لكنها لا تخبرنا بكل ما يجعل العائلة عائلة.

**AI role:** an evidence-bound critic. Server-side, schema-validated, citations restricted to the catalogue, verified verdict overrides the model, labeled offline fallback. (Live mode requires an API key and was not tested in this build.)
**Method:** see docs/EVIDENCE.md. **Creator:** May Ahmed Mourad · Grade 12 · ADNOC Schools Madinat Zayed (MZ) / مي أحمد مراد · الصف الثاني عشر · مدارس أدنوك مدينة زايد (credited in the footer, sources panel and poster footer; no institutional endorsement is implied).
**Technical summary:** Node server, vanilla JS, a single canvas renderer (halftone, torn paper, overprint) shared by the on-screen poster and the A3 / 300 DPI export, SVG filters, native View Transitions.
Dimensions, team and administrative fields: not supplied — fill in yourself.

**Suggested screenshots:** hero; portrait with notice; one card with the mask lifted; mid-fracture (one claim challenged, annotation visible); constellation; final screen; Arabic final screen; A3 print PNG.

## 90-second judging demo
Press **Guided demo (≈90 s)** to run it hands-free (measured ≈ 87 s plus a closing pause), or follow it manually:
1. **0:00 — The question.** Hero: "Draw the average family." The print on the right is the machine's confident answer. Point out FIG. 0 and the "illustrative hypothesis" label.
2. **0:05 — Begin the experiment.** The portrait is one grey halftone bust on a strict grid, labelled "not a measured or representative household".
3. **0:12 — Evidence Lens, sheet 1.** Open "How many people?". The assumption is printed on butter paper. **Scroll** (or press *Lift the paper*): the paper curls off and reveals **Known / Inferred / Unknown** — the Abu Dhabi 2024 figure and what it cannot say.
4. **0:25 — The AI critic.** *Ask the evidence critic*. Note the badge: "Live AI · source-bound" with a key, or "Offline curated text · not AI" without. It only reads the approved sources.
5. **0:32 — Challenge.** *Challenge this assumption*: figures separate, a stamp "NOT ESTABLISHED · HOUSEHOLD SIZE" is printed, the print starts to slice apart.
6. **0:40 — Sheets 2 and 3** (age, closeness): lift, challenge. Colour enters; hand-drawn ribbons replace the measured grid.
7. **1:00 — The Certainty Fracture** completes: the sliced portrait reassembles as overlapping torn-paper figures — "artistic possibilities, not sampled families".
8. **1:08 — The revelation.** Continue: "A family is more than an average. Some things can be counted. Others must be understood." Click the print to inspect the halftone and credit.
9. **1:20 — The poster.** *Download A3 print* (3508 × 4960 px, 300 DPI) or web size; switch to العربية to show the mirrored Arabic poster and footer credit.
Shortcut: **Skip to revelation** (top bar) reaches step 7–8 in one click.

## Remaining refinements before 24 Nov
Native Arabic review; manual UAE.Stat lookup if a national figure is wanted; set API key and test live mode; deploy to a Node host; screen-reader and phone-device pass; record the demo; fix the stale intro sentence after the shift.
