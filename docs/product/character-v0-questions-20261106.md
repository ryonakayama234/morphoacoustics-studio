# CHR-Q-20261106-01 — Questions to ChatGPT: Character v0 product definition (playable vertical slice)

**STATUS: PRODUCT DESIGN ROUND / QUESTIONS ONLY. No implementation, no UI change, no SMC/ASMR import, no Core change, no merge is authorized by this document.**
Issuer: Muse (supervisor, on behalf of the Owner). Date: 2026-11-06 JST.
Base: Studio main `6bc0d715e0a66b1…` (ADR ratified by PR #34). Tracking Issue: **Studio #35**. Companion frozen authorities in Core (`ryonakayama234/morphoacoustics` main): D0 contract and D1 vocabulary `oma-vocab/v0` (`docs/research/oma-0-organ-design-contract-response-20261105.md`, `docs/research/oma-1-vocabulary-response-20261106.md`), G0 verification PASS (Core Issue #291).

要旨（Owner向け）: 「いろんな身体のキャラクターを作って、いろんな声で喋らせる」創作アプリの、最小の遊べる形（Character v0）を定義するための質問票。身体・運動・音源・Take の4要素について、既存の部品で正直に組める範囲と、将来の継ぎ目を決める。

## 0. Product intent and frozen premises

The Owner's product: a creative application where a user builds characters with different bodies and makes them speak in different voices. Structure: **body creation (Core) × motion creation (SMC lineage) + neural timbre only where physics is impossible and only without breaking physical causality + ASMR-class scenes (including adult voice) as a later reach**. The research gates exist to serve this product; this round re-orders the work by product value.

Frozen, not open for renegotiation (flag contradictions as deviation candidates):
- Studio ADR `STUDIO_WORKSPACE_V2_DECISION.md`: slots are closed — `project.library` references only; `canvas` mode-replaced (Character/Motion/Scene); `selection.inspector` permitted parameters of the selection only; `take.transport` immutable Take playback / A-B / export; `research.drawer` receipts/traces/hashes. No new panels, no new backends (Studio Issue #32 STOP remains in force for implementation; this round is a design proposal, which the ADR's STOP-AND-PROPOSE rule permits).
- Studio Issue #32 [P0 QUALITY RESET]: creator listening rejected the WG2 Takes ("signal sound"). A v0 definition must state what changes relative to WG2, or honestly accept the same quality risk.
- Core D0/D1: a Character's body is an exact Core reference (BodyPreset / BodyRevision); capability display follows the frozen vocabulary (`EXECUTABLE_LIMITED` with its scope, or `UNMODELED` — never shown as usable). G0 verified the legacy mapping against live code (801 tests passing at Core main `01b2a33`).
- Judgement: quality claims by measurement gates only; creator listening is a final binary adoption decision only. No fabricated physical causality; no arbitrary audio post-processing.
- Neural boundary (Core invariant I4 and `docs/research/neural-causal-boundary.md`): neural components may propose, estimate, or model residuals; they may not rewrite physics outputs or fabricate causality.

Current reality to design against (verify on main; do not assume draft content): Studio main offers CC-A2 (preset choice M0/M1, fixed script) and the CC-B1 local prototype (one-section edit on M0, Core-issued revision). The SMC package is **not** on Core main (unmerged draft lineage only). The audible source path is a prescribed LF glottal flow (fixed F0 lineage in the audited experiments). The receiver/near-field observation is `UNMODELED` in the frozen vocabulary.

## 1. Questions

### QC1 — What a Character is in v0
Define the v0 Character as data: which exact references compose it (Core body reference, performance/script reference, source profile, saved Takes), what is stored in Studio vs referenced in Core, and what makes two Characters "the same character" across sessions. Studio must hold references, not copied geometry or re-issued bodies. Give the field list.

### QC2 — Body axis in v0
Which bodies and edits does v0 offer, exactly: M0/M1 presets; OD-2 family edits (`tract1d.local-log-area-5.v1`, centers {4,8}, ratios {0.90,1.00,1.10}) issued by Core as BodyRevisions; the CC-B1 local single-section edit — are these one product surface or two inconsistent ones? Define the v0 body picker/editor in ADR slots, the capability labels shown per body (using frozen vocabulary statuses and scopes), and what is visibly *not* offered (e.g. no organ-graph editing, no tissue parameters) and how the UI says so honestly.

### QC3 — Motion/script axis in v0
The performance input today is Core's Performance contract (GestureScore / tasks such as CONSTRICT over a timeline) with a fixed script lineage (CC-A2). Decide v0's motion surface: (a) a small fixed set of performances with adjustable parameters (timing, strength) — specify the set from existing adopted material only; and/or (b) a minimal text-to-gesture path. For (b), define the **SMC seam**: what SMC must produce (a Performance-contract object), what subset would make v0 honest (e.g. a bounded kana/vowel set), and what remains out. Free arbitrary text-to-speech must not be claimed for v0 unless the seam and its evidence are defined.

### QC4 — Source and the neural seam
The audible path's source is a prescribed LF flow. (a) Which source parameters may v0 expose (e.g. F0, phonation-related parameters) — only those the existing adopted path actually supports, each with its evidence and its physical meaning; state what stays fixed and why. (b) Define the **neural source seam** for a future version: a learned source model that generates the glottal flow waveform conditioned on task/body state, feeding the unchanged physical tract — specify its inputs, outputs, what it may never do (post-process radiated audio, alter body identity, invent receiver effects), and what evidence gate it would need before it may ship. This round defines the seam only; no neural implementation.

### QC5 — Takes, A/B, and honest quality language
Define the v0 Take: recorded fields (body revision, performance id, source profile, render/observation digest, environment/version pins), immutability and replay rule, and the A/B unit in `take.transport`. Then the quality language: given Issue #32's rejection of WG2, what may v0's UI claim about its renders (e.g. structural voice sketch vs voice), what measurably changes versus WG2 in v0 (body diversity? source variation? nothing?), and what the creator's binary adoption decision applies to. Do not propose listening-based tuning loops that contradict the measurement-first rule.

### QC6 — Scene / ASMR in v0
The receiver is `UNMODELED` (frozen vocabulary: `receiver.observation`, `acoustic.radiation_interface` are reservations). Define v0's honest position: no proximity/whisper effects are offered; what, if anything, is stored as Scene data in v0 (e.g. nothing, or metadata-only placeholders that render nothing), and the ordered prerequisites for a future ASMR-capable version (which promotions, in which order: radiation interface? receiver observation? airflow for breath?) tied to the vocabulary promotion rule (evidence gate + supervisor review + Owner decision each).

## 2. Supervisor's provisional positions (challenge these)

PP1. Character identity is references only: Core body revision/preset id + performance id + source profile id. Studio stores no geometry copies and mints no body identity (per D0/QO5 and the frozen vocabulary).
PP2. v0's motion surface is the existing Performance contract with a fixed, adopted performance set plus parameter adjustment. Free text input belongs to the SMC seam definition, not to v0's shipped claims.
PP3. The neural seam is at the source only: a future learned source generates flow *into* the physical tract. Output-side "voice color" processing is prohibited by the Owner's no-arbitrary-processing rule, however convenient it would be.
PP4. v0 must answer Issue #32 head-on: either name a measurable change versus WG2 (e.g. body diversity across M0/M1/OD-2 bodies and source-parameter variation, with the measurement that would show it) or state plainly that v0 is a creation-flow milestone, not a quality milestone.
PP5. Scene in v0 is data-only at most: no rendered proximity effect may be implied by storing a distance number. ASMR is a promotion roadmap, not a v0 feature.

## 3. Required answer format

- Submit as a **docs-only Draft PR** against Studio main, one document `docs/product/character-v0-response-20261106.md` (name adjustable if recorded in the PR body).
- The answer is a product specification draft and must include: (a) the end-to-end user flow as a diagram (text/ASCII or Mermaid) mapped onto the frozen ADR slots; (b) data structures for Character v0 and Take v0 (field lists with types/references); (c) a capability matrix (body × motion × source) stating for each cell: available in v0 / seam defined only / out, with evidence refs; (d) explicit non-goals; (e) an ordered blocker list toward v1 (SMC import conditions, neural source gate, receiver/radiation promotions), each with its decision owner.
- Per question: recommendation, rejected alternatives with reasons, at least one falsifier or STOP condition, and NOT ADOPTED / NOT IMPLEMENTED markers where applicable.
- At most four reverse questions to the supervisor.
- No code, no UI implementation, no Studio or Core changes, no imports. Product definition only. Cite Core assets by exact identifier and repository path; do not cite unmerged draft content (SMC drafts, ASMR drafts) as available capability — they may be cited as lineage with their unmerged status stated.

## 4. What success looks like for this round

The Owner can adopt, from the answer plus the supervisor's review, a single Character v0 specification: a playable slice definition in which every offered capability traces to adopted Core evidence, every future capability is a named seam with a gate, and the UI's promises cannot exceed the physics. Implementation planning is a later round.
