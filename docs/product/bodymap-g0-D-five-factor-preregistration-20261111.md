# BODYMAP G0 / D — Five-factor preregistration template and capability matrix

**Document:** BODYMAP-G0-D-20261111-01 · **Status:** TEMPLATE / REGISTERED_NOT_RUN / NO EXPERIMENT GO / 2026-11-11 JST  
**Normative source:** [adopted G0 QG2/QG4](body-map-g0-response-20261111.md), [BODYMAP-R](body-module-map-response-20261111.md), [Muse MQ3 AGREE](https://github.com/ryonakayama234/morphoacoustics-studio/pull/59#issuecomment-6795436085). **Scope:** experimental design only, not a run report, Studio/Core implementation, approval of source physics, validated feature method, G0 freeze, B1 P2 gate or sound-quality claim.

## 1. Five-factor capability matrix (fact vs proposal)

| Factor | Permitted one-factor intervention candidate | Other factors to hold fixed | Existing capability / evidence | Status now / claims forbidden |
| --- | --- | --- | --- | --- |
| **SOURCE** (S1/S2) | future independent source drive/waveform, keeping tract+load+observer+motor fixed; track source spectrum, fundamental and load response | tract, boundary, observer, motion | Studio currently prescribes **lf_fixed 100 Hz**, not a user-adjustable body source; historical source sample SHA is RECOMPUTED, not actual-run attested | **BLOCKED_BY_CAPABILITY in current Studio**. Fixed input identity can be *checked*; do not claim free phonation, self-oscillation, source–tract feedback, or physiology |
| **TRACT** (S3) | **Studio M0↔M1 length change** within b569 lineage; separately **Core OD-2** 5-cell rest-area intervention c4/c8 × 0.90/1.10 with null 1.00 | source, boundary, observer, motion | Studio M0/M1 existing product path (16×0.010m vs 16×0.011m); Core OD-2 six-case research P1 catalog at b5dc95d, 4 revisions + 2 aliases | **BOUNDED_CAN_RUN** only in their **separate exact-pin settings**; M0/M1 is length, NOT local-area edit; OD-2 research is NOT Studio P2 |
| **BOUNDARY** (S6/S7) | future matched-geometry terminal load Zload or viscothermal wall loss, monitor loaded H/Z and passivity | source, tract, observer, motion | current fixed inherited resistive terminal, rigid-wall/lossless idealization; other source-free loaded or open-boundary references exist only in separate research contexts | **BLOCKED_BY_CAPABILITY in Studio**; do not present fixed source-free transfer as effect of a measured varying radiation/load |
| **OBSERVER** (E1/E2) | apply a known *display transform* (e.g. +6dB gain vs unchanged) without changing native pressure | source, tract, boundary, motion | current **nominal 0.20m Pa pressure proxy** and peak-normalized preview; display gain is accessible as a transformation | **DISPLAY_ONLY**. Does not identify real distance, pinna/ear, close field, calibrated SPL or changed body sound |
| **MOTION** (C1/S4) | future temporal onset/overlap/task changes at identical body/solver/source/load/observer | source, tract, boundary, observer | Studio fixed “あい”/3-task/seed0; Core OD-3 offers limited research timing/coordination examples | **BLOCKED_BY_CAPABILITY in Studio**; Core OD-3 remains RESEARCH_ONLY and not arbitrary Studio motion or MotorPersona |

**Interactions:** source×tract bidirectional coupling, boundary×source, motion×tract and arbitrary multi-organ interactions are **NOT_IDENTIFIABLE_WITH_CURRENT_MODEL** (or **UNMODELED** when there is no physics). In an externally prescribed source model, “source did not respond to tract” means the source was *held fixed by construction*, not that a biological source is independent. No claim of complete five-factor separation is permitted.

## 2. Preregistration header (copy before any new experiment)

| Required prereg slot | To be filled by the experiment owner *before* first run |
| --- | --- |
| prereg_id / revision / title | Unique immutable ID; supersede with new revision, never rewrite a post-result hypothesis |
| status | **REGISTERED_NOT_RUN** (current template), later separately RUN / REVIEWED / STOP / UNKNOWN; never PASS from a template |
| scientific claim and competing null | A falsifiable geometry-only response in the bounded solver versus no response or invalid identity; distinguish signal/geometry from listener perception |
| target factor and sole intervention | Exactly **TRACT** for representative registered run. Define single Core 5-cell local log-area operator family and case IDs; M0/M1 constitutes separate *length* experiment |
| execution lineage | Core research pinned **b5dc95ddbf00efe423635e8ff73f2b550239cd2b** for prospective OD-2 protocol or **b569f044bfda309dff1a00cccf8365754e6b1355** for Studio M0/M1; **never mix the outputs as paired cases** |
| environment | Python/NumPy exact versions, architecture, solver commit and dependency digest, seed, source generation runtime; enter real values when registered, not assumed from earlier runs |
| positive / null / mutation | Explicit named cases and oracle expectations in sections 3–4; no missing negative counterexample |
| fixed four factors | Table in section 5; exact sample source equivalence must be evidenced, not asserted from RECOMPUTED hash |
| measurements | raw Pa [Pa], frame count/time, body rest areas [m²] and lengths [m], relative L2 [dimensionless], optional matched-load complex H/Z, numerical flags, model-proxy level [Pa]/dB re 1Pa; validated method IDs required for derived metrics |
| statistical/algorithm choices | primary/secondary outcomes, sample counts, windows, confidence bounds, null comparison and all cutoffs **frozen before new results**; declare deterministic exact-run tests vs inference across samples |
| independent oracle | Independent shape and loaded complex/waveform evaluation (not reading saved result against itself); pin, source, reference plane, tolerance and failure oracle preregistered |
| provenance and data retention | immutable request/body/receipt/raw manifests and SHA scopes, source actual-run vs RECOMPUTED, preview and gain separation, archive access/replay, reviewer |
| listening | **separate prereg**, after physics tests locked; participant number, blinding, counterbalance, loudness normalization, null/mutation stimulus exclusions, hypothesis/analysis/correction |
| capability and stop/GO | BLOCKED_BY_CAPABILITY markers for unsupported factors, unmet reference plane, method, source or artifact qualification; Muse design review and **separate Owner experiment GO** (not G0 freeze) |
| reviewer and approval | Muse AGREE/REVISE/REJECT, Owner experiment-specific GO, timestamp, prereg commit+content SHA; blank until authorized |

## 3. Bounded TRACT representative cases — Core research **only**

**Suggested prereg ID:** BODYMAP-G0-TRACT-OD2-TEMPLATE-01; **status REGISTERED_NOT_RUN**. The following cases come from previously reported **Core OD-2 RESULTS**; listing them is not a new execution or result. Use the 1D original M0 parent and **tract1d.local-log-area-5.v1** only: 16 segments × 0.010m = 0.160m; center is zero-based; exactly five local log-area-affected cells in a nonnull case; all lengths unchanged. Request exact textual ratios only, not arbitrary float interpolations.

| Registered case | What varies in tract | Baseline control | Expected structural identity (not new data) |
| --- | --- | --- | --- |
| OD2_C4_R090 | center 4, exact ratio "0.90" | shared original M0 | nonnull distinct Core-authored revision |
| OD2_C4_R100 | center 4, exact ratio "1.00" | shared original M0 | **NULL ALIAS**; same parent; no new revision |
| OD2_C4_R110 | center 4, exact ratio "1.10" | shared original M0 | nonnull distinct revision |
| OD2_C8_R090 | center 8, exact ratio "0.90" | shared original M0 | nonnull distinct revision |
| OD2_C8_R100 | center 8, exact ratio "1.00" | shared original M0 | **NULL ALIAS**; same original M0; no new revision |
| OD2_C8_R110 | center 8, exact ratio "1.10" | shared original M0 | nonnull distinct revision |

**Null test:** repeat the exact M0 original body/source/task/load/observer with same pin/runtime; compare identical body receipt/preparation, and raw Pa under the preregistered exact-run tolerance. Both r=1.00 requests must resolve to M0 and not generate new revisions. **M0 vs M1 is a positive length variation, NOT a null control**. The historical OD-2 reported raw relative L2 vs M0: c4/0.90=0.05627127292070631, c4/1.10=0.05680526299910064, c8/0.90=0.02659999178612523, c8/1.10=0.027079007843954235, both nulls=0. They are **prior evidence for planning**, not preregistered observations from a new run; not a dB, human loudness, statistical significance or speaker-identification threshold. Any claim of new blinded experimental confirmation requires separate unseen data.

**Alternative Studio study (do not pool):** under historical Studio/Core pin b569, M0 (16×0.010m) vs M1 (16×0.011m) with fixed source/task/terminal/proxy; label **length-only tract intervention**. Existing Owner-PC S5 Takes are historical REPORTED_ONLY, not a new controlled intervention with matched run attestation. A fresh paired prereg must be independently approved before further run claims. Studio B1 P2 (formal b5dc95d) remains separately gated.

## 4. Predeclared mutation controls (not bona fide physical cases)

| Mutation ID | Adversarial change | What the verifier must detect / why |
| --- | --- | --- |
| **MUT-IDENTITY** | swap center or ratio, parent/preset, Core revision/preparation digest or Core pin; leave claimed success | refuse mismatched physical identity; no new BodyRevision generated by Studio |
| **MUT-BOUNDARY** | swap terminal resistance, observation plane or time/grid without new prereg revision | refuse mixed physics and avoid false one-factor attribution |
| **MUT-RAW-WAV** | mutate a native raw Pa sample, a WAV sample, or one artifact SHA while retaining stored success status | hash+physical replay and preview-transformation chain must refuse |
| **MUT-COORDINATED-L2** | replace a nonnull native waveform with **2*p_null - p_variant**, retain its relative L2, recompute shared gain + all six WAVs and the decision/manifest hashes | **independent fresh body-driven waveform oracle** must reject; hashes and aggregate L2 alone are inadequate. This was historically tested in Core OD-2 R1/R2, not reexecuted here |
| **MUT-GAIN-AS-BODY** | alter only preview playback gain / per-Take normalization, report changed raw pressure/physical source or geometry | reject attribution; raw Pa hash and all physical fixed factors unchanged |
| **MUT-FAKE-SOURCE** | populate historical actual_run_samples_sha256 using later generator RECOMPUTED SHA | reject RQ1 strict B source promotion without same-run consumed-buffer proof |

These are **negative fixtures**, not included as normal positives or listener-rated audio. Each mutation must have an expected typed refusal/no-audio outcome, a reviewer-independent oracle and immutable evidence before running. A verifier that merely reopens and trusts a mutually forged manifest **fails**.

## 5. Four fixed factors for the TRACT prereg

| Factor to hold fixed | Concrete proposed setting and required proof |
| --- | --- |
| **Source** | prescribed **lf_fixed, 100 Hz**, fixed exact generator version and sample contract, source source_id and full pin/runtime recorded, **sample SHA as RECOMPUTED unless same-run capture exists**; source–tract coupling UNMODELED. A source identity mismatch invalidates attribution. |
| **Boundary** | same 1D inherited rigid-wall/lossless model; **resistive terminal Zload = 0.05 rho*c/A_last**; same rho [kg/m³], c [m/s], terminal model/coefficients, port orientation, time/phase conventions. Since A_last must be preserved for nonnull OD-2 local cells, compare effective load values explicitly. |
| **Observer** | same **0.20m monopole pressure proxy [Pa]** in model, same reference plane, sampling **48 kHz × 24,000**, raw (pre-preview) processing; **not calibrated SPL**. All per-Take WAV normalization/display gain excluded from primary physical outcome. |
| **Motion** | identical fixed **“あい” 3-task score, seed 0, 0.5s**, task-plan SHA **17148dea27e59abfb626b149beebcc7893d4ff9ba04ce4cf3af9ad408ce8a7bf**, same t0 and frame counts; no variable MotorPersona or timing edits. |

The **tract factor** can be studied in this limited inherited system; it does not identify physical mechanisms absent from the system (flexible walls, varying source, real observer, fluid–structure interaction). A constant prescribed source is a boundary condition, not evidence of organ-independent physiological causality.

## 6. Measurements, numerical oracle and listening: different verdicts

1. **Measurement pass/fail [proposed]:** record **raw native f64 Pa** artifact and sha_scope, p_rms in Pa, count, finite/numeric state; geometries/length and signed or complex response at a fully specified port/load. **Primary** for the bounded Core tract study: fresh native raw Pa relative L2 to independent M0 null and 5-cell law. **Secondary:** matched-load complex transfer, proxy level and only features with a qualified frozen method. Preview WAV is artifact integrity only.
2. **Numerical correctness oracle [historical tolerance anchors, not adopted as a new G0 gate]:** original OD-2 log-area max residual ≤1e-12; relative rest volume ≤1e-12; timed log-area ≤1e-10; matched-load complex relative error ≤1e-9; same-runtime independently reexecuted full-waveform relative L2 ≤1e-12. These refer to exact inherited OD-2 physics and recorded test conditions ([A3/R1/R2 provenance](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/research/od2-reusable-physical-body-20261102/RESULTS.md)); **never transplant blindly to a different source, backend, pin, grid or future experiment**. A new prereg freezes its own justified methods/tolerances and false-positive handling before viewing new output.
3. **Replay is reproducibility, not independence:** same runtime+source+task reruns and hash matching are repeatability checks. A true **independent oracle** recomputes from trusted parent geometry/area law, matched-load transfer and wave propagation rather than solely trusting stored L2, saved “passed” flag, updated manifests or opaque labels. The coordinated L2 forgery must fail independent waveform replay.
4. **Listening is a separate blinded evaluation:** only after physical reference data, oracle method and cutoffs are locked. Separate ABX/2AFC protocol, normalization choices, stimulus randomization, listener sample/exclusion design, analysis plan, confidence intervals and multiplicity correction; listeners/analysts receive condition-blinded labels. “Audibly different” cannot validate the physical model or imply natural voice/character utility. A preferred WAV is neither a new anatomy nor a pass for a numerical oracle.
5. **Unmeasurable outcomes:** absent raw bytes, wrong pin/plane, unavailable source attestation, unmodeled coupling or unvalidated feature must be labeled UNKNOWN / METHOD_UNFROZEN / BLOCKED_BY_CAPABILITY or a typed refusal; never auto-mark PASS. Physical measurement, implementation oracle and perceptual results carry separate IDs and claims.

## 7. Stage gates and reviewer checklist

**G0 artifact review (this PR):** Muse verifies A–D match the adopted QG response; feature methods are DEFINED_NOT_VALIDATED with null rules; C's S5/OD2/S3 evidence is REPORTED_ONLY, 3-way matrix and OPEN ledger are nonretroactive; D names permitted vs blocked factors, one-factor intervention, null, adversarial mutation, four immutable controls and separate measurement/oracle/listening. No experiment execution is required to review this template.

**Experiment authorization (NOT GRANTED HERE):** before a proposed run, confirm (i) supported exact pin/backend and four fixed factors with hashes, (ii) case/null/mutation and independent oracle, (iii) raw/plane/source qualifications, (iv) frozen methods/error thresholds before results, (v) STOP for blocked factors, (vi) Muse prereg review and **Owner's distinct experiment-specific GO**. No GO from existing Core RESULTS or G0 docs alone.

**G0 freeze decision (NOT GRANTED HERE):** Muse review of A–D, followed by separate Owner adoption record **E**, identifying **specific document content SHA-256 and exact Studio commit**, accepted method IDs/status and scope. Draft/merge ≠ contract freeze. **B1 P2** remains independent and held under [Studio #54](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54): no fresh product baseline is supplied by this prereg, no prior gate changed, and no G2 B2 experiment GO is implied.
