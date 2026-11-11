# BODYMAP G0 / B — Pack schema proposal and data dictionary

**Document:** BODYMAP-G0-B-20261111-01 · **Status:** PROPOSAL_ONLY / NOT_RUNTIME_SCHEMA / NOT_FROZEN / 2026-11-11 JST  
**Depends on:** [A Measurement Contract](bodymap-g0-A-measurement-contract-20261111.md), [adopted QG1](body-map-g0-response-20261111.md). **Machine-readable candidate:** [feature-method-manifest.proposal.json](bodymap-g0-B-feature-method-manifest-proposal-20261111.json). Neither file is an adopted validation program nor a schema for Studio/Core requests, envelopes, receipts or archives.

## 1. Proposed logical record (not wire-compatible by implication)

All top-level sections are mandatory *containers*; all mandatory slots are either an exact value with evidence or explicit null + coverage. A producer must never turn absence of a section into synthetic values. Proposed shape:

    {
      "pack_schema_version": "take-metrology-pack/0",
      "pack_id": "future-issuer-defined-id",
      "origin": {
        "origin_class": "RETROSPECTIVE",
        "origin_record_ref": "immutable-original-uri",
        "origin_record_sha256": null,
        "take_id": null,
        "evidence_id": "historical-record-id",
        "issuer": "research-lead-proposal",
        "issued_at_utc": null,
        "measurement_time_utc": null,
        "derivation_time_utc": null,
        "claim_scope": "BOUNDED_MODEL_ONLY",
        "parent_pack_id": null,
        "backfill": false
      },
      "request_body": {},
      "source_evidence": {},
      "motion": {},
      "medium_boundary_observer": {},
      "raw_signal": {},
      "preview": {},
      "outcome": {},
      "derived_features": [],
      "coverage": [],
      "method_manifest_ref": "bodymap-g0-B-feature-method-manifest-proposal-20261111.json"
    }

**This is a design illustration, not valid current Studio runtime JSON.** Empty objects mean “fields to be inventoried and recorded in coverage,” never that evidence is present. Null only means unfilled when accompanied by a specific field-local coverage row; a synthetic ID in this example is a placeholder, not an actual Take. Any future JSON Schema or validation implementation requires separate design review and Owner authorization.

## 2. Data dictionary and physical types

