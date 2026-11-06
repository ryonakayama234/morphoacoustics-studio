# Conceptual data model and application/physics boundaries

> Status: **PROPOSED conceptual model**, not a JSON Schema or runtime type definition.
> Keywords: entities, IDs, version, CharacterSpec, Script, Direction, StageScene, Actor, Receiver, Pose, Tracks, Gesture, waveform, Take, provenance.

## Source-of-truth boundary (do not invert)

~~~mermaid
flowchart TB
    Creator["Creator-facing project and draft (Studio owns)"]
    Input["Character + Script + Direction (current contract v0)"]
    Adapter["Versioned backend adapter (Studio owns)"]
    Solver["Morphoacoustics engine (upstream owns physical state)"]
    Response["Result, diagnostics, artifacts, provenance"]
    Take["Immutable TakeRecord (Studio owns)"]
    Scene["StageScene and Gesture authoring (proposed)"]
    Creator --> Input --> Adapter --> Solver --> Response --> Take
    Creator --> Scene
    Scene -.->|"requires promoted API or separate versioned contract"| Adapter
~~~

Studio owns **creative intent**, UI drafts, selections, proposals and Take history. The upstream morphoacoustics repo owns physical semantics, executable gesture/physical models and the authoritative performance API. Neither Scene geometry nor gesture tracks may be silently smuggled into an existing contract object as invented fields.

## Core entity map

~~~mermaid
flowchart LR
    Project["Project (proposed)"] --> Characters["Character identities + revisions"]
    Project --> Script["Script + ordered segments"]
    Project --> Direction["Direction + overrides"]
    Project --> StageScene["StageScene (future)"]
    StageScene --> Actors["ActorInstance: Character revision + Pose"]
    StageScene --> Receiver["Receiver: pose + observation model"]
    StageScene --> Tracks["Timed gesture / spatial intentions (future)"]
    Characters --> Request["PerformanceRequest v0 (current subset)"]
    Script --> Request
    Direction --> Request
    Request --> Result["PerformanceResult v0"]
    Result --> Takes["Immutable TakeRecord"]
    Takes --> Artifacts["Audio / trace / diagnostics / provenance"]
~~~

## Conceptual object ownership

| Concept | Stable identifier / revision idea | Meaning / owner | Today |
| --- | --- | --- | --- |
| Project | projectId | Creative grouping, referenced entities, view/draft state; Studio | PROPOSED |
| Character | character_id + revision | Persistent named individual, defaults; current CharacterSpec v0 | CURRENT narrow metadata |
| CharacterDesign | character_id + design revision | Body morphology, material, source organs, habitual motor style | FUTURE, not a CharacterSpec v0 field |
| Script | script_id + revision | Ordered segments of text and actor character_id | CURRENT |
| Segment | segment_id | Text unit plus possible segment direction overrides | CURRENT |
| Direction | direction_id + revision | Performance intent / energy / pace / optional emotion | CURRENT in schema; actual backend support differs |
| StageScene | sceneId + revision | Shared spatial coordinate frame, actor and receiver bindings, room description | FUTURE |
| ActorInstance | actorInstanceId + Character revision reference | A specific character placed in a scene | FUTURE |
| Receiver | receiverId | Observation origin/model (e.g. mono mic, future binaural dummy head/ear) | FUTURE |
| Pose / Trajectory | time, position, orientation | Actor/receiver position and facing over time | FUTURE |
| Gestural intent | gesture/task and timing relation | Authored motor cause; not stored as observed audio | FUTURE compiler/API |
| Take | request + result / take_id | Immutable performance record with reproducibility context | CURRENT |
| Artifact | kind + ref, optional segment_id | Produced audio, trace, or other backend result | CURRENT |
| Observation lane | takeId + artifact reference | View on waveform, spectrogram, diagnosis; derivable from result | PROPOSED richer view |

**Current truth:** [StudioDraft](../../src/studio/model.ts) contains character ID/revision/name/description/default energy/pace, script ID/revision/segments, direction ID/revision/note/controls, seed. [PerformanceRequest v0](../../vendor/performance-contract/v0/performance-request.schema.json) contains character, script, direction, seed and requested capabilities. [PerformanceResult v0](../../vendor/performance-contract/v0/performance-result.schema.json) contains job status, realization outcome when succeeded, artifacts, diagnostics, provenance and optional timeline. The current shape has **no StageScene, pose, material, morphology mesh or arbitrary gestural-score field**.

