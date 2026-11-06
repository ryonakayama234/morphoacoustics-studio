# CHR-Q-20261106-02 — Questions to ChatGPT: implementation plan for the adopted Character v0 floor

From: Muse (supervisor), on behalf of the Owner
To: ChatGPT (research / design / implementation lead)
Date: 2026-11-06
Tracking issue: Studio #38 ([CHR-1] Character v0 実装計画)
Status: QUESTIONS ONLY. This document asks for an implementation **plan**. It does
not authorize writing code, changing Core, changing the UI, or merging anything.

## 0. What is already decided (do not relitigate)

- The Character v0 product specification is ADOPTED (CHR-R-20261106-01, on Studio
  main as `docs/product/character-v0-response-20261106.md`, merged 2026-11-06).
  This round plans only its **v0 floor**: M0/M1 body choice, the CC-A2 fixed
  performance (「あい」-equivalent three tasks, read-only prescribed LF100 source),
  immutable Takes with exact body/motion/source references, A/B comparison, and
  the Character identity rule (stable `character_id`; references snapshotted per
  Take).
- The workspace contract is FROZEN (`docs/product/STUDIO_WORKSPACE_V2_DECISION.md`):
  library = references only; canvas = mode-replaced (Character/Motion/Scene);
  inspector = permitted parameters only; take.transport = immutable Take
  playback / A-B / export; research.drawer = receipts, traces, hashes. No new
  panels without a contract amendment.
- Studio Issue #32 STOP stands: no new feature panel, no new backend dropdown
  option, no promotional copy, no quality claim. v0 is a creation-flow and
  causal-identity milestone, not a quality improvement.
- Out of scope for the plan: CC-B1 changes (separate private research lineage on
  an unmerged Core pin), WG2 paths, OD-2 bodies and OD-3 schedules as product
  operations (their own gates), SMC import, Scene/ASMR rendering, any Core change,
  any output-side audio processing.

## 1. Verified current state (supervisor-checked on Studio main, 2026-11-06)

- `src/App.tsx` — one vertically stacked page: Character, Script, Direction,
  Perform, Take history, Compare sections, then collapsible experiment entrances
  for WG2, CC-B1 (`src/ccB1/…` via `CCB1Atelier`), and CC-A2
  (`src/ccA2/CCAtelier.tsx`).
- `src/studio/model.ts` + `compareSelection.ts` — draft and A/B selection model;
  `src/performance/TakeStore.ts` — Take records; browser storage holds drafts and
  the Take index (per the App footer); generated WAV/trace files are persisted
  server-side by SHA-256.
- Servers: `server/live-server.mjs` (main app path), `server/cc-a2-server.mjs`
  (CC-A2 path: validates Core results, writes immutable Take JSON to
  `<DATA>/takes/<runId>.json`, default DATA = `<studio>/.morpho-cc-a2-data`),
  `server/cc-b1-local.mjs` (separate store).
- Lesson recorded on Issue #32 (2026-11-06): the creator's local Take data from
  the WG2 audition was deleted, so two historically important Takes are now
  permanently unidentifiable. Take/Character persistence and export are therefore
  a first-class planning topic below, not an afterthought.

## 2. Questions

### QI1 — Target module mapping

Map the adopted v0 flow (select Character → confirm body revision → fixed
Performance → Perform → Take → A/B → export) onto the existing modules named in
§1. For each flow step, name: the existing file(s) that carry it today, whether
they are reused as-is, adapted, or replaced, and which server (live-server vs
cc-a2-server) is the v0 perform path. If the two servers should converge, say at
which plan step and what happens to the other path's existing behavior. Avoid a
big-bang rewrite: the plan must keep the app runnable at every step.

### QI2 — Character persistence and identity

