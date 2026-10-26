# WG2 Studio data contract and errors

## Request
Exactly four JSON keys: `character_id` ASCII safe identifier, `preset_id` = `v3b-axial-M0` or `v3b-axial-M1`, `revision` = 1, `duration_s` = 0.25 or 0.50. Max 4096 bytes; no script text or arbitrary F0, gain, style, morphology field. The request returns `WG2_REFUSED` for unsupported/corrupt circumstances, never a synthetic placeholder WAV.

## Physical receipt
Core `wg2-creator-static-a-sustain/v0` publishes exact 5 payload files: `source_flow_48k.npy`, `mouth_pressure_native_pa.npy`, `mouth_flow_native_m3_s.npy`, `mouth_pressure_monitor_48k_pa.npy`, `audio.wav`, with byte SHA256 and sizes plus manifest. Body identifies revision+exact `sha256:` preparation fingerprint. Observer exposes body-specific `physics_clock_hz` (M0 68.6k, M1 ~62.36k), signed energy residual, fixed 8 Pa playback reference, WAV 48k mono PCM16, FIR group delay and explicit `mouth-port-pressure-not-external-microphone`.

Independent Node validation checks exact body, core SHA, roles, lengths, raw NPY little-endian float64 shape and finite values, source/native pressure/monitor raw float64 SHA, WAV canonical RIFF header and PCM length, artifact-level SHA, and physical-observer JSON. Core also independently verifies the archived result. A Node-local atomic `take.json` file is the completed-Take marker. On GET/reload and audio retrieval, revalidate rather than trusting cached metadata. Incomplete crashed work has no Take marker.

## Limitations
No proof of calibrated SPL, lung pressure, glottal self-oscillation, tissue dynamics, moving tract wall or complete Japanese speech. Artistic assessment of pleasantness/intelligibility after real audio listening remains a different outcome. File verification is against exact SHA-pinned Core checkout and trusted local research workspace; not a hostile multi-tenant secure enclave.