## Timed lanes: authoring versus observation

| Lane type | Editability | Temporal meaning | Data ownership |
| --- | --- | --- | --- |
| Script/segment spans | Authorable | Linguistic instruction and segment annotations | Studio, CURRENT basic editing |
| Direction/effort/prosody | Authorable (only validated subset executable today) | Performance intent | Studio, future adapter/backend mapping |
| Gesture/motor score | FUTURE authorable | Gesture onset/offset, targets, overlap, constraints; physical cause | Future authoritative upstream contract/representation |
| Actor/receiver spatial automation | FUTURE authorable | Pose or trajectory vs time; spatial cause | Proposed Studio Scene with future renderer integration |
| Waveform/spectrogram | Read-only observation | Rendered samples or analysis | Backend result/artifact / derived UI view |
| Diagnostic/physical trace | Read-only observation | Outcome and model-state reports | Backend result/artifact |

Two gestures may overlap. Their timing must not be encoded merely as concatenated finished audio clips. Time alignment between cause and observed wave does **not** make them equivalent data.

## Spatial stage: minimal conceptual vocabulary

- A **world/scene frame** owns units, axes and origin. Editor coordinate convention and stage projection remain OPEN.
- A **Pose** has a position and orientation in its declared frame. Initially show 2D top-view x/y editing with numerical orientation and optionally z in inspector; this is a UX option, not a commitment to 2D-only acoustics.
- A **Receiver** has pose **and** a receiver model; a “listener” can be represented as a mic-like observation point, but binaural rendering requires ear/head or microphone pickup specification, not just a pictogram.
- For a source position s and receiver position r in the same Euclidean scene frame, relative separation is s − r and distance is ||s − r||. A common rigid rotation does not change that distance (checked symbolically with Wolfram Language on 2026-10-16). Distance alone does not specify directivity, orientation, near-field acoustics or room response.
- Output channels (mono / stereo / binaural left-right) are **not** automatically inferred from displaying a receiver icon.

This vocabulary is intentionally agnostic about spatial solver, HRTF, interaction geometry, unit scale default and serialization. These must be validated in a versioned boundary before becoming implementation fields.

## Take identity and truthful status

[TakeRecord](../../src/performance/TakeStore.ts) is a frozen pair of validated request/result. Preserve the historical request and provenance when the current character, script or direction changes. Existing result provenance includes backend, backend_version, contract_version, seed and input_digest (algorithm optional). Artifacts are referenced, not implied to be embedded in every Take.

~~~mermaid
flowchart LR
    Draft["Draft state"] --> Perform["Validate request -> backend.perform"]
    Perform --> Result["Validate result"]
    Result --> Frozen["Immutable request/result Take"]
    Frozen --> Compare["Compare / audition without modifying prior Take"]
    Compare -.->|"make new request"| Draft
~~~

**Three different state families:**

1. UI drafting: editing/dirty/ready (future UX decisions; not PerformanceResult status).
2. Job execution: QUEUED / RUNNING / SUCCEEDED / FAILED / CANCELLED from PerformanceResult v0.
3. Realization: FEASIBLE / INFEASIBLE / UNSUPPORTED / INVALID from PerformanceResult v0. An unsupported capability is **not** evidence of physically impossible motion, and SUCCEEDED + UNSUPPORTED is valid for X1b as documented.

## Non-goals for this document

No new normalized database schema, JSON Schema, performance-contract mutation, source-filter acoustics API, physics parameter values, ASMR renderer, HRTF specification, FEM model or fixed color palette is created here.

## References

- [upstream mirror](../../vendor/performance-contract/v0/)
- [UPSTREAM pin](../../vendor/performance-contract/UPSTREAM.json)
- [Performance backend boundary](../../src/backend/PerformanceBackend.ts)
- [StudioDraft request builder](../../src/studio/model.ts)
- [TakeStore](../../src/performance/TakeStore.ts)
- [X1b limitations](../x1b-dynamic-performance.md)
- [Wolfram coordinate-frame reference](https://reference.wolfram.com/language/ref/RotationMatrix.html)