# Creative experience map — creation, performance, comparison

> Status: **PROPOSED journey** with explicit CURRENT steps; not an assertion that every step already works.
> Keywords: journey, workflow, user flow, audition, performer, generate, Take, compare, iteration.

## Experience spine

~~~mermaid
flowchart LR
    A["Project / Library (proposed)"] --> B["Character Atelier"]
    B --> C["Edit character intent"]
    C --> D["Audition / try voice (proposed UI)"]
    D --> E["Performance Studio"]
    E --> F["Script + direction (current)"]
    F --> G["Scene: speaker + receiver (future)"]
    G --> H["Perform via supported backend (current narrow path)"]
    H --> I["Take: audio / diagnostics / trace when available"]
    I --> J["Listen and compare (current)"]
    J --> K["Keep / export output"]
    J -.->|"adjust character"| B
    J -.->|"adjust acting"| E
~~~

The diagram is a **target journey**. Current Studio already supports editing character metadata, script segments, direction and selecting a backend, generating Takes and comparing them. Project/Library navigation, anatomical editing, auditory audition as its own workspace, speaker/receiver position control and time-based automation remain conceptual. The runtime must omit, disable or explain unimplemented controls rather than simulate support.

## Creator-facing steps

| Step | Creator intent | Main UI | Evidence/maturity |
| --- | --- | --- | --- |
| 1. Select work | Resume a project/character | Project entry / Library | PROPOSED container; current App starts a workspace draft |
| 2. Design identity | Name and define the individual | Atelier — Character | CURRENT basic name, description and default controls |
| 3. Shape embodiment | Edit body, source organ, material, habitual behavior | Atelier — anatomy/material/behavior panels | FUTURE; not in CharacterSpec v0 |
| 4. Audition | Hear what changed without building a full scene | Atelier audition surface | PROPOSED UX; may use a constrained supported performance request |
| 5. Author script | Enter utterances and order segments | Studio — Script pane | CURRENT |
| 6. Direct acting | Adjust scene-level and segment-level intent | Studio — Direction pane | CURRENT basic energy, pace, notes; backend support narrower |
| 7. Block scene | Put speaker and receiver in a common stage | Studio — Stage viewport | FUTURE; Scene is not in contract v0 |
| 8. Perform | Submit a supported request to a backend | Perform action, capability/status | CURRENT; backend capability gated |
| 9. Observe | Listen to audio, inspect trace/diagnostics where supplied | Take, read-only observation lanes | CURRENT audio/trace artifacts under constrained conditions; advanced DAW lanes FUTURE |
| 10. Iterate | Compare Take A/B and adjust cause, not the previous result | Takes + source editors | CURRENT basic comparison; more detailed diffs PROPOSED |

## Interaction principles

**Character and performance stay separable.** Persistent individual identity/body/motor habit is not a substitute for temporary direction in a specific utterance. A Project may reference multiple characters, but multi-speaker orchestration is a future question rather than a v0 guarantee.

**Studio is a workbench, not a linear wizard.** A creator can switch among script, selected actor, spatial blocking and Take comparisons, while the typical first-time path still reads left-to-right.

**Preview versus commit.** Audition and temporary controls may be exploratory, but performing a Take freezes the exact request/result lineage. Results should be discoverable and comparable after source drafts change.

**No fictitious synthesis.** Availability of a UI track is not a backend capability. Status should distinguish validation failure, a backend execution failure, a supported-yet-physically infeasible gesture, and a not-yet-supported feature.

## Current-to-future adapter diagram

~~~mermaid
flowchart TB
    UI["Creator intent: character + script + direction"]
    Draft["StudioDraft / src/studio/model.ts"]
    Contract["PerformanceRequest v0 / upstream schema"]
    Backend["PerformanceBackend"]
    Result["PerformanceResult v0"]
    Take["Immutable TakeRecord"]
    Scene["Scene / Receiver / Spatial lanes (proposed)"]
    Gesture["Gesture coordination lanes (proposed)"]
    UI --> Draft --> Contract --> Backend --> Result --> Take
    Scene -.->|"future upstream contract or separate versioned adapter"| Contract
    Gesture -.->|"future compiler/contract"| Contract
~~~

The dotted connections are **desired future integration discussions**, not current serialization paths. The application does not own physical solver states.

## Acceptance examples for future UX

- Can a creator find the same character again and distinguish its revision from an old Take?
- Can they find why a Take differs (character revision, direction, backend, seed, diagnostics)?
- Can they move a speaker/receiver *in the editor* without the UI pretending that audio has already been spatially rendered?
- Can they edit the causal gesture/pose plan while a read-only waveform shows the previous synthesized outcome?
- Can an unsupported text or pace option be clearly identified without being misrepresented as a physically infeasible command?

## References

- [Current Studio editor](../../src/App.tsx)
- [StudioDraft and performance request mapping](../../src/studio/model.ts)
- [Immutable Take handling](../../src/performance/TakeStore.ts)
- [X1b capability limit and UNSUPPORTED semantics](../x1b-dynamic-performance.md)