# Evidence audit — re-checked 24 Nov 2026 (fresh fetches)

| ID | Source | Read? | What was confirmed | Scope warning |
|---|---|---|---|---|
| scad-pop-2024 | SCAD, https://census.scad.gov.ae/home/population | Yes | Total 4,135,985, described as "approximately 4.14 million in 2024"; reference "As of September 2024"; tagged revised; median age 33 (2024); based on administrative registers | **Abu Dhabi emirate only.** A revised register-based estimate, not a census count. The site shows only the rounded ≈4.14 million |
| yearof-2026 | https://uaeyearof.ae/en/about-year-of-2026 | Yes | "2026 has been designated as the Year of Family"; slogan "Growing in Unity" (confirmed 24 Nov) | Thematic only. The Arabic «نماء وانتماء» is from the project brief and is **not** on the page |
| schuessler-1999 | Schuessler, "Ecological inference", PNAS 96(19):10578–10581, 1999. https://pmc.ncbi.nlm.nih.gov/articles/PMC33746/ | Yes | Abstract defines ecological inference as drawing conclusions about individual-level behaviour from aggregate data; the term "ecological fallacy" appears in the main text | Paraphrased, not quoted |
| uaestat-fcsc | https://uaestat.fcsc.gov.ae/en | **No — HTTP 403** (also fcsc.gov.ae, www.fcsc.gov.ae) | Nothing | No figure used. No UAE-wide number is shown anywhere |

## Statements shown to visitors, checked against the sources
- c1: "revised 2024 figure of approximately 4.14 million residents for the Emirate of Abu Dhabi (reference date September 2024, based on administrative registers)" — matches. "No household-size distribution in the material reviewed" — true: the SCAD page shows only a marital-status table *title* with no values.
- c2: "median age of 33 years for the Emirate of Abu Dhabi in 2024" — matches (page: "relatively young, with a median age of 33").
- c3: Year of Family designation and slogan — match. "Neither this page nor the demographic figures measure closeness…" — true by construction.
- Inferred sentences are author interpretation and are labelled as such.

## Rules applied
No number appears unless it is on a page that was read. The live AI is additionally blocked in code from returning any number that is not in the claim's approved material (`lib/ai.js`).

## Not verified / open
- UAE-wide figures (portal blocks automated access). If you want one, read it by hand and add it with year, unit and scope.
- Whether SCAD publishes household-size statistics elsewhere. None was seen on the page reviewed, and the site says only that.

## 27 Nov content review
Two curated "Inferred" sentences were softened because they presumed more than the sources support: c1 now says only that a count like this describes the emirate as a whole; c3 now says only that designating a year for family signals national attention to family (it no longer claims closeness or belonging "matter in public life"). The Arabic name of the Year Of site was corrected. The live AI prompt for c3 now forbids claiming the designation reflects bonds, values or feelings. Sources were not re-fetched on this date (last full re-check: 24 Nov 2026).
