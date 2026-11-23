# Design research, decisions and licence notes (redesign v2)

Research pass done 23 Nov 2026 by fetching public pages. Nothing from these platforms is embedded: all visuals, motion and code are original. Pages I could not read are marked; no claims were made about them.

## Research matrix

| Source | What the page shows (as read) | Used how | Licence / access | Decision |
|---|---|---|---|---|
| Paper Shaders (shaders.paper.design) | Preset catalogue: halftone dots, halftone CMYK, dithering, grain gradient, noise, Voronoi. Live output not readable | Idea only: halftone screens at different angles + paper grain. Rebuilt as plain 2D-canvas code in `art.js` (no package installed) | npm React package advertised; licence not verified | **Adapted** (original code) |
| Framer — Editorial Stage | Image wipes, colour-panel transitions, oversized type, split→stacked layout, reduced-motion support. Free, Framer-only | Colour-plane staging and the chapter wipe (via native View Transitions) | Framer-only component, not portable | **Adapted** (concept) |
| Framer — Storytelling Collage | Scattered layered cards with pointer parallax. Free, Framer-only | Pointer parallax on torn scraps and colour planes | Framer-only | **Adapted** (concept) |
| Framer — Expand Media Story | Compact collage expanding into a scene; lightbox zoom | Print-inspection lightbox for the final poster | Framer-only | **Adapted** (lightbox only) |
| Framer — Storyline Reveal / Sticky Scenes | Scroll-driven text/image reveals. Both paid ($5), Framer-only | None copied; reveal is driven by investigation state, not scroll | Paid | **Rejected** |
| Native Animation (nativeanimation.com) | React Native/Expo (Reanimated, Skia). "Ink Bloom", "Iridescent Scroll" etc. $9 each / all-access; custom licence | Principle only: reveal as a physical material change. Not usable on the web | RN-only, paid | **Rejected as code; principle adapted** |
| GSAP (SplitText, ScrollTrigger) | Docs read; pricing page states GSAP is free | Word-mask rise reproduced in ~10 lines of CSS; no dependency added | Free per gsap.com/pricing | **Rejected** (not needed) |
| Spline docs | 3D editor, Hana 2D, states/events, AI agent | 3D would fight the flat print aesthetic and complicate export; no Spline file created or connected | Account needed | **Rejected** |
| Rive features | State machines, runtimes, open-source | Needs authored .riv assets; canvas state already drives the artwork | Runtimes open-source | **Rejected** |
| recent.design/websites | Grid of recordings; filters incl. Editorial, Art. Descriptions not readable (JS/poster images only); seen slugs: nothing-to-watch, augen, x-advertising | **I could not read individual projects, so I cite no specific visual principles from them.** General direction (oversized type, colour blocking) comes from the brief | n/a | Not used as a source |
| Codrops | HTTP 403 to automated fetch | None | n/a | Not read |
| Awwwards / Memorabl.es | Not fetched in this pass | None | n/a | Not read |

## What was actually implemented (all original code)
1. **Halftone + overprint:** screened dots at distinct angles, multiply blending, paper fibres and grain (`public/art.js`).
2. **Torn paper:** polygon edges displaced by smooth noise; CSS version uses an SVG `feDisplacementMap` filter.
3. **State-driven sliced print:** the portrait is composited in 20 vertical strips whose displacement peaks mid-fracture and resolves into the final composition.
4. **Knock-out and halo type:** headline prints porcelain over the cobalt plane and graphite with a paper halo elsewhere.
5. **Native View Transitions API** chapter wipe (falls back to a plain switch), CSS clip-path "peel" for the evidence reveal, pointer parallax, offset-print buttons.
6. **One renderer for screen and export** so preview equals print.

## Fonts (bundled in `public/fonts`, SIL Open Font License; licence files included)
Instrument Serif (display), IBM Plex Sans (text), IBM Plex Mono (annotations), Noto Naskh Arabic (Arabic display), IBM Plex Sans Arabic (Arabic text). Obtained from the Fontsource npm packages (latin / arabic subsets only).

## Previous design
The v1 navy/gold SVG constellation was discarded entirely.

## Paper-peel research note (v2.1)
Options weighed for the Evidence Lens peel: GSAP ScrollTrigger (free per gsap.com/pricing; read earlier), Motion's `useScroll` (React-only; this project is not React), CSS scroll-driven animations (not yet reliable across browsers), WebGL page-curl (heavy, hard to keep accessible). **Chosen: native JS scroll mapping + CSS clip-path + gradient "rolled paper" band**, because it needs no dependency, works with touch scrolling without pinning, degrades to a plain reveal, and is easy to maintain. In this pass I did not re-fetch GSAP/Motion/Codrops pages (Codrops returned 403 earlier), so no technique is attributed to them beyond the general idea of scroll-scrubbed progress. The effect is used only inside the Evidence Lens.
