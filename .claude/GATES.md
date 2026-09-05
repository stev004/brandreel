# GATES - parked human decisions

| id | question | options | default on no answer | status |
|---|---|---|---|---|
| G1 | Create a private GitHub remote so CI renders run and fm.sh can push? | yes / not yet | - | resolved 2026-09-05: Steven said make a public remote; created https://github.com/stev004/brandreel, main + branches pushed |
| G2 | Merge feature/phase2-machine into main? | merge / hold | - | resolved 2026-09-04: Steven said merge; merged by the director on his instruction |
| G3 | Music source for the fusion video: CC0 library vs generated? | CC0 / generated | CC0 | resolved 2026-09-05: Steven said whatever works; CC0 library tracks supplied via --music; sourcing stays manual until a fetcher is built |
| G4 | Layout lints will fail smoke-3am: fix templates to fit, or tighten script.mjs copy limits? | templates / copy limits / both | both | resolved 2026-09-04: Steven started the layout-lints run without objecting; default (both) taken |
| G5 | The CTA lint is weak: it only checks close.line is non-empty, and when close has a tagline/url the CloseD path renders those instead of close.line (audit: passes on hidden text). Define the CTA: which rendered element counts, and a minimum on-screen dwell (smoke-3am-v2 closes for 1.5s)? | close line or tagline or url, dwell 2500ms / dwell 2000ms / other | any rendered close text element, dwell 2500ms | resolved 2026-09-04: Steven started the CTA run without picking; default taken |
| G6 | The Regulate tagline "Not meditation. Regulation." (27 chars) cannot fit the CloseD tagline row (96px display, 18 chars). Shrink the tagline face, allow two rows, or use the url-only close for Regulate? | smaller face / two rows / url-only | two rows | resolved 2026-09-05: Steven said allow two rows; implemented in the interview run |
