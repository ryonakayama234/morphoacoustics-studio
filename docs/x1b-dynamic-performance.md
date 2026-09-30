# X1b dynamic performance integration

## Purpose

X1b connects the minimal dynamic capability supported by `morphoacoustics` Experiment 010 to the existing Studio `PerformanceBackend -> PerformanceResult -> immutable Take` path.

It is deliberately an integration experiment, not a promotion of a general temporal API.

## Scientific evidence reused

Source repository: `ryonakayama234/morphoacoustics`

- source commit: `373ff71026578fa5026ae9ed69f450f8c0ec569f`
- successful workflow: `experiment-010`, run `36779501797`
- workflow artifact: `experiment-010-output`
- artifact digest: `sha256:de40063fdebe79ca8365b60f97c64675187dc802e3e50a6c0f73c68c1e4da4b5`
- model class: quasi-stationary short-time time-varying transfer filter
- temporal representation: explicit onset/offset events + sampled continuous trajectory
- fixed body for X1b: Experiment 010 `wide-body`
- fixed utterance: one segment, `あ` or `あー`

Experiment 010 reported `SUPPORTED` for the minimal M3 dynamic-capability claim. It did not promote a general temporal API and did not claim true moving-domain acoustics or FSI.

## Creator-facing mapping

The mapping is versioned as:

```text
x1b-pace-two-point-v1
```

Only two creator-facing pace values are supported:

| creator pace | Experiment 010 motion | attack/release ramp |
|---:|---|---:|
| 0.75 | slow | 90 ms |
| 1.25 | fast | 30 ms |

No interpolation is performed. Values such as `pace=1.0` return `UNSUPPORTED` rather than inventing evidence for an unvalidated continuous law.

A Wolfram independent check confirmed that the two-point policy is monotone in the intended direction (higher pace -> shorter ramp), both ramps fit inside the Experiment 010 active window `0.08 s .. 0.42 s`, and the remaining plateau durations are positive (`0.16 s` slow, `0.28 s` fast).

This mapping is an integration policy, not a physical definition of `pace`.

## Causal trace and provenance

For a supported request the result records:

```text
Direction.pace
  -> x1b-pace-two-point-v1
  -> Experiment 010 motion condition
  -> combined dynamic trace (time_s, activation, area_m2)
  -> Experiment 010 listening WAV
  -> immutable Studio Take
```

Each result includes:

- audio artifact;
- dynamic trace artifact associated with the same `segment_id`;
- immutable wide-body binding artifact;
- integration-policy artifact recording selected pace and ramp;
- backend/version, contract version, seed and deterministic request digest;
- diagnostics that state the source commit, source CI artifact digest and mapping limitation.

The checked-in compressed WAV/CSV payloads are exact copies of the successful Experiment 010 workflow artifact. CI decompresses them and verifies their original SHA-256 values.

## Failure semantics

X1b returns `SUCCEEDED + UNSUPPORTED` for:

- text outside the one-segment `あ` / `あー` fixture;
- pace values outside the validated two-point policy;
- requested capabilities outside the X1b backend surface.

These cases are not reported as physical `INFEASIBLE` and are not execution `FAILED` states.

## Scope boundary

X1b does not provide:

- arbitrary text or general TTS;
- general coarticulation;
- a continuous pace-to-physics law;
- energy/emotion/free-form Direction mapping;
- multiple simultaneous Direction axes;
- source-filter back-coupling;
- self-oscillating vocal folds;
- true moving-boundary acoustics or FSI;
- a creator-facing anatomy/body editor.

If this two-Take creator workflow is useful and the integration/provenance invariants hold, X1b provides the boundary evidence needed before proceeding to M5's Script -> pronunciation plan -> Gesture inventory -> coordination -> GestureScore compiler.
