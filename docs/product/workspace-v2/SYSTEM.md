# Workspace V2 / system boundaries

Project Library -> references Character, Script, Direction, Scene, Take. Top TabState chooses exactly one editor:
- Character center reads/writes future OrganGraph domain; right Inspector edits selected organ only if capabilities are adopted; current diagram selectable scaffold.
- Motion center reads Script/Direction v0 and future MotionScore; SMC is an optional proposed motor compiler, not a current route to general speech.
- Scene center reads future SceneGraph referencing Character snapshots; 2D/3D contact and Speaker/Listener acoustic execution unimplemented.
- Bottom Transport reads immutable Take IDs and historical audio, has no backend selection. Research Drawer alone reads full numeric/provenance traces.

Physical execution must cross one explicit adapter with exact input revisions, verified solver and resulting immutable artifacts; no UI-owned synthetic audio fallback.

Ownership graph:
ProjectDocument -> CharacterDefinition -> OrganGraph -> OrganNode/OrganEdge
ProjectDocument -> ScriptDocument + DirectionDocument -> PerformanceDraft -> optional MotionScore
ProjectDocument -> SceneDocument -> SceneInstance(characterSnapshotRef, spatial parameters)
PhysicsAdapter(CharacterSnapshot, MotionScore/Task, SceneSnapshot?) -> immutable TakeRecord
WorkspaceUiState -> selected IDs ONLY, never authoritative domain data.

Fixed composition contract enforced by docs/product/workspace-v2/PANEL_REGISTRY.json. Editing this registry requires architectural justification, not cosmetic card additions.