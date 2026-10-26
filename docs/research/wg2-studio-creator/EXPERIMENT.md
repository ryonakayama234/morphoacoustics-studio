# WG2 Studio experimental evidence ledger

Gate A frozen before first code at `3d432eb2f052ef89955b121f118d3d37a6033930`. Upstream Core producer [PR #193](https://github.com/ryonakayama234/morphoacoustics/pull/193); Core foundation [WG1 #187](https://github.com/ryonakayama234/morphoacoustics/pull/187) and [WG2 #192](https://github.com/ryonakayama234/morphoacoustics/pull/192). [Creator story #30](https://github.com/ryonakayama234/morphoacoustics-studio/issues/30).

| Gate | Falsification/observation | Decision |
|---|---|---|
| Core true physical WAV M0 and M1 | Two fresh own-body solver executions, old frozen source file not WAV-reused | CI pending |
| Node exact provenance | Body/prepared revision, source version and digest, 16x2 native clock, raw NPY, monitor+WAV exact bytes checked | CI pending |
| Strict refuse | unsupported body/revision/duration/script; tampered WAV/NPY/manifest/physical source | unit + real CI pending |
| Persistent Take | no commit before two independent verifications; GET and server restart re-check | CI pending |
| TypeScript + user flow | opt-in panel, body choice, Perform, A/B, WAV, reload | build/real browser pending |
| Third-party scientific/code review | `@codex review` with actionable P1/P2 remediation and updated exact-head checks | pending |
| Perceptual voice-like / creative value | N=1 creator hearing, artifacts, body A/B differ or do not, useful or not | NOT TESTED |

**Before any merge:** Core producer PR must independently pass and be pinned at its accepted exact HEAD; Studio CI must exercise real Core via HTTP and source SHA re-pinned if moved. One user's listening is not replaced by numerical inference. Feature must remain opt-in under separate localhost data root.
