# NV1-EAR / Studio — research-only DATA v0

No changes to vendored `vendor/performance-contract/`, canonical public `GestureScore`, current CC-A2/X2a Take format or adopted schema. Use a disjoint `NV1ResearchTake` collection/namespace; no masquerading as an adopted Take.

## Proposed creator request (bounded)
```json
{
  "schema": "studio.nv1-ear.request.v0",
  "preset": "P0",
  "seed": 133041,
  "listener_direction": "center",
  "receiver": "ideal_A",
  "core_expected_sha": "<40 hex chars of an IMPLEMENTED NV1 Core commit>"
}
```
Allowlist presets `P0/P2/A2`, directions `center/left/right`, receiver `ideal_A/measured_B`. Translation uses **immutable** Core-defined actuation values from Core's scenario specification, not different UI physics constants. Other combinations/fields refused. Future research UX may expose more controls only via versioned research schema review.

## Verified research Take receipt
```json
{
  "schema": "studio.nv1-ear.take.v0",
  "take_id": "<immutable random identifier>",
  "created_from": "<canonical request SHA256>",
  "core_commit_sha": "<verified implementation SHA>",
  "core_evidence_schema": "nv1-breath-ear.evidence.v0",
  "core_evidence_sha256": "<sha256>",
  "source_trace_sha256": "<sha256>",
  "wav_sha256": "<sha256>",
  "raw_signal_unit": "Pa or relative, based on receiver",
  "receiver": "ideal_A",
  "research_status": "EXPERIMENTAL_NOT_ADOPTED",
  "audio_path": "<content-addressed managed relative path>"
}
```
No placeholder is valid input. Verify SHA256 against actual bytes, clean exact git checkout (commit, status, parent), MIME/WAV header, sample rate 48k, stereo order L/R, finite non-clipped channels, size bounds, output manifest limitations, exact listener SOFA sample index and hash for B, and source invariance when comparison type is receiver-only. Enforce exclusive creation and atomic persistence to protect old records.

## Provenance / provenance comparisons
Two *source-change* Takes: one altered pressure/area, same seed, listener, closure and renderer. Two *receiver-change* Takes: same source trace digest, different receiver A/B. For listener annotations, store randomized blind label map separate from exposed metadata until unblinded; never publish a global ASMR effectiveness number.

## Refusal
`RUNNER_NOT_PINNED`, `CORE_DIRTY`, `INVALID_SCENE`, `UNSUPPORTED_DIRECTION`, `SOFA_HASH_MISMATCH`, `EVIDENCE_HASH_MISMATCH`, `UNTRUSTED_PATH`, `CLIP_INVALID` => HTTP error and explicit UI refusal with **zero playable artifact**. Do not silently fall back to mock, fixture, historical audio or differently calibrated renderer.

This JSON is a proposed experiment-local record only. Actual implementation must add JSON-schema or equivalent checks with executable negative tests, and coordinate revisions with Core docs.
