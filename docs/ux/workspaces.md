# Workspace information architecture and screen placement

> Status: **PROPOSED screen skeleton**. Zones describe responsibility, not implementation components or pixel-perfect layout.
> Keywords: IA, navigation, tabs, stage, character create, inspector, timeline, motion, waveform, ASMR.

## Top level

~~~mermaid
flowchart TD
    Project["Project / Library (proposed navigation)"]
    Project --> Atelier["Character Atelier / 工房"]
    Project --> Studio["Performance Studio / 収録"]
    Atelier --> Identity["Identity and revision"]
    Atelier --> Morph["Morphology / Material / Motor habit (future)"]
    Atelier --> Audition["Audition and comparison (proposed)"]
    Studio --> Script["Script and segment editing (current)"]
    Studio --> Direction["Direction controls (current)"]
    Studio --> Stage["Stage: speaker / receiver / room (future)"]
    Studio --> Timeline["Gesture / pose lanes + observed waveforms (future)"]
    Studio --> Takes["Perform / Takes / comparison (current core)"]
~~~

## A. Character Atelier

~~~text
+-----------------------------------------------------------------------+
| Common project header: Project / Character / Save or revision status  |
+-----------------+-----------------------------------+-----------------+
| LEFT            | CENTER                            | RIGHT           |
| Entity/catalog  | Body / vocal-system viewport       | Inspector       |
|                 |                                   |                 |
| Identity        | Anatomical schematic (future)     | Selected organ  |
| Morphology      | 2D first, possibly 3D later       | Geometry        |
| Source organs   |                                   | Material        |
| Materials       | Origin / constraints / hotspots    | Motor habit     |
| MotorPersona    |                                   | Constraints     |
+-----------------+-----------------------------------+-----------------+
| Audition strip: sample action / selected preview / compare references |
+-----------------------------------------------------------------------+
~~~

**Zone ownership:** left selects *what* entity/section; center depicts body and anatomy with grounded geometry; right edits attributes of the selected item; bottom auditions resulting voice or lists trial Takes, with limitations visible.

**Narrative tone:** historic alchemical workshop, anatomical illustration, specimen/engraving, carefully crafted instrument. This is a creative metaphor only. Do not hardcode golden knobs, skeuomorphic bottles, parchment texture, colors, fonts or a particular illustration style.

**Important separation:** the character's durable attributes (body, material, habitual motor strategy/MotorPersona) versus momentary performance direction. A “cute voice” dial, pitch-shift-only identity, or direct waveform sound-painting should not replace embodied parameters.

**Progressive disclosure:** present identity and broad sections first; expose raw geometry/material numerical control only when backed by actual capabilities, with expert detail in the inspector.

## B. Performance Studio

~~~text
+-----------------------------------------------------------------------+
| Common header: Project / Character / Backend capability / Save state |
+-------------------+--------------------------------+------------------+
| LEFT              | CENTER                         | RIGHT            |
| Script            | Stage / scene viewport         | Inspector        |
| Segment list      |                                |                  |
| Segment selection | Speaker(s) / actor pose       | Selected entity  |
| Direction         | Listener / microphone receiver | Position/orient  |
| Notes, pace,      | Room context / guide/grid      | Listener model   |
| supported controls| 2D top view first (future)     | Render settings  |
+-------------------+--------------------------------+------------------+
| BOTTOM: shared playhead / ruler / scroll / zoom                       |
| Gesture / articulatory intent lane       (causal input; future)       |
| Position + orientation automation lane   (causal input; future)       |
| Waveform L/R + spectrogram               (observation, read-only)     |
| Diagnostics and availability             (output and system status)   |
+-------------------+---------------------------------------------------+
| Takes / audition / A-B comparison / export; immutable outcomes        |
+-----------------------------------------------------------------------+
~~~

**Left** owns human-readable script, performance intention and segment overrides.

**Center** owns spatial authoring: a *speaker* is an embodied source/actor; a *receiver* denotes listener/ear or microphone-like observation position. The “listener acts as microphone” metaphor is acceptable in UI, but an ear/head-transfer model versus a generic microphone must remain explicit when implemented. Show physical distances and orientation where meaningful, but no unvalidated room simulation.

**Right inspector** is contextual: selecting a speaker shows character binding and actor pose; selecting receiver shows pose and receiver model; selecting room shows scene context, not CharacterSpec controls.

**Bottom timeline** uses aligned time with distinct lane semantics (see data-concepts.md). “Motion” is a family of authored gestures, articulation or relative spatial trajectories; a waveform is a generated observation. A waveform drag should never silently overwrite the underlying physical state.

**Take dock** is a historical record of request/result/provenance, not a mutable audio layer masquerading as source data. An edited draft creates another Take.

## Proposed common UI interactions

| Interaction | Selection / input | Visible result | Ownership / maturity |
| --- | --- | --- | --- |
| Select character | Character ID + revision | Atelier and Studio reflect the same selection | Basic CURRENT, project navigation PROPOSED |
| Select organ/material | Anatomy object | Inspector changes context | FUTURE |
| Edit script | Segment ID, text | Script draft changes; take history does not | CURRENT |
| Edit direction | Notes / permitted controls | Current request draft changes | CURRENT; backend mapping varies |
| Drag actor / receiver | Stage object and pose | UI shows relative placement; no synthesis claim | FUTURE |
| Edit Gesture/Spatial lane | Timed causal keyframes/events | Rerender required to update output | FUTURE |
| Click Perform | Valid supported request | Immutable Take, status, artifacts, diagnostics | CURRENT |
| Compare Takes | Take IDs A/B | Audio/provenance comparison | CURRENT core; detailed waveform comparisons FUTURE |

## Capability-aware behavior

A backend that supports only the narrow X1b fixture must not appear to support continuous controls, arbitrary script, moving receiver, 3D acoustics, ASMR contact sources, or multi-speaker spatialization. UI can show a future workspace skeleton, but must mark unsupported controls clearly, hide them or keep them as non-operational concept surfaces.

Distinguish status categories from each other: job progress, realization outcome, and UI draft/dirty state are different axes.

## Accessibility / input considerations (nonbinding)

Do not require precision dragging as the only way to set position; a numerical inspector and keyboard control are important for stage edits. Keep time position, units and selection visible. Render warnings in text/icons, not color alone. Avoid using an ornamental period interface where exact audio editing requires dense repeatable controls.

## References

- [UX premise and maturity definitions](README.md)
- [Creative journey](experience-map.md)
- [Conceptual data boundaries](data-concepts.md)