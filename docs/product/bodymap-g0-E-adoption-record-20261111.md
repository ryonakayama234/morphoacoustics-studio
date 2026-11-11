# BODYMAP G0 / E — Adoption and freeze record

**Document:** BODYMAP-G0-E-20261111-01 · **Date:** 2026-11-11 JST · **Recorded by:** Muse（監督者）, on the Owner's explicit decision

## Decision

The Owner (中山) adopted artifacts A–D of BODYMAP G0 as the frozen measurement contract v0 (`take-metrology-pack/0`, `bodymap-take-features/0`) on 2026-11-11, following the supervisor review of PR #60 (all AGREE). With this record E, the G0 completion condition **A ∧ B ∧ C ∧ D ∧ E** is satisfied: **BODYMAP G0 is COMPLETE**.

## Frozen artifacts

Reviewed at PR #60 head commit `31759056d4919cbf58e3a2a71faf1868d57e733f`. Content SHA-256 computed by the supervisor from the actual files:

| Artifact | File | Content SHA-256 |
| --- | --- | --- |
| A. Measurement Contract | `docs/product/bodymap-g0-A-measurement-contract-20261111.md` | `20bedfd1ef0e7dd50d83ee73517f9ee525a4e5b5687e65a5d5d6842798d5f143` |
| B. Pack schema proposal | `docs/product/bodymap-g0-B-pack-schema-proposal-20261111.md` | `94421e6c6bb146fb15fee660b765502b04699076efacbd59f7031a1ffe1c6e37` |
| B. Feature method manifest | `docs/product/bodymap-g0-B-feature-method-manifest-proposal-20261111.json` | `07e5269e72e353a7b493cf8a0186d83e2df88789b59f3f42e0610fdd9a6ea136` |
| C. Retrospective & UNKNOWN ledger | `docs/product/bodymap-g0-C-retrospective-unknown-ledger-20261111.md` | `ce9c4e9f0a6e8d7a29e69aef74c48920ad3a2e85a577d3e26e858872b37af6e6` |
| D. Five-factor preregistration template | `docs/product/bodymap-g0-D-five-factor-preregistration-20261111.md` | `eb71880d255a73f86ebf5245be5f95b4d61482e64782ac95bb2947e619e65fe7` |

Adopted method IDs, all at status **DEFINED_NOT_VALIDATED** (the definitions are frozen; no measured value gains acceptance eligibility from this freeze): `bodymap.level.raw-pa/0`, `bodymap.f0.acf-windowed/0`, `bodymap.harmonic-tilt.output/0`, `bodymap.transfer-loaded-peaks/0`, `bodymap.output-spectral-peaks/0`, `bodymap.noise-proxy.harmonic-mask/0`, `bodymap.time-features.rms-onset/0`.

## Scope of this freeze

- This is a **design/contract freeze only**. It authorizes nothing else: no implementation, no runtime schema adoption, no experiment execution, no feature validation claim, no sound-quality GO.
- Historical evidence keeps its qualifications: S3/S5 `full_verified_source_state` remains UNKNOWN, `4d075fd8…` remains RECOMPUTED, the C ledger's initial rows remain REPORTED_ONLY with UNKNOWN entries OPEN.
- B1 P2 (Issue #54) is unaffected and remains independently gated. BODYMAP G2 (B2 passive-loss preregistration) requires its own Owner GO.
- Post-freeze corrections follow artifact A's rule: append-only amendment events, never mutation of the frozen bytes.
