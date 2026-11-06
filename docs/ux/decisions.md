# UX decisions, hypotheses and open exploration

> Status: **discussion record** as of 2026-10-16. “Preferred direction” is not an approval of concrete visual execution.
> Keywords: design decision, open question, style, palette, animation, prototype, proposal, constraints.

## Durable experience directions

| ID | Direction / rationale | Status |
| --- | --- | --- |
| UX-01 | Studio is a place to create **embodied characters**, give script/direction, let a physical backend attempt performance, listen and iterate. | PREFERRED product direction |
| UX-02 | Organize authoring into an **Atelier** (character making) and **Stage/Performance Studio** (acting/recording), with shared project identity and Take lineage. | PREFERRED IA hypothesis |
| UX-03 | Alchemy-era/anatomical-science *atmosphere* belongs especially in the Atelier; precise modern audio-production interaction belongs in the Studio. Both are the same product. | PREFERRED metaphor, not visual spec |
| UX-04 | The Studio's central scene should make speaker and receiver/listener placement intelligible; bottom workspace reserves time-aligned gesture/motion and waveform/diagnostic lanes. | PROPOSED layout |
| UX-05 | The Take is immutable historical output; the waveform is observed result, gestures/positions are causes. | CURRENT invariant + proposed timeline presentation |
| UX-06 | Capability-aware UI does not advertise arbitrary speech, ASMR, spatial acoustics, or free anatomy editing until supported. | REQUIRED product truthfulness |
| UX-07 | This document set stores **intent and structure**. Do not canonize the current generated images, palette, component styling or typography. | NON-GOAL decision |

## Design freedom explicitly preserved

- Color family, exact hex values, typeface, decorative surfaces, icon system, shadow and border styles.
- Whether anatomy appears as scientific illustration, 2D schematic, layer stack or later 3D mesh.
- Whether the studio's scene is 2D top view, an optional perspective view or another legible manipulation canvas.
- Precise sizing and docking of panels, inspector patterns, lane heights, animation details and art direction.
- Naming refinements, as long as underlying roles and contracts stay unambiguous.

The interface should not be *flat for its own sake*, nor should it become so atmospheric that numerical work is obscured.

## Open questions to resolve with experiments

| ID | Question | Minimal learning experiment / success criterion |
| --- | --- | --- |
| UX-Q01 | What is the smallest useful character editor before editable morphology is supported? | Show current CharacterSpec controls; can creators understand limits and produce different traceable Takes? |
| UX-Q02 | Does a 2D scene help artists reason about source/receiver even before a spatial audio backend exists? | Click/drag and numeric inspector prototype; no claim of generated positional audio |
| UX-Q03 | Does “listener as microphone” confuse a real ear model with generic audio capture? | Compare receiver modes in labels/inspector; users predict what will be rendered |
| UX-Q04 | Which temporal tracks are editable upstream inputs vs downstream read-only outputs? | Differentiate gesture/pose versus waveform in usability test and data lineage review |
| UX-Q05 | Can a creator find why Take A and B differ? | Compare exact request/provenance/diagnostics and identify changed cause |
| UX-Q06 | When do physical revisions invalidate an old preview, and how is that shown? | Edit draft after Take; historical playback and provenance remain stable |
| UX-Q07 | When a backend returns UNSUPPORTED, do users understand it is not physical INFEASIBLE? | Show X1b unsupported text/pace; avoid implying the body failed |
| UX-Q08 | What stage coordinate convention and receiver model are sufficient for first spatial experiment? | Define and test explicit frame/orientation units in a promoted upstream interface |

## Revision discipline

- Move a hypothesis to “implemented” only after referencing actual source or contract version.
- Keep speculative entities named **PROPOSED/FUTURE** in every file where a reader could mistake them for a supported v0 request field.
- Track experiment outcomes rather than collapsing a question into a color or layout preference.
- Treat generated UI mockups and illustrative Figma files as disposable exploration, not authoritative UX documentation.
- If upstream physical science changes the representation (e.g. temporal gestures or spatial receiver model), update this conceptual documentation after the authoritative change, not before.