| Path/group | Proposed type/cardinality | Required content / invariant |
| --- | --- | --- |
| pack_schema_version, pack_id | exact string / nonempty string | version take-metrology-pack/0; unique content-addressable identity of proposed sidecar; no mutation |
| origin | object / 1 | origin_class NEW_RUN or RETROSPECTIVE; immutable record ref and SHA or missing reason; issuer; issued_at UTC; claim_scope; parent pack ref/null; **take_id only for actual Take**, **evidence_id for OD-2/S3**; measurement and derivation times separate |
| request_body | object / 1 | request ref/hash, character id/revision/snapshot, body_ref_kind, Core preset or Core-authored revision id, parent, family, recipe, prep digest, run_core_sha and verification_core_sha separately, backend, solver, adapter, case, model-domain; individual nulls allowed only with coverage |
| source_evidence | object / 1 | source id/generator/contract, prescribed_f0_hz (input), source pin and runtime, f64 encoding, source sample count, actual_run_samples_sha256/null, recomputed_samples_sha256/null, evidence_class ACTUAL_RUN_ATTESTED/RECOMPUTED/UNKNOWN, full_verified_source_state; attestation chain only for qualifying same-run buffer |
| motion | object / 1 | script/performance ref, task_plan_sha, seed, t0, duration_s, realized outcome, diagnostics, effort_model_status; playback gain is forbidden here |
| medium_boundary_observer | object / 1 | rho_kg_m3, c_m_s, wall/loss, oriented source port and p/U conventions, terminal/load and coefficients, observer_kind MODEL_PRESSURE_PROXY or separately qualified calibrated type, plane/distance/coordinates, calibration status; 0.20 m is nominal proxy |
| raw_signal | object / 1 | artifact ref, byte SHA and SHA scope, dtype/endian/frame/channel, sample_rate_hz, duration_s, finite status, separate quantized hash and exact quantization method; no WAV-only native raw recovery |
| preview | object / 1 | WAV ref/hash, codec, normalization policy, gain stage/playback_gain_db, clipping; derived display audio never used for physical Pa level |
| outcome | object / 1 | job_status, typed realization outcome/refusal, numeric_state, finite/overflow/convergence, artifact integrity, provenance_state and unmodeled_effects[]; no invented historical status |
| derived_features[] | array, zero or more | feature_name, method_id, method_config_sha256, method_status, value or null, unit, window sample indices, input artifact hash/sha scope, derivation_time/runtime, quality/invalid reason; **never require value for DEFINED_NOT_VALIDATED** |
| coverage[] | array, >= one record per defined required field/feature | field_path, origin_evidence_id, method_id/null, status MEASURED/RECOMPUTABLE/DERIVED_RECOMPUTED/UNKNOWN/NOT_APPLICABLE, evidence_level, reason_code, source_anchor, reviewer/claim_limit. Duplicate (field, origin, method, revision) forbidden; new appraisal → new append-only revision |
| method_manifest_ref | immutable ref + content SHA once reviewed | version and provenance of complete per-feature algorithms. A link to *this proposal* is not an adopted method hash |
| complex_transfer[] (optional) | typed complex-valued frequency response, 0+ | real/imag array, Hz grid, H numerator/denominator physical units or Z [Pa·s/m³], port orientation, load, phase convention and exact solver; no inferred “formant” absent qualification |
| physical_observables[] (optional) | typed timeseries/objects, 0+ | p [Pa], U [m³/s], area [m²], length [m], power [W], time [s] with capture plane/provenance; unmodeled != zero |
| perception_attachment_refs[] (optional) | list of independent references | response/blinding/randomization/normalization design; listener ratings not measurement or numerical oracle |

For each scalar type, **finite-or-null**; NaN and ±Infinity MUST be rejected with numeric reason. Decimal numbers require defined physical units; hash values are lowercase 64-hex digits prefixed sha256: (or absent with reason); ID and URI normalization rules become implementation work, not retroactive guesses. Array indexing is integer zero-based for samples and OD-2 center indices. Observer transforms and source samples use different artifacts and claim scopes.

## 3. Proposed feature table (algorithm detail is in companion manifest)

| Name (method suffix) | Output | Scope/definition | Invalid/qualification |
| --- | --- | --- | --- |
| level.v0 | p_rms_pa, mean_pa, peak_pa, model_proxy_db_re_1pa, optional frame series | **native raw Pa**, non-demeaned, full record and fixed Hann-free 80 ms/20 ms framed RMS. Log level only if RMS > 0; preview_dbfs separate | raw absent/nonfinite/empty invalid; 0 Pa valid linear but logarithm null; cross-plane or pin comparison not licensed |
| f0_observed.v0 | f0_hz or null, confidence, voiced-window count | demeaned Hann-windowed normalized autocorrelation, lag search 70–400 Hz, 80 ms/20 ms; summary median of stable accepted windows | periodicity below proposed threshold, insufficient windows, competing octave/lag candidates, nonfinite → null; **never equals prescribed LF100 by default** |
| harmonic_tilt.v0 | dB/oct or null, harmonics used | accepted stable f0 windows; FFT of Hann signal; H2–H10 amplitude peaks, least-squares 20log10 magnitude versus log2(f/Hz) | too few reliable separated harmonics, spectral floor/overlap, f0 invalid → null; output harmonic slope is NOT glottal-flow slope |
| transfer_peak_candidates.v0 | candidate peak frequency array [Hz] | native **complex loaded transfer** with same port/plane/load; local maxima on registered frequency grid | no qualified transfer, wrong phasor/ports/mixed loads → UNKNOWN; not an anatomical formant |
| output_spectral_peaks.v0 | candidate peak frequency array [Hz] | raw-output-window FFT maxima **distinct from** transfer peaks | raw absent or noise/floor issue; do not label raw peaks “formants” |
| noise_proxy.v0 | residual harmonic-excluded energy ratio and dB | registered 70–4000 Hz FFT bins, harmonic-bin mask and remaining-to-total energy ratio | uncertain periodicity, inadequate bins, all-zero/nonfinite; not breathiness or aspiration |
| time_features.v0 | thresholded model-energy onset sample index/s, frame RMS trace | original sample index and fixed 80 ms/20 ms frame map, no interpretation as physical tongue or voice onset | no qualifying raw/window/finite frames; inferred motor event forbidden |

