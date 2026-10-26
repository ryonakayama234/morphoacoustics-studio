# VA-L0 EXPERIMENT — pre-user-audition evaluation ledger

**2026-10-23, fixed before creator listening; status: NO NEW HUMAN RESULTS.**
Reference main Studio: `2f4d675869953d108b2076d531ab8382d25e707f`.
Reference Core main: `6869cfec04041393eae44485ce2fc91f002114f5`.
Existing tested physics source: adopted CC-A2 bridge (see its separately pinned Core SHA and runbook). This experiment does not imply Core main is itself the archived CC-A2 source pin.

## Hypotheses and alternatives

- **H-DIFF:** At least some listeners will detect the real M0/M1 body contrast for frozen /a/-like→/i/-like; numeric tract differences do not guarantee this. Alternative: no reliable detectable difference at natural listening level.
- **H-VOICE:** Voice-likeness need not track body discrimination. A pair can be distinguishable yet both low in voice-likeness. Alternative: both dimensions covary in the available stimuli.
- **H-CONTROL:** Identical-WAV A/A should not produce genuine audio differences. Any reported difference is a false positive/expectation/control issue. This is a validity warning, not grounds to invent downstream physical sources.

## Evaluation protocol

1. Generate new validated CC-A2 M0@1 and M1@1 Takes under their current version-pinned local service. Confirm FEASIBLE, BOUND, audio/WAV and provenance; do not use mock backend.
2. Use a consistent listening setup and moderate volume. Run A/A and A/B in varied order without seeing revealed record identities during each trial. Replays are allowed. The UI hides the existing Take panels during the trial; prior knowledge and normal browser access mean masking is not rigorous double-blinding.
3. Record difference, voice-likeness for each sound, most conspicuous artifact and optional unprompted voice-quality text. Keep uncertain and missing responses; do not coerce them to correct.
4. Export the JSON before any interpretation. Report counts (A/B versus A/A), raw assessments, whether natural-sounding speech was spontaneously heard, and failures. Do not score artificial naturalness as PASS based on just A/B difference.
5. For actual claims, run independently blinded experiments with shuffled multiple exemplars, loudness/device control, appropriately recruited listeners, and explicit sample-size justification **in a separate Gate**.

## Gate / result matrix

| Gate | Criterion | Status on branch creation |
| --- | --- | --- |
| Physical provenance | Only verified existing FEASIBLE CC-A2 Takes and exact WAV refs | CODE CANDIDATE / TEST PENDING |
| Negative control | A/A pairs reference one identical WAV | CODE CANDIDATE / TEST PENDING |
| A/B blinding | Randomized order, no label in active listening panel | CODE CANDIDATE / TEST PENDING |
| Export | Frozen Take/body/digest and subjective notes preserved | CODE CANDIDATE / TEST PENDING |
| Human discrimination | Independent listener evidence | NOT TESTED |
| Human voice-likeness | Independent naturalness evidence | NOT TESTED |
| Scientific adoption | Numeric + human + independent audit | HOLD |

## Existing evidence, explicitly not repeated

- Experiment 025: 29/29 answered 3-vowel *closed-set* classifications correct, incomplete 30th response, listener described buzzer-like sound. Voice-likeness remains inadequate.
- CC-B1 #141–#151: controlled physical body edit and numeric sensitivity studies, but not general perceptual validity. Informal edit A/B inability is not a population estimate.
- Wolfram sanity check of **ideal uniform quarter-wave tube only**, c=343 m/s: L=0.16m → 535.9375Hz; L=0.176m → 487.2159Hz; -9.09% frequency. This is not a direct prediction of actual CC-A2 dynamic vowel formants, and F0 remains an independent source parameter.

## After CI/creator listening

Append exact branch SHA, GitHub Actions run link, Vitest/build results, actual JSON observations and limitations. Until then, all test and subjective evidence is pending. If the prototype works, propose a narrowly scoped optional Studio feature merge without falsely adopting new Core physics.

## 2026-10-23 post-implementation evidence — engineering only

**Tested code HEAD:** `4cbe3b6116cb4341841423153d3e2a7008a3b189`. All four latest-head workflows completed successfully:

| Workflow | Result | Exact code-head evidence |
| --- | --- | --- |
| Studio CI (Vitest, Node bridge tests, TypeScript build) | **PASS** | [39927450512](https://github.com/ryonakayama234/morphoacoustics-studio/actions/runs/39927450512) |
| CC-A2 live two-body Core→Chromium E2E | **PASS** | [39927450521](https://github.com/ryonakayama234/morphoacoustics-studio/actions/runs/39927450521) |
| X2a older real-physics Studio regression | **PASS** | [39927450563](https://github.com/ryonakayama234/morphoacoustics-studio/actions/runs/39927450563) |
| CC-B1 private local paired-physics regression | **PASS** | [39927450569](https://github.com/ryonakayama234/morphoacoustics-studio/actions/runs/39927450569) |

The CC-A2 browser E2E now asserts: two newly generated physical Takes from distinct frozen bodies; valid archived WAV checksum and playback; A/A identical `audio_ref` twice; hidden original Take panels during a trial; A/B differing real Take refs; subjective record saves with source digests; localStorage records with both trials; existing reload/server-restart path still succeeds. [E2E real WAV + browser evidence artifact](https://github.com/ryonakayama234/morphoacoustics-studio/actions/runs/39927450521/artifacts/12490446142).

This evidence establishes **software operation and existing Core path preservation, not perceptual improvement or human validation**. The same-head run checked no new hearing judgments: human results = **NOT TESTED**, independent blinded discrimination = **NOT TESTED**, voice-likeness = **NOT TESTED**, physical sound-model upgrade = **NOT APPLICABLE**. The next gate remains creator listening, preferably with an independent multiple-exemplar protocol under Core [D1 #37](https://github.com/ryonakayama234/morphoacoustics/issues/37). Do not infer that the synthetic vowels became voice-like.