Design the Character store implementing the adopted data structures: where
`character_id`, display name, current default references, and creation/update
metadata live (server-side file store vs browser storage — argue the choice
against the WG2 lesson: browser-only data was part of how provenance was lost),
the on-disk format, and how a Character's body reference for M0/M1 is expressed as
an exact Core reference (the same reference vocabulary the Take snapshot uses).
State explicitly how Character records relate to existing draft storage in
`src/studio/model.ts` — migration, coexistence, or replacement.

### QI3 — Take retention and export

Design the retention story so a Take can never again become unidentifiable:
(1) what the immutable Take record must contain (per the adopted specification),
(2) an explicit export action in take.transport (bundle format: Take JSON + WAV +
receipts) that the creator can save outside the app's data directories,
(3) what the app shows when a Take's referenced artifacts are missing. Keep the
existing SHA-256 artifact addressing; do not design a cloud service.

### QI4 — UI reorganization within the frozen slots

Describe the v0 screen flow strictly inside the ADR slots: how the CC-A2
comparison entrance becomes the canvas Character/Motion modes for the v0 floor,
what the inspector shows (body preset choice, identity/reference summaries,
read-only source profile), what stays in take.transport, and what moves to
research.drawer. State what happens to the existing stacked sections (Character /
Script / Direction / Perform / Take history / Compare): which are reused as the
v0 flow, which retire, and at which step. No new panels; if you believe a slot
amendment is unavoidable, flag it as an explicit decision item instead of
assuming it.

### QI5 — Step decomposition and acceptance

Decompose the work into the smallest independently mergeable steps (suggested
shape: S1 persistence/identity foundations, S2 perform path unification, S3 UI
flow reorganization, S4 export/retention, S5 baseline capture — reorder or split
as you judge better). For each step give: goal, files touched (expected), explicit
non-goals, the acceptance checks that must pass (existing test/smoke suites by
name plus any new checks the step adds), and whether an Owner decision is needed
before that step starts. Every step must keep all pre-existing checks green and
must not change Core, CC-B1, or WG2 behavior.

### QI6 — Fresh baseline capture

Because the WG2-era Takes are permanently unidentifiable (Issue #32 record),
include in the plan a baseline-capture step: recording fresh M0 and M1 Takes
through the finished v0 flow, exporting them via the QI3 mechanism, and recording
their Take ids and references in a repository document so future quality gates
have an identified comparison baseline. State exactly what gets recorded and
where, and what claim this baseline does and does not support.

### QI7 — Risks, exclusions, and reverse questions

List the plan's main risks (especially: persistence-format lock-in, accidental
scope creep toward OD-2/SMC, any pressure to touch the frozen ADR), the
exclusions you are relying on, and anything in §§0–1 you found inaccurate against
the actual code. End with at most three reverse questions where an Owner or
supervisor decision is genuinely required before implementation could start.

## 3. Supervisor's provisional positions (argue against them if wrong)

- PI1: The v0 perform path is the CC-A2 lineage (`cc-a2-server` + `CCAtelier`)
  promoted into the product flow; the live-server draft path is adapted or
  retired step by step, never in one rewrite.
- PI2: Character records live server-side alongside the Take store (same data
  root family), not browser-only; browser storage may cache, never own, identity.
- PI3: Export/retention (QI3) and baseline capture (QI6) come before or with the
  UI reorganization, not after it — provenance first, presentation second.
- PI4: Each implementation step is its own PR with its own acceptance record;
  the plan document is adopted once, but implementation GO is per-step or
  explicitly batched by the Owner.

## 4. Answer format

Answer as ONE new document in a NEW Draft PR against Studio main (docs-only; no
code, no UI change, no Core change, do not merge). Title it
`CHR-R-20261106-02`. Structure: verdict summary; per-question answers QI1–QI7;
the step table (step, goal, files, non-goals, acceptance checks, Owner decision
needed); the persistence/export design in enough detail to implement from; a
claim table for the baseline; reverse questions (max 3). Where the answer relies
on current-code facts, cite the file or document. 日本語の要約を冒頭に付けてください。
