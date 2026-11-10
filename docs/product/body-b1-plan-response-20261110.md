# BODY-R-20261110-01 — B1 OD-2 限定身体製品化：QP1–QP6 計画回答・技術選定・Muse 逆質問

**Status: RESEARCH LEAD PROPOSAL / MUSE REVIEW PENDING / OWNER PLAN ADOPTION PENDING / NO IMPLEMENTATION GO / NO SCHEMA CHANGE / NO UI CHANGE / NO MERGE / NO QUALITY GO**  
**Date:** 2026-11-10 JST  
**Questionnaire:** [BODY-P-20261110-01 / Draft PR #55](https://github.com/ryonakayama234/morphoacoustics-studio/pull/55), [original questions](body-b1-plan-questions-20261110.md), tracking [Studio #54](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54).  
**Roles:** ChatGPT = Research Lead / answer; Muse = independent supervisor / review; Owner = decisions and stage GO.  
**Scope:** docs-only planning; this response creates no PR, merges nothing, and executes no scientific measurement or implementation. The proposed future wire shapes are *illustrative contracts*, **not released schemas**.

## 0. Fixed decisions and evidence ledger

Do not renegotiate: Core OD-2 only, M0 parent, `tract1d.local-log-area-5.v1`, zero-based center {4,8}, ratio {"0.90","1.00","1.10"}, 5-cell log-area weights (0.25,0.5,1,0.5,0.25), no total-length/scale/free-area editing or M1 OD-2; no merging legacy CC-B1 site08 single-cell lineage. Keep RQ1 strict-B `INCOMPLETE_PROVENANCE`, full VERIFIED SOURCE `UNKNOWN`, no quality adoption; frozen three modes/closed slots; B0 satisfied for planning by CHR-1 S5 limited baseline. No SMC/ASMR/material/source knob, new physics, new panel or generic OrganGraph.

| Evidence | Checked source and exact status | What it does **not** certify |
|---|---|---|
| E01 | [Studio #54](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54) and [PR #55](https://github.com/ryonakayama234/morphoacoustics-studio/pull/55) questionnaire, 2026-11-10 | Implementation GO |
| E02 | [Core OD-2 DECISION](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/od2-reusable-physical-body-20261102/DECISION.md), [DATA](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/od2-reusable-physical-body-20261102/DATA.md), [A3 FREEZE](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/od2-reusable-physical-body-20261102/A3_FREEZE_20261102.md), [RESULTS](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/od2-reusable-physical-body-20261102/RESULTS.md), [Core PR #273](https://github.com/ryonakayama234/morphoacoustics/pull/273) merged | Stable production ABI, public registry, Studio UI, natural voice |
| E03 | [tools/od2_body_cli.py](https://github.com/ryonakayama234/morphoacoustics/blob/main/tools/od2_body_cli.py): `od2.local.revision-replay.v0-research`, Core-issued `revision_id` and `preset_id@1`, float.hex geometry, null alias | Research CLI is not per-request production CC-A2 performer |
| E04 | [OMA G0 Core #291](https://github.com/ryonakayama234/morphoacoustics/issues/291#issuecomment-6679264638): Core main `01b2a33732c1256764eb91358583e16a1fcee865`, Python 3.12.3 / NumPy 2.4.6, 801 passed / 12 skipped, four exact OD-2 IDs and two alias verified | All product-path regressions after a future Core pin migration |
| E05 | [Core Performance Contract v1](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/performance-contract-v1.md), [v1 common schema](https://github.com/ryonakayama234/morphoacoustics/blob/main/contracts/performance/v1/common.schema.json): `embodiment={preset_id,preset_revision}` only; result `BOUND` has preparation digest | Native BodyRevisionRef variant on v1 wire |
| E06 | Studio [character-store.mjs](https://github.com/ryonakayama234/morphoacoustics-studio/blob/main/server/character-store.mjs), [v0-facade.mjs](https://github.com/ryonakayama234/morphoacoustics-studio/blob/main/server/v0-facade.mjs), [cc-a2-server.mjs](https://github.com/ryonakayama234/morphoacoustics-studio/blob/main/server/cc-a2-server.mjs) pinned to Core `b569f044bfda309dff1a00cccf8365754e6b1355`, M0/M1 only | OD-2 already executable in Studio |
| E07 | [CHR-1 S5 Studio #50](https://github.com/ryonakayama234/morphoacoustics-studio/issues/50#issuecomment-6736075443): owner-PC M0/M1 baseline and verified BagIt; M0 quantized raw-Pa SHA `dc14c78bcc6d4a19c11fe2a01ba84b1394802b66626f4dfa27cc582c741e714e` | Source actual-run SHA or quality GO |
| E08 | [Workspace ADR](STUDIO_WORKSPACE_V2_DECISION.md), [CHR-1 S4 Studio #51 completion](https://github.com/ryonakayama234/morphoacoustics-studio/issues/51#issuecomment-6761907351), Studio PRs #52/#53 merged | Permission to add new layout slots |
| E09 | [VM-1D Core #205](https://github.com/ryonakayama234/morphoacoustics/issues/205), [VM-1C #203](https://github.com/ryonakayama234/morphoacoustics/issues/203): hypotheses about 600/100 Hz mouth-port ratio and boundary/source impedance | Conclusive cause of the 600 Hz observation |

**Evidence status:** Repositories, code, documents, issue/PR state checked on 2026-11-10. Their historical CI/owner-PC results are **documentary evidence**, not independently reexecuted in this planning round. Owner-PC S5 artifact bytes and backup ZIP were not fetched or revalidated here. Prospective product behavior, new benchmark thresholds, and new per-body SHA are **NOT TESTED**. Research links below are externally verified background, **not validation of this codebase**.

## QP1 — OD-2 Body identity and Character reference

**Recommendation.** Introduce a *planned* tagged `kind: "core_body_revision"` beside current `core_body_preset`, retaining the immutable Character `character_id` when body changes. The active Character revision stores an **opaque exact Core-issued** `revision_id` and enough **references** to its Core receipt/catalog version and producer pin; no full geometry or user-generated physical digest in Studio. Resolver/readback yields parent M0@1, family, center, ratio string, backend, exact numerical geometry, preparation digest. Display edit operands from the receipt, not from an independent Studio interpretation.

Illustrative semantic (NOT schema or newly approved field):
```text
BodyRevisionRef = {
  kind: "core_body_revision",
  revision_id: <opaque Core-authored exact ID>,
  family_id: "tract1d.local-log-area-5.v1",
  receipt_ref: <immutable Core receipt>,
  producer_core_commit: <audited exact SHA>,
  binding_state: SELECTED_UNRESOLVED | VERIFIED_BOUND
}
```
The receipt, not the short ref, carries parent `v3b-axial-M0@1`, `parent_preparation_digest`, ratio *wire string*, zero-based center, binary64 hex ordered 16 sections, `backend_id`, identity algorithm and `preparation_digest`.

**Identity law.** At the *same declared parent revision/digest*, *same family and algorithm version*, *same exact operation*, *same trusted implementation/pinned relevant identity inputs*, re-derive the same revision ID. Different family/lineage does not collapse merely because a geometry fingerprint coincides. `preparation_digest` attests prepared state/provenance, **not a substitute for content-addressed lineage identity**. `ratio=1.00` for both centers is the *identical M0 parent* `v3b-axial-M0@1`; never mint an edit revision. Existing M1 remains a distinct selectable preset, not an OD-2 parent.

**Finite closed-world capability source.** Core publishes/re-derives one authoritative read-only catalog for exactly four nonnull revisions + the M0 null alias rule (and retains existing M0/M1 baseline). It must reconcile with Core `BodyPresetRegistry`; **no parallel mutable registry**. A runtime capability manifest contains family/algorithm/catalog version, reviewed Core code pin, parent receipt hash, exact valid IDs, backend and task/source envelope, expected receipt hashes, and compatibility protocol version. Studio never hand-adds an unverified option.

**Rejected.** (1) Character itself as physical body ID (different people can share a body), (2) Studio-owned recipe or SHA as authority, (3) free-form operation chain in a BodyRef (permits non-whitelisted states), (4) pretending legacy CC-B1 site08 IDs and OD-2 five-cell IDs are equivalent, (5) digest equality as sufficient physical/lineage identity.

**Falsifiers / STOP.** Repeated derivation differs under declared identity domain; two nulls mint IDs; wrong parent/backend accepted; tampered body receipt but internally consistent manifest accepted; historical character/Takes retarget after catalog update; Studio offers an ID not in trusted Core capabilities. On ref readback mismatch: block execution, retain old history, emit typed diagnostic, do not resolve `latest`.

## QP2 — CC-A2 v1 carrier, Core promotion, façade and pin migration

**Recommendation: choose a *conditional compatibility bridge*, not a silent contract mutation.** Core's OD-2 research code already builds a derived `BodyPreset` with `preset_id="od2-local5-cXX-rYYY"` and `revision=1` and binds it using `BodyPresetRegistry`, while independently authoring stronger `od2-<digest>` lineage identity. Therefore the narrowest v1 carrier may be:

```text
Character core_body_revision ref
  -> trusted Core resolve/rederive + catalog validation
  -> audited one-to-one {revision_id, receipt SHA, preparation_digest,
                         exact derived preset_id, preset_revision=1}
  -> unchanged PerformanceRequest/v1 embodiment
  -> CC-A2 physical execution, actual source/task/body receipt
  -> compare entire provenance triangle (request / Core resolver / result)
  -> immutable Studio Take and Core receipt
```

The derived preset name is **an internal v1 transport alias** and never the creator-visible or sole archival identity. It is usable only if the trusted Core product performer accepts and reconstitutes that selected derived physical state, emits the exact v1 body binding, attaches verifiable full OD-2 receipt as a typed physical artifact, and all checks survive restart. This is **not true yet**: current `tools/cc_a2_live.py` / Studio bridge are M0/M1-only; OD-2 CLI is research-only and implements suite/direct replay, not this product operation. Do not market this as backward compatibility already achieved.

**Contract decision checkpoint.** If v1 `preset_id` semantics cannot represent a registered immutable derived preset honestly, or its accompanying artifacts cannot carry exact revision identity without ambiguity, **STOP and propose additive Performance Contract v2** with a discriminated `BodyPresetRef | BodyRevisionRef` and explicit resolved-lineage receipt. Do not modify v1 schema in place; new contract adoption requires an independent Owner GO. Keep v0 creative snapshot semantics, refusal/no-audio rules, and historical v1 Takes intact.

**Core pin strategy.** Current Studio server/v0 façade/Character store hard-pin `b569f044...` and executable receipts/the M0 oracle. Core OD-2 is on later main `01b2a337...`. A product bridge needs a **single newly audited Core execution pin** with clean Git checkout/source-inventory, exact trusted CLI version, Python/NumPy pin, full M0/M1 and OD-2 regression. Prefer an explicit versioned migration of the existing CC-A2 physical execution path; don't secretly run a second independent unreviewed experimental path or claim old pinned Take reexecution under new code is identical without checking. Old S5 Takes are historical and **must remain bound to b569**. Keep old versioned archive/read-only semantics; a new pin produces *new* Takes, not rewritten old ones. If migration cannot preserve the adopted physics regressions, STOP or isolate clearly versioned execution compatibility by separate design review.

**Façade allow rule.** The UI submits a stored selected BodyRef. Before perform: reread immutable Character revision and CAS/head snapshot; ask pinned Core to resolve exact BodyRevision; verify family/case/M0 parent/geometry/preparation/revision ID, catalog version, backend/source/task applicability and request/result binding; require clean pin, approved runtime and receipt. Reject absent/stale/superset catalog, unknown protocol, mismatch of readback, missing full receipt, or unsupported source/task. Avoid current hard-coded M0/M1-only predicate growing into a second inconsistent source of truth; Studio may retain a defensive *intersection* of fixed product scope and Core advertised capabilities, never an independently authoritative catalog. A capability-set expansion is an explicit versioned change with corresponding negative tests.

**Rejected.** Adding `od2-local5*` to a JS allowlist without Core re-derivation; changing v1 wire in place; constructing geometry in Studio; trusting a research WAV/import as a successful CC-A2 take; automatically upgrading Core to `main`/`latest`; composing CC-B1 site08 support into the new family.

**Falsifiers / STOP.** Selected ID resolves to another preparation digest; Core and Studio disagree on approved domain or executable SHA; missing/stale catalog still accepted; the v1 result proves only a preset name without a verifiable OD-2 lineage; old M0/M1 source/oracle regressions change unexpectedly; missing result artifacts accepted as audio; old Take query re-resolves against current catalog.

## QP3 — Two-layer measurement gate, oracle and 600 Hz caveat

**Recommendation: require both *shape primary* and *model-causal acoustic* gates; neither is a perceptual gate.**

**G_shape (identity and lawful intervention):**
- parent = exact Core M0 rest/preparation ref; 16 ordered positive area sections in SI, all 0.010 m lengths, length total 0.160 m; no other geometry or source/motor changes;
- define `w_i` on c-2..c+2 and zero elsewhere; `A_i'=A_i r^{w_i}` with ratio parsed from exact enumerated string. Re-derive and verify full areas/lengths, rest volume, derivative, parent/receipt identity, no changed section outside family;
- use **preexisting OD-2 prereg limits** in the same pinned scientific environment, *not fresh result-tuned tolerances*: max |log(A'/A)-log(r)w| <=1e-12; volume relative residual <=1e-12; timed log area <=1e-10 at four original probes. Identity/sha checks exact; r=1.00 yields exact original parent object/receipt alias;
- mutation controls: change one center, ratio, parent, family, float hex area/length, prep digest, derived ID, stale pin, bad number/unknown key; all fail-closed.

**G_phys (mathematical model and execution):**
- with **same source LF100**, three-task fixed schedule, seed 0, 48k/24000, defined attenuation and resistive termination and **0.20m pressure proxy**, independently reconstruct complex transfer at actual load/rest and terminal states (100–3500 Hz, 25-Hz grid, original A3 complex relative error <=1e-9); compare Core actual time-dependent raw Pa to freshly computed body-reconstructed raw Pa; Core OD-2 R2 same-environment replay prereg relative L2 <=1e-12 (do not blindly transfer exact-byte expectation across machines);
- for M0/null require historical quantized raw-Pa sha `dc14c78b...` where the original pinned fixture matches; for four nonnull product Takes freeze new output references **before evaluating a new acceptance run**. If no independent frozen product oracle yet, allow only `SHAPE_VERIFIED / PHYSICAL_REPLAY_VERIFIED_WITHIN_MODEL / NO_FROZEN_PRODUCT_ORACLE`, not a claim that the S5-style stronger frozen equivalence was met;
- provenance: verify physical receipt, raw NPY Pa bytes/dtype/units, fixed task plan, source actual-run SHA availability (currently unknown on Studio path), preview WAV conversion and integrity, load and observer; ensure raw pressure not confused with peak-normalized preview amplitude or calibrated ear SPL;
- adversarial control from Core PR #273 R2: forge `2*p_null-p_variant` while preserving raw L2 magnitude, regenerate all WAV/hash manifests and demand failure from **fresh waveform re-execution**, plus tamper a saved oracle metric and update its SHA; demand failure.

**600 Hz:** [Core VM-1D #205](https://github.com/ryonakayama234/morphoacoustics/issues/205) explores whether an ideal inlet-flow source boundary affects 600/100 Hz mouth-port ratio; [VM-1C #203](https://github.com/ryonakayama234/morphoacoustics/issues/203) concerns load approximation. These are **hypotheses, not accepted causal explanations**, and are not OD-2 product acoustic quality promises. Do **not** make their resolution a B1 block. Record conditional H600/H100 at fixed source/load/observer as a *diagnostic regression* if the relevant data are obtainable without altering the frozen model; unanticipated change under identical pins is a STOP for integration, while the already known and unchanged phenomenon remains `UNRESOLVED_RESEARCH_LIMITATION`. Keep its scientific investigation independent.

**Rejected.** Hashes-only replay; relative L2 only (known forgery); a resonance peak or sound audibility as geometry validation; comparison of frequency-domain ideal pressure-release impedance to finite-load pressure as if equivalent; 600 Hz explanation by ad hoc EQ or changing source.

**Falsifiers / STOP.** An altered geometry and corresponding forged aggregate norms pass; physical waveform can be swapped while hashes match an internally forged receipt; oracle compares different load/plane; M0/null drift unaccounted; one product body lacks rerun/receipt but claims full verified.

## QP4 — Stage order, acceptance, Owner GO

**B0 disposition: AGREE for planning.** [S5 #50](https://github.com/ryonakayama234/morphoacoustics-studio/issues/50#issuecomment-6736075443) recorded M0/M1 Core pinned physical Take, raw hash and independently checked BagIt at owner PC. This is the bounded B0 condition, not provenance-complete or quality-complete. Do not reexecute B0 merely to rename it.

| Stage | Scope (future work; NOT now) | Exit evidence required | Separate Owner GO? |
|---|---|---|---|
| **P0 / preflight** | Read-only audit of pinned Core, two research bodies, exact v1 schemas, model and source inventory, legacy CC-B1 separation, existing archived Takes; freeze bridge/negative plan | Reviewed compatibility matrix: old b569 vs proposed new Core pin, four revision IDs + two aliases, exact fields/refusals, frozen oracle inventory, rollback and backup plan. No audio claim | **YES** for P0 start after plan adoption; no code |
| **P1 / Core release boundary** | Promote only closed-world OD-2 revision capabilities through one Core registry/CLI identity authority; selected-body preparation and re-derivation; no free edits | Four product-authorized nonnull, two null alias; exact parent/receipt/shape, restart/readback, illegal cases denied; Core G0/OD2/CC-A2 regressions exact pin and negative suite; stable versioned protocol receipt | **YES** |
| **P2 / contract + façade** | Core pin migration; select one derived body under audited CC-A2 path; v1 compatibility proof (or stop for explicit v2 plan); result/provenance triangle and typed failures | Real fresh CC-A2 fixed performance on all selected bodies; M0/M1 old regressions; mismatched pin/receipt/source/task/observer rejected; refusal never emits credible audio; no old Take reinterpretation; physical action and source hash states honest | **YES**; if v2 required, an extra schema GO first |
| **P3 / Character and Take** | Extend Character BodyRef allowlist/validation and immutable revision/Take envelopes only after approved contract; retain CAS and BagIt | Character edit→new immutable revision→restart→same exact Core ref; previous head/revision/Take unchanged; archived physical artifact hashes validated; tamper/missing/collision/duplicate and CC-B1 negatives PASS | **YES** |
| **P4 / frozen-slot UI** | STOP-AND-PROPOSE then Inspector discrete picker, Character schematic, library references and Take visibility; no new panel/mode | Both centers and all three ratios, two alias behaviors, no M1 edit, no free input; actual save/perform/A/B/export; keyboard/ARIA/mobile 320px, legacy reachability and truthful badges; screenshot evidence + Muse UI review | **YES — separate explicit UI GO** |
| **P5 / B1 limited baseline** | Owner-PC fresh fixed-task source and four nonnull revisions, M0/M1 controls under same new runtime as needed, two null aliases, verified BagIt and independent readback | Receipt/ID/geometry/raw Pa/WAV/task/provenance/digest table; known old S5 comparison labelled *different pin* unless controlled; two independent external copies as appropriate; all omissions UNKNOWN; owner accept limited workflow separately | **YES — independent bounded acceptance, not quality GO** |

At every stage, publish exact SHA, environment, checked and skipped tests, negative evidence, Muse acceptance and rollback state. Any failed step blocks subsequent implementation GO; no broad one-shot implementation authority. Stage boundaries may reorganize PRs if temporary unsafe states are found, but preserve distinct review/acceptance gates.

**Rejected.** One oversized Core+Studio+UI implementation merge; product UI before Core authority; automatically passing later stages on CI green; reviving B0 as an unbounded new feature.

**Falsifiers / STOP.** Later stage requires undocumented v1/v0 reinterpretation; cannot preserve existing S5 Takes; an earlier stage accepted without real exact-head tests; individual steps cannot be rolled back safely without hidden data migration — amend plan before authorizing implementation.

## QP5 — Exact UI allocation (frozen V2 slots)

**Recommendation.** `project.library` selects *references* to Character/body assets; `character.canvas` shows current M0/M1/OD-2 **one tract with sixteen discretization sections** and a visual difference for 5 affected cells, not 16 independent organs or a 3D model; `selection.inspector` owns one bounded recipe picker (center 4/8; ratio 0.90/1.00/1.10), plus parent and resolved revision ID, read-only digest and status; `motion.canvas` retains fixed "あい"-like three-task, no source knobs; `take.transport` keeps real immutable A/B/ZIP; `research.drawer` exposes source, model/load/plane, raw receipt, hashes and 600-Hz caveat. No extra mode, panel, direct free-number entry, unrestricted graph drag, material property slider or CC-B1 dual editing.

Suggested compact interaction copy (not UI implementation):
```text
BODY  M0 (base) / M1 (prevalidated) / M0 local-shape OD-2
       centre  [4] [8]       area factor [0.90] [1.00] [1.10]
       changed sections [c-2 ... c+2] (area, not length)
       parent M0@1 / Core Revision <short id> / provenance status
       [Save Character Revision] -> [Perform fixed task] -> [Compare Takes]
```
When M1 selected the OD-2 picker is absent or clearly unavailable; never silently interpret as M0 edit. Both `ratio=1.00` selections point back to M0 and display "unchanged M0" without minting BodyRevision. UI must differentiate *selected unresolved* vs *Core bound at actual performance* and not show old TAKE as already upgraded.

**Character persistence.** Successful BodyRef selection means a new immutable Character revision; `head.json` changes by CAS with 409 conflict path. Old Character revision and original Takes keep their own Core/body/preset/source/adapter pins and exact snapshots; historical Take is never retrofitted with newly selected body. No browser localStorage migration or legacy ID replacement as side effect. Legacy CC-B1 remains independent via real `research.drawer` access. Maintain S4's limited Take lookup UX, not a falsely complete Take listing.

**Rejected.** New body-editor pane, modal with real sliders, separate CC-B1/OD-2 shared selector, "edit any section", synthetic 3D organism, deactivating real legacy navigation, showing model-quality acceptance badges.

**Falsifiers / STOP.** Invalid M1-center edit accepted; two alias selections mint revisions; visible current body differs from server head after reload; history changes; a false enabled control or hidden legacy regression; inaccessible picker / mode or frozen slot violation.

## QP6 — Baseline protocol and defensible claims

**Recommendation: include a B1 limited S5-pattern product baseline.** Preserve archived S5 M0 and M1 as b569-era immutable historical observations. Collect four nonnull OD-2 product-body fresh fixed three-task physical Takes (and two alias/null qualification checks); collect same-new-pin M0 and M1 where needed for controlled regression. For each variant record exact date/time, Character ID/revision, BodyRevision ID and Core receipt, family+parent+center+ratio, prepared digest, compiler/task-plan SHA, source ID and *RECOMPUTED vs actual-run unknown* state, code/tool/env pins (incl NumPy), raw float64 Pa SHA and measurement plane, quantized SHA where frozen, WAV hash/bytes, gain policy, fixed source/load/clock, v1 request/result, immutable take-id, external BagIt SHA and independent manifest verification. Do not pretend a GitHub CI artifact replaces owner-PC local backup or a green snapshot replaces a new physical Take.

Acceptance terms: `BODY_SHAPE_VERIFIED`, `PHYSICAL_EXECUTION_VERIFIED_WITHIN_PINNED_MODEL`, `CHARACTER_TAKE_HISTORY_VERIFIED`, `INCOMPLETE_PROVENANCE`; explicit `full VERIFIED SOURCE: UNKNOWN`, `AUDIO_QUALITY: NOT_ADOPTED`. Keep existing Studio #32 creator quality NO-GO independent. Numerical waveforms and their L2 do not prove timbral identity or natural speech.

**Proposed externally safe completed-B1 wording:**

> Under an audited Core revision and its bounded `tract1d.local-log-area-5.v1` model, Studio can select/save the four nonnull Core-issued OD-2 local rest-shape body revisions plus the M0 null alias, perform the existing fixed CC-A2 gesture/source conditions, and retain/export immutable Takes with model-causal receipts. This is a limited one-dimensional body-edit and creator-history workflow. The provenance remains incomplete; full source verification and creator audio-quality adoption are not claimed.

**Rejected.** Describing B1 as freely editable anatomy, tissue/FSI, speaker realism, perceived voice-color separation, natural "あい" pronunciation guarantee, neural improvement, fully verified source, calibrated listener SPL.

**Falsifiers / STOP.** Any body lacks independently readable exact physical receipt; archive manifests cannot reverify; new Take silently points to updated body; quality status inferred from physics PASS; source actual-run sample SHA stated as known despite being absent.

## Refinements beyond questionnaire

### R1 — A finite catalog is better than a generic body registry in B1

Four nonnull recipe IDs is an *extremely small closed world*. Treating B1 as an arbitrary mutable anatomy registry introduces unnecessary issuance, migration and identity risk. Prefer **Core-owned immutable capability catalog** with re-derivation and existing `BodyPresetRegistry` binding authority; keep the persistent receipt/archive layer append-only. A generic registration service can wait for B2/B3 or freely composable families. However, if Muse concludes OD-2 G3 explicitly requires a durable general register/resolve protocol to be called a reusable asset, stop and distinguish "fixed released catalog" from "reusable arbitrary body registry": claim only the former at B1.

### R2 — Three different identities must never collapse

```text
Creative identity     character_id + character_revision
Physical lineage      Core family + parent + operation + revision_id
Execution evidence    prepared_digest + source/task + solver/observer +
                      code/dependency pins + actual raw artifacts
```

The same Character can hold different physical bodies; different Characters can share a body. A BodyRevision can be prepared under a different code/provenance version with a different preparation digest. Even an identical raw waveform does not establish identical BodyRevision or provenance. v1 transport `preset_id@1` is not the lineage key.

### R3 — Contract compatibility is a proof obligation, not a preference

Do not design v2 merely because a new `kind` is convenient, but do not avoid v2 merely to save migration work. The test is whether the **full lossless provenance triangle** can be demonstrated with unchanged v1 and exact supplemental receipt, including negative/tamper/restart tests. This decision is an explicit P0 checkpoint with a stop condition.

### R4 — Novelty must be measured in persistence and causal transfer, not audio difference

OD-1 already measured center4 ~5.6% and center8 ~2.7% raw pressure relative L2, OD-2 archived/replayed the shape and pressure. B1 novelty is that a user may make a persistent versioned creative choice, execute it later under checked source/task, and retrieve comparable immutable Take history. A "6 new sounds" claim misses the target, and a product bridge passing only saved WAV replay is insufficient.

### R5 — Independent physical checks and human quality must never be conflated

Metamorphic null/mutation/identity tests are suitable to verify simulations lacking an external ground-truth oracle; that is distinct from model validation against anatomical measurements, and from creator's quality acceptance. See Raunak & Olsen (2021, NIST) https://www.nist.gov/publications/metamorphic-testing-continuum-verification-and-validation-simulation-models (externally checked). One-dimensional cascaded tubes and finite-range acoustic use are established in Takemoto, Adachi & Toda (2023), https://doi.org/10.1250/ast.44.9 (externally checked); VTL's general geometry–area–acoustics separation is documented at https://www.vocaltractlab.de/index.php?page=background (externally checked). None independently confirms OD-2 registry implementation, 600 Hz cause or perceived voice quality.

## Muse reverse questions (default recommendation supplied; do not block QP answer)

**MQ1 — v1 transport proof vs v2.** Is a Core-authored immutable `BodyRevisionRef` that resolves to a derived `preset_id@1` for unchanged CC-A2 v1 execution, plus an independently verified OD-2 receipt in the Take, acceptable? **My default:** yes *only after exact lossless lineage/readback and refusal tests*; otherwise explicit v2 gate, no in-place schema mutation.

**MQ2 — closed-world catalog vs persistent registration service.** For precisely four new variants + M0 alias, can a signed-off, Core-owned, fixed versioned manifest with trusted re-derivation and restart readback meet B1 product identity, without a generic mutable registry? **My default:** yes; never claim arbitrary mutable body issuance. Clarify if OD-2 G3 "durable registry" must mean a service, rather than a durable immutable closed catalog.

**MQ3 — Core migration/600 Hz interpretation.** Is the B1 policy "new audited Core pin, preserve old b569 Takes as historic, new-pin M0/M1 controls, 600-Hz effect explicitly unresolved but check regression, no source fix in B1" sufficient? **My default:** yes. If existing VM-1D/VM-1C evidence has since produced an adopted *blocking* acoustic invariant, provide its exact merged source and threshold; absent that, no new causal promise.

**Reply format requested of Muse:** MQ1/MQ2/MQ3 = AGREE / REVISE / REJECT, exact evidence refs, reason and falsifier. Also review QP1–QP6 independently; identify conflicts with frozen contract before Owner adopts the plan. A Muse reply is not assumed here.

## Final authorization rule

This document is **a docs-only Research Lead recommendation**, not a change permission. Muse may accept/revise; Owner alone approves the final plan and each future implementation/UI/migration gate. PR #55 must remain Draft and unmerged until Owner makes a separate merge decision. Any actual code/schema/UI change, new Core pin, physical product claim or quality claim requires its own explicit GO.
