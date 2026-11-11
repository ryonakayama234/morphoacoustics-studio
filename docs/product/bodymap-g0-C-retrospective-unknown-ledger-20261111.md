# BODYMAP G0 / C — Retrospective evidence and UNKNOWN ledger (initial)

**Document:** BODYMAP-G0-C-20261111-01 · **Status:** INITIAL RETROSPECTIVE INDEX / REPORTED_ONLY / UNKNOWN OPEN · **2026-11-11 JST**  
**Source of authority:** [Owner-adopted QG3](body-map-g0-response-20261111.md), [Muse MQ2 AGREE](https://github.com/ryonakayama234/morphoacoustics-studio/pull/59#issuecomment-6795436085), [Studio #58](https://github.com/ryonakayama234/morphoacoustics-studio/issues/58). **No new physics runs, archive downloads, native pressure recalculations or independently verified ZIP bytes were performed for this document.** It is not a new Take pack and does not repair historical provenance.

## 1. Classification rules / claim boundary

Each fact is evaluated by **(origin_evidence_id, field_path, method_id, source_anchor)** and its specific observation plane. The three top-level evidence classes are:

1. **M = MEASURED**: The *historical* trusted run report/receipt contains a value and its measurement context. Initial qualification for ALL rows here is **REPORTED_ONLY**, meaning copied from authoritative published reports rather than independently re-read source bytes in this round. M **does not** mean newly remeasured or BYTES_VERIFIED.
2. **R = RECOMPUTABLE** only if the exact original raw bytes/receipt, pin, plane, units and independently reviewed frozen method are **available and verifiable** without a new physical run. Where the record only *reports* an archive, label **R-CANDIDATE, currently UNKNOWN pending bytes/method**, not RECOMPUTABLE as an accomplished status. When calculated, append **DERIVED_RECOMPUTED** with new artifact SHA/method/runtime/time; never modify M.
3. **U = UNKNOWN** if not captured/attested, archive unavailable, method not frozen, pin/plane ambiguous, or capability unmodeled. **NOT_APPLICABLE** requires demonstrated non-applicability (e.g. refused job with NO_AUDIO) and is separate from this three-way coverage. Unknown must stay null, never zero, silent, or inferred from preview.

For each retrospective row, **origin_class=RETROSPECTIVE, backfill=false, evidence_level=REPORTED_ONLY, resolution=OPEN where an UNKNOWN is present**. If later independently obtained bytes qualify a *specific field*, append a new assessment with its own reviewer/source hash, preserving the old row. An unverified source SHA or apparent equal hashes do not prove that historical solver consumed identical bytes.

### Immutable origin anchors

- **S5 reported Owner-PC evidence:** [Studio #50 S5 complete, comment 6736075443](https://github.com/ryonakayama234/morphoacoustics-studio/issues/50#issuecomment-6736075443), Studio code at reported **daef28b**, Core pin **b569f044bfda309dff1a00cccf8365754e6b1355**, Python 3.12.3 / NumPy 2.4.6. ZIPs remain on Owner PC; this round did not fetch them. Archive SHA strings below are *published prefixes only*, not verified full hashes.
- **Core OD-2 six research runs:** [RESULTS at formal B1 Core pin b5dc95d](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/research/od2-reusable-physical-body-20261102/RESULTS.md) and [P1 closed catalog protocol at same pin](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/product/body-b1/P1_CORE_CATALOG_PROTOCOL.md). Final OD-2 reexecution gate was at **e358402d…**, [Actions 41324965684](https://github.com/ryonakayama234/morphoacoustics/actions/runs/41324965684), output [artifact 13090413183](https://github.com/ryonakayama234/morphoacoustics/actions/runs/41324965684/artifacts/13090413183). This is **Core research** and not fresh Studio B1 P2 evidence.
- **S3 façade acceptance:** [Studio #48 disposition](https://github.com/ryonakayama234/morphoacoustics-studio/issues/48#issuecomment-6722438230) and [PR #49 independent Muse acceptance, comment 6722417050](https://github.com/ryonakayama234/morphoacoustics-studio/pull/49#issuecomment-6722417050). Accepted head **2116030d34f39cec3c0c33cf976fef6005025fe0**, merge **daef28b**. Policy regressions reported **v0 8/8, archive 12/12, Character 11/11**; these are path/policy assertions, not a blanket audio feature measurement.

## 2. Initial M / R / U matrix (nine primary evidence rows)

**Reading:** M shows **only reported historical values**; R? means candidate only *conditional on original artifact bytes and frozen method*, not a current RECOMPUTABLE claim. U lists some initial unresolved fields. Each row has **evidence_level=REPORTED_ONLY** until source-specific verification occurs.

| evidence_id / existing artifact | M — historical evidence (REPORTED_ONLY) | R? — future conditional derivation (NOT YET QUALIFIED) | U — initial UNKNOWN / not promoted |
| --- | --- | --- | --- |
| **S5_M0** / Take **take_studio_v0_41877a7b213a499fb054c3fc59e3e2c8** | Character **5f0bcaa7-0625-46fd-ae62-64578e7ad303**; 48,044-byte preview WAV SHA prefix **18031e89cc7469ac2…**; quantized raw pressure SHA prefix **dc14c78bcc6d4a19c1…**; common task SHA prefix 17148dea…; envelope SHA prefix 654ba514…; Owner ZIP 272,475 B, prefix 85dc379f…; M0 X2A quantized oracle match **reported**; INCOMPLETE_PROVENANCE | native raw Pa RMS/F0/output peaks/time features **only after Owner BagIt original bytes verified + method frozen**. WAV alone insufficient | actual-run consumed source SHA; full VERIFIED SOURCE; calibrated SPL/receiver; physical effort; biological source/coupling; any unrecorded listener response |
| **S5_M1** / Take **take_studio_v0_c606fd53bf1447e9970f5a818b4f0325** | Character **2296cf03-cf91-4467-96fc-731233ea562a**; 48,044-byte preview WAV SHA prefix **811cacadee6e0e64d2…**; quantized raw pressure SHA prefix **ef01233d210e0f098c…**; same task SHA prefix; envelope SHA prefix 2beac90e…; ZIP 273,243 B, prefix 1fc897c5…; INCOMPLETE_PROVENANCE | same byte+method constraints as M0, derived feature separately with input hash and exact plane | same as M0; no imputed native amplitude from its per-Take normalized WAV |
| **OD2_C4_R090** / Core research | center=4, ratio="0.90", validated *nonnull* Core revision receipt; raw Pa relative L2 **0.05627127292070631** | if original native f64 Pa NPY / full receipt verified: feature derivation under common method (not a Studio Take); source generator rerun is RECOMPUTED | product Take ID, S5 same-pin comparison, actual-run source attestation, calibrated SPL, natural voice |
| **OD2_C4_R100** / Core research | center=4, ratio="1.00": **original M0 null alias**, relative L2 **0.0**; **no minted new revision** | if source bytes available, native feature derivation or reference M0 comparison; not a new physical revision | fabricated revision ID forbidden, product Take ID, actual-run source attestation, calibrated SPL |
| **OD2_C4_R110** / Core research | center=4, ratio="1.10"; nonnull Core revision **od2-7c2663189d907111665544c67def56c885576f5394e4220ec12251e0ca5ebf67**; prepared digest sha256:f2778205243970d43ca3ea0151b91286fd9c46fb85b8867a8efbb7b811e6da0a; relative L2 **0.05680526299910064** | exact Core archive raw and qualified method only; P1 rederive is NOT old run measurement | Studio P2 Take, actual-run source SHA, calibrated receiver, listening outcome |
| **OD2_C8_R090** / Core research | center=8, ratio="0.90"; nonnull Core revision **od2-d722dfb9595672f0d19c46a8780c610c9d41fc3a8935b93d3d01a5d68aab4084**; prepared sha256:4b4300f05d0ea98d2edc3e6c17d8075fd29a51c8de91af599a94fa663b602375; relative L2 **0.02659999178612523** | original NPY verified + method; same-run research raw replay is not new Studio path | Studio P2 Take, actual-run source SHA, calibrated receiver, listener claim |
| **OD2_C8_R100** / Core research | center=8, ratio="1.00": **same original M0 null alias**, relative L2 **0.0**, no revision minted | conditional original native raw feature derivation only | invented independent null body ID, Studio Take ID, actual-run source attestation |
| **OD2_C8_R110** / Core research | center=8, ratio="1.10"; nonnull Core revision receipt; relative L2 **0.027079007843954235** | conditional original native raw feature derivation only | Studio P2 Take, actual-run source SHA, calibrated receiver, sound quality |
| **S3_FACADE_ACCEPTANCE** / PR #49, Issue #48 | frozen Character snapshot→M0/M1→real Core request→v0 envelope / refusal policy path; replay/pin-drift/mismatch/NO-WAV tests; actual_run_source_samples_sha256=null, full_verified_source_state=UNKNOWN, provenance INCOMPLETE_PROVENANCE; policy **8/12/11** reported passed | if original test fixtures / saved envelope bytes and exact pin are verifiable, recheck the same *policy and hash* assertions, **not** infer pressure/F0 from a PASS count | any generic per-Take raw Pa/F0, source actual-run proof, b5dc95d product revision authorization, absolute SPL, physical source–tract coupling |

**Shared conditional facts [F, REPORTED_ONLY]:** both S5 Takes used prescribed lf_fixed 100Hz and fixed 3-task/seed 0 on historical Studio pin b569; source SHA prefix **4d075fd89958ff48…** was **RECOMPUTED**, not consumed-buffer attestation. Core OD-2 uses exactly sixteen 0.010m sections, five-cell local log-area edits at centers 4/8, fixed M0 length 0.160m, prescribed LF100, 48k×24000 pressure proxy, resistive terminal **Zload=0.05*rho*c/A_last**, six reported native NPY/WAV cases with **common gain** (distinct from Studio per-Take preview normalization). The source SHA reported at OD-2 is **4d075fd89958ff481507661ea43e4602ed5fe72b0104bc897685b1f696abf529**, but P1 later reported another SHA **724412c20feddd9e00112cc362bac56bd8aa428670c5dcb789461df858b512fc** on different runtime. Treat the historical input as un-attested; do not assume portable bit equality. OD-2 L2 are **waveform relative norms**, NOT percent loudness, dB, or listener discrimination.

## 3. Initial append-only UNKNOWN ledger (OPEN)

All rows below have **status=UNKNOWN; evidence_level=REPORTED_ONLY; resolution=OPEN; value=null; recorded_at=2026-11-11 JST**. Source anchor is the applicable reference in section 1 and each record uses a field-specific method_id (none for non-derived run provenance). This is a **ledger initialization proposal** and not a programmatic retroactive edit to any artifact.

| ledger key = evidence / field path / method | missing_reason | claim limit / prospective resolution evidence |
| --- | --- | --- |
| S5_M0 / source.actual_run_samples_sha256 / none | SOURCE_NOT_ATTESTED | NEVER backfill old consumed buffer from later generator; new actual-run evidence must be a NEW_RUN |
| S5_M1 / source.actual_run_samples_sha256 / none | SOURCE_NOT_ATTESTED | same |
| S5_M0 / source.full_verified_source_state / none | SOURCE_NOT_ATTESTED | stays UNKNOWN for historical Take |
| S5_M1 / source.full_verified_source_state / none | SOURCE_NOT_ATTESTED | stays UNKNOWN |
| S5_M0 / observer.calibrated_spl_db / none | UNCALIBRATED | 0.20m model proxy cannot be labeled absolute SPL |
| S5_M1 / observer.calibrated_spl_db / none | UNCALIBRATED | same |
| S5_M0 / features.f0_observed / bodymap.f0.acf-windowed/0 | METHOD_UNFROZEN_OR_RAW_NOT_VERIFIED | native bytes+method+independent reviewer → new DERIVED_RECOMPUTED only |
| S5_M1 / features.f0_observed / bodymap.f0.acf-windowed/0 | METHOD_UNFROZEN_OR_RAW_NOT_VERIFIED | same |
| OD2_C4_R090 / studio_product_take_id / none | ORIGIN_NOT_PRODUCT_TAKE | P2 future fresh Take required; never promote Core research receipt |
| OD2_C4_R100 / studio_product_take_id / none | ORIGIN_NOT_PRODUCT_TAKE | null alias is parent M0, not new revision |
| OD2_C4_R110 / studio_product_take_id / none | ORIGIN_NOT_PRODUCT_TAKE | new product path only; not retroactive |
| OD2_C8_R090 / studio_product_take_id / none | ORIGIN_NOT_PRODUCT_TAKE | same |
| OD2_C8_R100 / studio_product_take_id / none | ORIGIN_NOT_PRODUCT_TAKE | null alias is parent M0 |
| OD2_C8_R110 / studio_product_take_id / none | ORIGIN_NOT_PRODUCT_TAKE | same |
| OD2_ALL6 / source.actual_run_samples_sha256 / none | SOURCE_NOT_ATTESTED | reported generator SHA, no independently verified consumed-buffer chain |
| OD2_ALL6 / observer.calibrated_spl_db / none | UNCALIBRATED | pressure proxy only |
| S3_FACADE_ACCEPTANCE / source.actual_run_samples_sha256 / none | SOURCE_NOT_ATTESTED | historical strict B, no source promotion |
| S3_FACADE_ACCEPTANCE / source_tract_bidirectional_state / none | UNMODELED | not identifiable from fixed LF path |
| S3_FACADE_ACCEPTANCE / features.f0_observed / bodymap.f0.acf-windowed/0 | NOT_CAPTURED | policy PASS without exact verified raw does not imply feature measurement |

For S3 refusal records whose physical execution produced **no audio**, raw/wav fields may be **NOT_APPLICABLE: REFUSAL_NO_AUDIO** rather than UNKNOWN, if the specific refusal path proves absence. This does not permit classifying all S3 evidence as no-audio.

## 4. Ledger row schema, amendments and refusal-to-backfill policy

Each ledger event MUST include: immutable **ledger_event_id**, **ledger_key=(origin_evidence_id, field_path, method_id)**, source_anchor URL + source commit + origin content SHA (or null with reason), origin_class (S5_TAKE / OD2_RESEARCH_RECEIPT / S3_FACADE_EVIDENCE / NEW_TAKE), original observed timestamp (if known), assessment timestamp, current **coverage status** and **evidence_level**, missing_reason, value/null, units and observation plane, original artifact SHA/scope, run pin vs verification pin, method/config SHA, runtime, reviewer and signature, claim_limit, resolution OPEN/NEW_EVIDENCE_ATTACHED/SUPERSEDED_BY_NEW_RUN, previous_event_ref and event content SHA.

**No rewriting** original Take/envelope/Core receipt/ZIP or old ledger events. A historical correction requires a separately dated append-only amendment with reason, original and new hashes and reviewer; display both chronological states. A copied full hash from a truncated prefix is **fabrication**. On newly obtained bytes, independently compare source hash and expected original anchor, use qualified method, record distinct derivation time and derived SHA, and append a new event; NEVER claim the derivation occurred at original measurement time. A new Core physical execution is **NEW_RUN**, not a retrospective repair. Any mismatch in parent/body identity, load, pin or source qualification halts claim promotion and makes cross-origin comparison **NOT_COMPARABLE**.

**Explicit STOP:** backfilling absent actual-run source SHA; replacing UNKNOWN/UNMODELED with zero; labeling 0.20m proxy as absolute SPL; deriving native Pa from individually peak-normalized preview WAV; treating b569 S5 as b5dc95d OD-2; treating Core six-case research WAVs as Studio P2 fresh baseline; promoting RECOMPUTED to ACTUAL_RUN_ATTESTED; changing an old ledger event rather than appending an amendment.

**Review request:** Muse should verify source anchors, M0/M1 IDs and prefixes, six center/ratio/L2 pairs and null alias semantics, S3 policy counts, MQ2 REPORTED_ONLY and every OPEN row's missing reason. Owner will decide freeze later, identifying commit+content SHA in **E**; this C document is not an E/adoption record.
