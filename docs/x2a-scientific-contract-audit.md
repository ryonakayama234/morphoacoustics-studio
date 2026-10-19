# X2a: AI-assisted bounded science / contract / provenance audit

**Scope:** Studio Issue #11 / PR #15. This is a *technical-evidence audit by
ChatGPT acting as the project implementation and verification agent*, not a
qualified external researcher's peer-review or a blind phonetic experiment.
The developer explicitly delegated scientific audit to ChatGPT as an available
alternative to finding an outside human reviewer. The software/security
review is a separate Codex process; neither process may conceal findings.

## Audit questions and source-of-truth identifiers

- Frozen upstream executable: Core Git commit
  `a75418770ed28cbd301d554171a6b60ee5a05ee9`,
  `src/morphoacoustics/integration/limited_live.py`, adopted through Core
  Issue #69 / PR #70.
- Scientific source: Core Experiment 027 `RESULTS.md`
  (`ADOPT_TASK_FIELD_CANDIDATE`), Experiment 028 `RESULTS.md`
  (`SUPPORT_TASK_TRANSFER`) and Experiment 029 `RESULTS.md`
  (`SUPPORT_PHONETIC_EMBODIED_INFEASIBILITY`), plus their pinned
  oracle sources and execution checks.
- Studio adapter: `src/backend/LiveExperimentalBackend.ts`,
  `server/live-server.mjs`, `server/core-revision.mjs`, and
  `server/raw-pressure-oracle.mjs`.
- Creator API: Performance Contract **v0** in Core
  `contracts/performance/v0/`; Studio's read-only
  `vendor/performance-contract/v0/` snapshot. All five `common`,
  `character`, `script`, `direction`, and `performance-request`
  schema files were compared by **Git blob SHA** against the frozen
  Core commit and are byte-identical.

## Claims: what is supported and what is not

| Claim | Evidence and bounded technical disposition |
| --- | --- |
| A creator can request one live experimental utterance | **PASS, functional:** only exact `あい`, one segment, matching speaker, seed 0, no Direction, fixed pronunciation `v3a-a-to-i-like/v1`. Nonmatching creative requests yield `UNSUPPORTED` without fallback WAV. Verified by policy tests, real Core and Chromium CI, plus earlier Windows/WSL2 creator playback. |
| Movement arises from the modeled body and task | **PASS, narrowly computational:** adopted Experiment 027 maps three task activations through an experiment-local morphology realization into 1D section geometry. Experiment 029 generates the associated pressure using the frozen quasi-stationary frequency-transfer renderer; **102 instrumented acoustic transfer calls** for a feasible run. No physical articulation inertia, force or coupled airflow FSI is established. |
| Body capability constrains realized voice | **PASS, model-local:** Experiment 029's prepared `M_plus` (`oral_shaper.reachable_end=0.75`) is feasible; `M_boundary` (0.7167402543883221) is feasible; `M_minus` (0.70) is `INFEASIBLE`, with `LOCATION_UNREACHABLE`, no endpoint, no waveform, **zero** acoustic transfers. This is a verified software/model branch, **not** a biological or general physical bound. Only `M_plus` is exposed in Studio X2a. |
| Acoustic generation is fresh and deterministic under the frozen environment | **PASS, limited:** Core's own smoke runs solver twice, emits two separate new output directories and records 102 fresh transfer calls per feasible run. Studio Core+Chromium CI runs the pinned solver twice and matches WAV/trace artifact hashes. No arbitrary body, text, tempo or emotional repeatability is claimed. |
| Raw-pressure samples match adopted numerical baseline | **PASS on CI platform, computational:** Core calculates `np.rint(raw_pa / 1e-9).astype('<i8')` SHA-256 across exactly **24,000 float64 pressure samples** and compares to `dc14c78bcc6d4a19c11fe2a01ba84b1394802b66626f4dfa27cc582c741e714e`. Studio checks receipt identity and separately recomputes the same SHA-256 in **independently authored JavaScript** from the saved NPY's raw float64 bytes, with explicit ties-to-even, little-endian int64 and malformed-shape / tamper regressions. The Python reference baseline and JavaScript implementation are separate code paths, but this is **not** a wholly independent physical solver or peer-reviewed mathematical derivation. |
| Audible output and trace reflect the supported fixture | **PASS, functional/data contract:** 48,000 Hz × 0.5 s = 24,000 PCM16 mono samples; 51 trace time endpoints at 10 ms from 0.00 through 0.50 s, where the last trace index 24,000 is an **exclusive audio frame boundary**, not a 24,001st audio sample. WAV gain uses `0.9/max(abs(pressure_pa))` prior to PCM16; the WAV hash is not the Pa waveform hash and playback level is not SPL. |
| Physical provenance survives the Studio boundary | **PASS in trusted local environment:** Core manifest includes body `v3c-M_plus/v1`, source `lf_fixed`, pronunciation and task-plan/body hashes, NumPy 2.4.6, experiment origin, seed 0 and frozen adapter version. Studio checks fixed revision, source and NPY quantum/hash; verifies completion marker and 3 allowlisted artifact paths, sizes and hashes before persisting an immutable Take plus auditable manifest. Trust is local, not a sandbox against hostile Python installations or concurrent hostile filesystem modifications. |
| Contract semantics and unsupported/failure handling | **PASS, bounded:** exact five vendored v0 JSON Schema blob hashes match upstream Core. The creative v0 request is a *Studio mapping* into the separate `morpho-live/v1` physical request; unsupported inputs are not treated as success with playable audio. Core execution `FAILED` is not physical `INFEASIBLE`; X2a does not expose `M_minus` to the creator. |
| Natural Japanese speech, arbitrary anatomy, user-intended emotion or perceptual vowel identification | **NOT VERIFIED; explicitly OUT OF SCOPE.** User reported hearing an experimental 「あい」 in Windows/WSL2, which is valuable usability evidence but not a blinded perceptual study, natural speech synthesis, validated Japanese phoneme production or model realism. |

