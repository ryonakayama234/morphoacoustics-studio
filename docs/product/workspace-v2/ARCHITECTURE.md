# Workspace V2 / product composition

Status: PREVIEW ONLY, no default switch, no audio adoption. Creator feedback 2026-10-25 and issue #32 are the source of requirements.

## Permanent layout
Three mutually exclusive modes: Character / Motion / Scene. Fixed top mode switch, left Project Library, large central spatial editor, selection Inspector on right, bottom Take dock, optional Research Drawer. No fourth experiment tab; no vertically stacked panel per new feature. Neutral graphite/silver colors, concentrated focus contrast and layered depth in central canvas. Minimal prose.

## User tasks
- Character: organ module graph (organ nodes, typed port/edge connections), body morphology and material identity. True editable/general physical graph is NOT YET IMPLEMENTED; only bounded prepared 1D M0/M1 bodies and CC-B1 site08 edit exist as separate validated legacy experiments.
- Motion: Script, Direction, overlapping motor gestures, actual physical Perform and Takes. Existing Script/Direction v0 draft is usable; general speech motor compilation from packages/speech-motor-compiler remains gated, not adopted.
- Scene: Speaker / Listener roles, transform and movement, eventual 2D/3D bodies, physical contact and acoustics including optional ASMR. Scaffold only; never present simulated physics that does not exist.
- Take dock: canonical playback/comparison/export. Immutable results refer to exact Character/Body/Motion/Scene snapshot and source/solver hashes, never duplicated into organ or scene model.

## Every future PR MUST
1. Name user intent, owning domain model, existing PANEL_REGISTRY slot, model/schema version and backend capability state.
2. Update system diagram and data ownership map when a new domain boundary changes.
3. Replace content inside existing center canvas/inspector; do not append a new root card beneath the workspace. If no slot fits, revisit IA before implementation.
4. Keep diagnostics, SHAs, solver controls in the optional Research Drawer, never default prose walls.
5. Reject unsupported actions rather than faking organ editor, 3D contact, natural speech or audio quality.
6. Require real user listening separately from physical CI and @codex review for acoustic feature adoption.

Old Studio main, X2a/CC-A2/CC-B1 backends and Takes are untouched while preview is evaluated. See PANEL_REGISTRY.json and DATA_MODEL.md / SYSTEM.md.