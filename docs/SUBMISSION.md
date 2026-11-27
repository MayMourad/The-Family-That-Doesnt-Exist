# Submission package

**Title:** The Family That Doesn't Exist · **Arabic:** العائلة التي لا وجود لها
**Category:** Digital Arts — Web Design · **Theme:** UAE Year of Family 2026 — Growing in Unity (نماء وانتماء)
**Live:** https://the-family-that-doesnt-exist.vercel.app · **Code:** https://github.com/MayMourad/The-Family-That-Doesnt-Exist (private; make it public or add judges if required)
**Creator:** May Ahmed Mourad · Grade 12 · ADNOC Schools Madinat Zayed (MZ) / مي أحمد مراد · الصف الثاني عشر · مدارس أدنوك مدينة زايد (footer, sources panel, poster footer; no institutional endorsement is implied).

**Description (EN):** An interactive artwork asks an AI-style system to draw "the average family" from public statistics. A confident halftone portrait appears. As visitors peel back each assumption and read what a hand-checked public source does and does not establish, the print slices apart and becomes a collage of artistic possibilities, not a sample of real families. The work argues that data can describe a population but not everything that makes a family, and that in a Year of Family, belonging is not a statistic.

**الوصف (AR):** عمل تفاعلي يطلب من نظام ذكي «رسم العائلة المتوسطة» من الإحصاءات العامة، فتظهر لوحة طباعية واثقة. وكلما رفع الزائر الورقة عن افتراض ما وقرأ ما يثبته مصدر موثَّق وما لا يثبته، تتصدّع اللوحة وتتحول إلى كولاج من الإمكانات الفنية لا إلى عيّنة من أسر حقيقية. يقول العمل إن البيانات تصف المجتمع لكنها لا تخبرنا بكل ما يجعل العائلة عائلة، وإن الانتماء في عام الأسرة ليس رقماً.

**AI role:** an evidence-bound critic. Server-side; input restricted to three approved investigation IDs; output schema-, citation- and number-validated; the verified verdict overrides the model; labelled offline fallback. In the current deployment the key is **not** configured, so it runs in offline mode (see docs/AI_ACTIVATION.md and docs/ACCEPTANCE.md).
**Method:** docs/EVIDENCE.md. **Technical summary:** Node serverless functions on Vercel, vanilla JS, one canvas renderer (halftone, torn paper, overprint) shared by the on-screen poster and the A3 / 300 DPI export, SVG filters, native View Transitions.
Dimensions, team and administrative fields: not supplied — fill in yourself.

**Suggested screenshots:** hero; portrait with hypothesis label; a sheet mid-peel; the three Known/Inferred/Unknown labels; mid-fracture with a stamp; completed fracture; final screen; Arabic final screen; the A3 print PNG.

## Judging pitch (90 seconds)

**One-line summary:** an artwork that asks an AI-style system to draw "the average family", then lets you peel away the evidence and watch the confident picture fall apart into possibilities, because statistics can describe a population but not what makes a family.

- **Problem:** AI and statistics can produce convincing portraits that imply more knowledge than the evidence supports.
- **Innovation:** an interactive artwork that visibly challenges unsupported assumptions. A scroll-driven paper-peel reveals what a source does and does not establish (Known / Inferred / Unknown), an evidence-bound AI critic explains it, and the generative print transforms because of the visitor's actual choices.
- **Impact (a goal, not a measured result):** practise critical AI and data literacy, and a more careful view of family, relationships and belonging.
- **Year of Family link (Growing in Unity / نماء وانتماء):** numbers help us understand how a population is changing; belonging is made of care, shared time and being known, which no table can establish.

### Spoken script with click sequence
Press **Guided demo** to run the click sequence hands-free (≈ 87 s), or follow it by hand.

| Time | Say | Do |
|---|---|---|
| 0:00 | "Can AI draw the average family? Here is its confident answer." | Hero: point at the print and the label "illustrative hypothesis". |
| 0:07 | "It looks certain. But look at what it assumes." | **Begin the experiment**. |
| 0:14 | "Assumption one: that this family has five members. Where does that come from?" | Open sheet 1; the assumption is printed on butter paper. |
| 0:20 | "Scrolling lifts the paper to reveal the evidence." | **Scroll** (or *Lift the paper*): the paper curls away. |
| 0:28 | "Known: an Abu Dhabi population figure from the Statistics Centre. Inferred: only a cautious reading. Unknown: how many people live in any household." | Point at the three labels. |
| 0:38 | "An AI critic reads only these approved sources and explains the gap. The badge says whether it is live AI or offline text. It never invents numbers." | **Ask the evidence critic**; point at the badge. |
| 0:50 | "I challenge the assumption and the print starts to come apart." | **Challenge this assumption**: figures separate, a stamp appears. |
| 0:58 | "Median age and closeness fall the same way." | Sheets 2 and 3: lift, challenge. |
| 1:12 | "The one confident portrait becomes possibilities, not a distribution of real families." | The Certainty Fracture completes; read the label. |
| 1:20 | "A family is more than an average. Some things can be counted; others must be understood. In a Year of Family, belonging is not a statistic." | **Continue to the revelation**; read the Year of Family paragraph. |
| 1:30 | "This poster is generated from my own investigation: same choices, same poster." | **Download A3 print**; switch to العربية to show the mirrored Arabic poster. |

Shortcut: **Skip to revelation** (top bar) reaches the final screen in one click.

### Three talking points
1. The artwork changes because the visitor challenged evidence, not because an animation was scheduled.
2. The AI is constrained: approved sources only, validated JSON, any number not in the sources is rejected, and offline text is never presented as AI.
3. It is bilingual (RTL) and exports a print-ready A3 / 300 DPI poster that reproduces the visitor's path.

### Likely questions
- **"Is the AI real?"** When a server key is configured, the critic calls a Google Gemini model on the server and the badge says "Live AI"; otherwise it says "Offline curated text · not AI". State which mode the site is in on the day (`node scripts/verify-live-ai.js` tells you).
- **"Where do the numbers come from, and could they be wrong?"** Statistics Centre Abu Dhabi, Abu Dhabi Population 2024: about 4.14 million residents and a median age of 33, emirate-level only and a revised register-based estimate. I also cite the UAE Year Of page and a 1999 PNAS paper on ecological inference. I re-read each page on 24 Nov 2026. No UAE-wide figure is shown because the national portal blocked my automated access.
- **"Does it prove people learn from it?"** No. Impact is a goal; I have not run a study. What I can show is that every claim is traceable and the artwork follows the visitor's real choices.

## Remaining actions before submitting
1. Switch on live AI following docs/AI_ACTIVATION.md and run `node scripts/verify-live-ai.js`. If you do not, say "offline mode" honestly in the pitch.
2. Have a native Arabic speaker read the Arabic copy, and confirm the «نماء وانتماء» wording against an official source.
3. Click through once on a real phone and in Safari/Firefox.
4. Record the screen capture; fill in administrative fields yourself.