These numerical recipes are **proposed configuration candidates**. Every method is **DEFINED_NOT_VALIDATED**, including level, until its synthetic tests, threshold behavior, exact implementation/version pin, independent check and Owner's separate method authorization are complete. Defining a deterministic formula does not prove that it measured a physiological characteristic. The G0 artifact freeze can freeze an explicitly **unvalidated method definition**; it does not create numerical PASS eligibility.

## 4. Compatibility / migration table

| Existing or future pair | Read/write policy | Comparison qualification |
| --- | --- | --- |
| Studio v0 envelope → proposed pack/0 | **Read-only reference**, never overwrite/reinterpret original v0 schema or Take lifecycle | RETROSPECTIVE until fresh run; not equivalence to new collection |
| S5 historical b569 ↔ Core OD-2 b5dc95d | Separate pins, origins and runtimes; **no direct audio A/B**; may catalog both | NOT_COMPARABLE without same-pin reruns and common plane/method |
| OD-2 P1 Core catalog receipt ↔ Studio B1 P2 | Research/Core authorized receipt is not product Take; P2 still awaiting independent GO | NOT_EQUIVALENT; fresh product-path evidence required |
| pack/0 → optional-field pack/0.x | Accept only with old-reader test and explicit absent semantics | Comparable only if unchanged semantic/method/plane/pin |
| pack/0 → changed required field/meaning/units/reference plane | **new major pack identifier**; old rows retained | NOT_COMPARABLE until separately rederived |
| feature method v0 → changed window/algorithm/threshold | **new feature_algorithm_id** and config hash, never rewrite old value | only same method, or raw preserved on both sides and both DERIVED_RECOMPUTED with new method |
| NEW_RUN ↔ RETROSPECTIVE | Preserve origin_class, as-collected provenance and read-only source | Origin/capture class visible even if dimensions match |
| Pa model proxy ↔ calibrated dB SPL | No implicit conversion; calibration/reference contract separate | NOT_COMPARABLE |
| raw native pressure ↔ peak-normalized preview WAV | Raw-to-preview transform explicitly recorded but irreversible normalization cannot reconstruct raw absolute scale | NOT_EQUIVALENT |
| source ACTUAL_RUN_ATTESTED ↔ RECOMPUTED | Different evidence classes; no promotion via matching hashes | historical full VERIFIED SOURCE remains UNKNOWN |

## 5. Proposed validation gate / negative fixtures (NOT executed here)

Review shall require: structural presence/coverage with null semantics, duplicate and nonfinite refusal, exact source-class nonpromotion, raw artifact hash scope, pin and observation-plane mismatch refusal, alias=parent identity, quantized-hash-vs-raw-byte distinction, missing raw and refusal/no-WAV behavior, optional-field backward reader, and old/new method comparison refusal. Method fixtures shall include constant Pa, silence, pure 100 Hz sine at 48 kHz, a 200 Hz octave confusion pattern, mixture of harmonics with analytically set dB/oct slope, deterministic complex transfer with known peak, broadband noise and missing/nonfinite raw. Predicted outputs, tolerances and expected invalid decisions must be preregistered **before** executing any implementation; no PASS or validation is claimed by listing these fixtures.

**Freeze metadata to be supplied by Owner only after Muse review:** exact content SHA-256 of A, B, manifest, C and D; exact Studio commit; adopted method IDs/config hashes and status; acceptance scope; timestamp. No freeze or E adoption record is authored in this PR. P2 is unaffected; proposed fields may be optional evidence attachments only.