## Independent numerical cross-check and interpretation

The new Node implementation reads the actual `raw_pressure_pa.npy` bytes,
accepts only unambiguously shaped `<f8` little-endian 1D arrays, checks
finite exact-range samples, performs NumPy-compatible round-to-nearest-even
at the **pre-registered** 1e-9 Pa quantum and SHA-256 hashes the 24,000
little-endian signed int64 results. This cross-language reproduction verifies
the **output evidence itself**, rather than trusting only a JSON-provenance
claim. Unit tests include tie cases, tampered output and malformed NPY. The
live physical smoke checks the saved artifact bytes against the same oracle.
No scientific thresholds were retuned to match this test.

The observed `M_minus` negative-path zero-calls test is in Core's frozen
scientific smoke, not claimed to have been exercised from the Studio GUI.
Human-reported Windows listening/restart/A-B observations occurred at Studio
PR HEAD `244a29d`, prior to the additional fail-closed checks; reuse them
only for the unchanged user interaction, not as a new exact-head test.

## Source-and-review separation, limitations and release decision

This record is **AI-assisted verification, with disclosed author overlap**:
ChatGPT proposed the Studio hardening and authored this bounded audit. Therefore
do **not** label the record “independent external scientific reviewer APPROVED.”
Independence is strengthened through already adopted upstream experiment
oracles, Core's separate Python regression runs, Studio's independently coded
Node raw-NPY rehash, different CI jobs/platform browser checks, and a separate
Codex code/security reviewer. All quantitative checks must pass on the exact
candidate revision. It would be dishonest to claim an external expert checked
anatomical realism or natural Japanese phonetics.

**Science/contract scope disposition: PASS_LIMITED for the adopted computational
fixture only, subject to exact-head physical integration CI.** This does *not*
satisfy an external peer-review or natural-voice research Gate, and it does
*not* approve merging while any P1 code/security finding remains open.

The developer's instruction authorizes using ChatGPT to perform this review
instead of waiting indefinitely for an unavailable human reviewer. On that
operational basis, release is eligible for **GO_LIMITED** only when an
independent Codex code/security review finds no release-blocking issues, all
relevant audit tests pass at the exact head, and the bridge keeps this bounded
scientific disclosure. If these fail, **HOLD**, do not pretend completion.

After adoption, do not infer any support for new bodies, arbitrary scripted
speech, force/contact mechanics, real time-domain airway FSI, or any perceptual
phonetic Gate. Those require separately registered research.

## Additional executable provenance note (security review)

Git ignored-file status alone is not enough: files hidden in tracked
`.gitignore`, local `.git/info/exclude`, and global `core.excludesFile`
can run Python startup shims while revision HEAD appears unchanged. Studio's
bridge rejects ignored importable Python/binary files in Core `src/`,
`experiments/`, and root startup locations, including *legacy sourceless*
root `.pyc`/`.pyo` modules. The physical subprocess uses a unique
`PYTHONPYCACHEPREFIX` so it does not consult pre-existing ignored
`__pycache__` source caches; CI regression fixtures cover these bypass
forms. This is a reproducibility guard around a **trusted local Python
dependency environment**, not a hostile-system sandbox. No arbitrary
user-controlled Python or third-party dependencies are certified by it.
