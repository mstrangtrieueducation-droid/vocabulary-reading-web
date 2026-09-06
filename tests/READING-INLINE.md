# Inline paragraph completion

`reading-inline.mjs` owns the shared React renderer and gap binding. All 12 Reading Intensive 3 entry points import its content-hashed copy. The existing question IDs, answer state, selected-word state, grading, submission payload and reset logic remain in each lesson.

Students select a word from the original bank and edit its form in the adjacent inline input. Plain paragraph gaps use an inline input. A selected base word is never automatically converted into the answer key. Submitted paragraphs lock the controls and show correctness and the existing explanations.

The renderer requires a complete one-to-one match between numbered paragraph blanks and explicitly numbered question prompts. Tables, images, sketches, word parts, extension activities, choices and ambiguous groups keep their original renderer. Current coverage: 22 groups / 113 gaps across Reading 3. Reading 1–2 in this repository contain vocabulary notebook pages, without this paragraph exercise renderer.

This repository ships compiled lesson assets without their original React source project. `scripts/sync-reading-inline.mjs` makes a guarded integration against the baseline bundles recorded in `reading-inline-manifest.json`, preserves those bundles and emits new content-hashed bundles. Run it after changing the shared source or CSS; it rejects unknown baseline renderer shapes. Future lesson builds must integrate this component or rerun the integration against their new baseline.

Verification: `node --test tests/reading-inline.test.mjs`. This checks every current dataset, exact surrounding text, unambiguous question bindings, base-word selection, manual inflection, submitted locking, feedback and reset. Browser checks additionally covered all 12 lessons on mobile, desktop rendering, Reading A/B navigation and a complete 67-question submission with one intentional wrong form (66/67), with all external submission requests blocked.
