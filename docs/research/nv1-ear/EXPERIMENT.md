# NV1-EAR / Studio — implementation plan & gates

**Prerequisite:** Core NV1 source code and initial source-only 48kHz WAV pass scientific unit tests and produce real `nv1-breath-ear.evidence.v0`. Do not build a pretend demo with pre-recorded WAVs.

## S0 fixed fixture and research route
Create additive `/research/nv1-ear` view/page only, isolated research server adapter and separate Take namespace. Pin *implemented* Core SHA, path and exact dependency lock. Import Core scenario definitions/provenance rather than diverging hard-coded physics. No edits to existing `vendor/performance-contract` or CC-A2/X2a routes.

## S1 execution adapter
Allowlist experimental preset/direction/receiver/seed, derive args deterministically, spawn exact clean checkout runner with argv (never a shell), isolated exclusive evidence folder, finite resource limits, controlled SOFA file hash. Verify process exit, evidence manifest, trace/source checksum, stereo WAV bytes and units before exposing playback. Return strict structured failure otherwise.

## S2 creator view / audition
Display read-only typed organ/source/receiver causal graph and source limitations. Press Perform and receive newly executed, provenance-checked Take. P0 vs P2/A2 at fixed seed and receiver tests **physical source differences**; same-source A vs B tests **reception differences**. Strict headphone blinding and separate rating dimensions; do not suggest one is better automatically. Display A='modeled Pa', B='relative measured transfer, not calibrated SPL'.

## S3 persistence, attacks, negative tests
Test two distinct fresh Core source runs and two receiver runs; exact deterministic repeat; manifest and WAV digest checks; reload/restart; missing SOFA, path traversal/symlink, dirty Core, wrong SHA, invalid/NaN JSON, malformed WAV, swap of L/R, stale evidence, overwritten Take and nonzero exit. Every refusal leaves **no playable Take**. Ensure production smoke tests still pass.

## S4 independent gates
`npm test`, `npm run build`, browser interaction smoke, cross-repo SHA/manifest verification, independent security and acoustics review, real headphone notes. Numeric correctness, human impression and future API adoption are separate. Store actual evidence only in RESULTS.

## Definition of Done
Creator can select two source states, launch **fresh** physically derived source calculations, hear/replay both stereo outputs in Studio, review SI/source provenance, compare same-source real-SOFA reception and reload immutable Takes; invalid requests are securely refused. **Not** equivalent to natural human breath, deployed production interface, completed phonation or successful ASMR perception.
