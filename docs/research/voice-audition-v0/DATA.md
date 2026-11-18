# VA-L0 DATA — snapshot and evidence identity

The observation is **not part of** CreatureSpec, GestureScore, or Performance Contract v0/v1.

~~~text
CC-A2 validated physical Take
  ├─ result.take_id
  ├─ request.embodiment.{preset_id,preset_revision}
  ├─ result.embodiment.{status,preparation_digest}
  ├─ result.provenance.{backend,backend_version,input_digest}
  └─ verified audio artifact ref
                   |
                   v
FrozenTake (immutable values copied at trial start)
                   |
                   v
AuditionTrial/v0
  ├─ trial_id, started_at
  ├─ kind: body-contrast | same-audio-control
  └─ first, second : FrozenTake (randomized)
                   |
                   v
AuditionRecord/v0
  ├─ completed_at
  └─ assessment
     ├─ difference: clear | subtle | none | uncertain
     ├─ first_voice_likeness, second_voice_likeness: integer 1..5
     ├─ first_artifact, second_artifact:
     │  none | buzzy | metallic | breathy | clicks | other
     └─ notes: free text (max 2000 characters)
~~~

## Exact controls

- `body-contrast`: distinct verified body IDs and distinct physical Take IDs. The sound files stay intact, left/right swapped by a cryptographically generated random bit.
- `same-audio-control`: repeat exactly the same frozen Take/audio_ref on both sides. Random bit selects one of the two available verified Takes.
- Fail closed on missing audio, non-FEASIBLE realization, missing/mismatched BOUND body, unsupported preset revisions, or missing Core provenance.
- `localStorage` key `morphoacoustics-studio:voice-audition/v0`; exporter packages records in `voice-audition-export/v0` JSON. Local data is not signed and must **not** be confused with Core proof or scientific timestamp attestation.
- Historic records carry frozen source and trial identities; they are **subjective user annotations**, not new or independently confirmed physical results.
- No waveform, equalizer, gain knob, source synthesis or post-processing code is introduced.

## Interpreting outcomes

A/A false alarms are visible, not discarded. A report of clear difference on a control indicates uncontrolled expectation/device/hearing variability or response error, not body acoustics. A/B 'clear' says only this listener heard a contrast: not voice identity, naturalness, or population perceptibility. Voice-likeness 1..5 is a subjective anchored ordinal impression, not MOS. The 1..5 scale lacks formal calibration.
