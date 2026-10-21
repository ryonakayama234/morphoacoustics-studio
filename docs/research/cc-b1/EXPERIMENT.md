# CC-B1 — EXPERIMENT / creator-evidence ledger
**Status 2026-10-21: NO CC-B1 USER TRIAL / NO STUDIO RUNTIME / NO ADOPTED CORE BODY EDIT.** This document is a preregistration proposal, not a passed Gate.

## Creator hypotheses
**UX-H1:** A single labeled rest-shape input plus exact A/B physical playback lets the creator recognize what changed in the BODY rather than confusing it with louder playback or new scripted performance.

**UX-H2:** Stored exact BodyRevision and immutable Takes remain re-auditable after reload/restart without changing historical identity.

**UX-H3 (not assumed):** A listener distinguishes the changed sound in a one-shot comparison while maintaining a credible character identity. **This is unproven**; objective resonance differences alone do not prove perceived difference or voice-likeness.

## Implementation-stage evidence to preserve (no retrospective Gate inflation)
1. Browser capture: edit allowed field, see before/after SI numbers; rejected negative/out-of-capability edit must display error before running physics.
2. Live Core: both fresh actual raw Pa waveforms, identical performance/source hashes, distinct body preparation hashes and exact source checkout SHA; independently verify trusted receipt and PCM/NPY bytes, not browser-only meta.
3. Playback: blinded one-shot A/B “different / not different / unsure”; voice-likeness 1–5 and audible artifact notes independently; usefulness in designing character as separate free-text item. Do not require a favorite.
4. Persist: two immutable Takes restart/reload/old revision; tampered body, source, wrong geometry or missing blobs must refuse playback/adoption. All paths/limits bounded.
5. Keep exact Windows/WSL2 local version, browser, Core+Studio commits, CI tests, audio hash, human response source and genuine uncertainty in this ledger; failed trials must not be erased.

## Dependencies and explicit claim limits
Core #141 prospective physical and API gates precede the new runtime. Existing [CC-A2](../../cc-a2-two-body-studio.md) is two presets with 100 Hz LF source and 0.5s 48kHz three-task research sound. [Core Exp025](https://github.com/ryonakayama234/morphoacoustics/blob/main/experiments/025_smooth_source_spectrum_vowel_cue/RESULTS.md) warns a discriminable synthetic sound may still be perceived as a buzzer. Monitor voice quality separately from body variation. No claim of natural speech, biological tongue models, multiple organ sources, HRTF or ASMR.
