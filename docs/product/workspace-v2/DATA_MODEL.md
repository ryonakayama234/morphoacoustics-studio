# Workspace V2 / owned data and edges

Proposed future types, NOT descriptions of existing implemented Core APIs:
- ProjectDocument: id, version, characterRefs, scriptRefs, directionRefs, sceneRefs, takeRefs. Owns references only.
- CharacterDefinition: characterId, revision, organGraphRef, identity metadata. OrganGraph owns nodes and edges.
- OrganNode: organId, moduleType, paramsRef, supportedCapability. Ports have type and SI dimensions.
- OrganEdge: edgeId, from {organId, portId}, to {organId, portId}, kind [airflow, mechanical, acoustic, control], validated compatibility. Graphic edges alone ARE NOT executable physics.
- PerformanceDraft: characterRef, scriptRef, directionRef, motionScoreRef optional; overlapping gestural intervals, not concatenation of recorded syllables. SMC is a separately gated producer.
- SceneDocument: sceneId, revision, actorRefs, environmentRef. SceneInstance references a Character snapshot as Speaker or Listener, plus transform/contact state only when actually available.
- TakeRecord: immutable id, all input revisions, source hash, backend version, physics receipts, file hashes, perception notes separate from numeric correctness.
- WorkspaceUiState: activeMode, selectionRef, viewport, inspector tab, Take selection and playback position. UI owns NO duplicate physical model.

Existing actual adapters: src/studio/model.ts for draft Character/Script/Direction; src/ccB1 for bounded site08 rest-area; src/ccA2 for 2 prepared bodies; src/performance/TakeStore.ts for previous Takes. WG2 Draft #31 is HOLD for user-audible regression. No source SHA repinning in this design.

Adoption state: scaffold = no physical execution, experimental = physically executed but no creator acceptance, adopted = independent technical and creator gates, unsupported = explicitly refused.