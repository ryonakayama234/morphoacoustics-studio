# UX Design Context — Morphoacoustics Studio

> Status: **proposal / design context** (2026-10-16)
> Scope: creator-facing application UX, navigation, information architecture, conceptual data ownership.
> Not a production API, UI component spec, rendering contract, visual style guide, or implementation milestone.

## One-sentence intent

A creative place to **design a character with a body**, give it a script and direction, make it attempt an embodied performance, place a speaker and a listener/receiver in a scene, and compare reproducible Takes. 発声器官を備えた身体が動き、その結果として音が生まれる。これは一般的な音声フィルタやテキスト音声変換ツールの設計とは異なる。

The app has two complementary workspaces:

- **Character Atelier / 工房** — create and revise character identity, eventually morphology, materials, source organs, and habitual motor tendencies. “Alchemy / anatomical workshop” is a *narrative atmosphere*, not a prescribed color palette or skeuomorphic widget library.
- **Performance Studio / 収録・演技** — prepare script and direction, stage speaker and listener/receiver (future), generate Takes and compare observations. Prefer precise, efficient audio-creation interactions.

A Library/Project entry point connects these. Stage and timeline editing are long-term design space, **not** currently implemented end-to-end.

## Find information quickly

| Question / search term | Document |
| --- | --- |
| What does a creator do first and next? / flow, journey, iterate | [experience-map.md](experience-map.md) |
| What is on each screen? / panels, stage, inspector, timeline | [workspaces.md](workspaces.md) |
| What data exists? Who owns it? / Character, Scene, Receiver, Track, Take | [data-concepts.md](data-concepts.md) |
| What is agreed, speculative, or intentionally unspecified? | [decisions.md](decisions.md) |
| Structured topic/term index for assistants and search | [context-index.yaml](context-index.yaml) |

## Source of truth and authority

1. **Upstream authoritative contract:** ../ repository morphoacoustics, contracts/performance/v0/; the read-only snapshot here is [vendor/performance-contract/v0/](../../vendor/performance-contract/v0/), pinned by [UPSTREAM.json](../../vendor/performance-contract/UPSTREAM.json). Do not change this mirror from UX docs.
2. **Current implemented client behavior:** [src/App.tsx](../../src/App.tsx), [src/studio/model.ts](../../src/studio/model.ts), [src/performance/TakeStore.ts](../../src/performance/TakeStore.ts), [src/backend/PerformanceBackend.ts](../../src/backend/PerformanceBackend.ts).
3. **Validated experiment-specific scope:** [docs/x1b-dynamic-performance.md](../x1b-dynamic-performance.md). Currently X1b is a narrow evidence-backed integration, not a general synthesis engine.
4. **These UX documents:** intended interactions and future conceptual boundaries; **never** supersede 1–3.

## Maturity labels used here

- **CURRENT** — implemented or specified by the checked-in app/contract; verify against source on change.
- **PROPOSED** — intended experience or conceptual UI ownership; no claim of working backend.
- **FUTURE** — capability dependency or extension not currently supported.
- **OPEN** — decision deferred; implementation has latitude.
- **NON-GOAL** — deliberately outside this document's commitment.

## Rules for using this context

- Do **not** treat a proposed Scene/Receiver/Gesture lane as fields of PerformanceRequest v0; that schema rejects unspecified fields.
- Do **not** imply the current app performs arbitrary TTS, spatial/binaural rendering, ASMR contact acoustics, free anatomy editing, or continuous gesture synthesis.
- **Gesture / motor instruction** is a cause; **waveform / spectrogram** is an output observation. Presentation on one timeline does not erase the distinction.
- **Vocal effort** (how the body acts) differs from **playback gain** (monitoring). Do not represent both with one control.
- A Take records its request, result, artifacts and provenance at creation; editing its source character later must not rewrite the past Take.
- Surface real backend capabilities and truthful UNSUPPORTED/INFEASIBLE/FAILED distinctions; UI should not silently promise unsupported operations.
- Keep visual taste (palette, typeface, surface treatment, exact dimensions) deliberately **open**; visual mocks are exploration, not normative assets.

## When revising

Update the relevant topic file, update [decisions.md](decisions.md) for changes in assumptions, and add/update [context-index.yaml](context-index.yaml) only when topics or workspace anchors change. If a proposed concept becomes real, cite the implementing code and the promoted upstream contract before upgrading its maturity label.