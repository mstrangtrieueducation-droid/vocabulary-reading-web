# Practice Tests 5–8 — approved release, 16 October 2026

The teacher approved the existing review proposals for all four tests and explicitly requested direct edits to her original question and answer Google Docs. All eight original Docs were edited in place and read back. Native answer tables, question numbering, and merged writing rows were preserved. Full before/after snapshots and exported answer PDFs are retained outside this public repository in `practice-5-8-release-20261016`.

- 45 scoped question-text replacements apply the approved review, including Test 5 astronomy passage and Test 8 buoyancy answer.
- Test 5 keys 5 and 26 are D; Test 6 key 27 is B.
- Each test has 100 question-specific Vietnamese explanations and 30 vocabulary entries with meaning, usage, related forms, examples and translations.
- Student and correction routes are recorded in `practice-05-08.routes.json`; each is a separate opaque URL using the Practice 4 template.
- Writing fields accept only the missing text shown beside the field. Nonmatching nonempty writing answers are marked for teacher review, with a provisional automatic score. Their actual submitted text is included in the existing form's review field.
- Five error corrections can be entered in any order; the same correction earns credit once.
- Existing course identity, class options, score destination and notebook submission form are preserved. Correction forms are prefilled with the correct test number.
- Answer Docs are linked only from correction pages. As with the existing static practice system, grading keys are browser assets, not a secure examination backend.

Build: `node scripts/build-practice-05-08.mjs`.

Test: `node tests/practice-05-08.test.mjs` checks all 400 keys, approved variants, errors, pending writing, normalization, source boundaries, 120 vocabulary entries and intercepted form payloads.

Desktop/mobile browser checks passed for all four tests, including text spaces, all sections, grading, reset, vocabulary tabs and search. All eight test submissions were intercepted locally; none were sent to the teacher's form. PDF checks verified 100 answers and 30 highlighted vocabulary labels in each original answer Doc; sampled writing pages were visually inspected.
