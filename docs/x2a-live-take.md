# X2a — First Live Embodied Take

Status: Draft PR #15; numerical CI and human playback gates are required before merge.

## Scope and model evidence

Studio converts exactly one creator Script segment あい into the already audited
Core experimental /a/→/i/-like continuous motor plan. Core revision is fixed at
a75418770ed28cbd301d554171a6b60ee5a05ee9 (Core Issue #69 / PR #70).
This is ONE physical body, ONE frozen pronunciation, seed 0, no validated creative
Direction, not arbitrary Japanese TTS. Human vowel identification is not certified.

Live X2a calls a new physics computation and returns 0.5 seconds / 48 kHz /
24,000 mono WAV samples, raw pressure in Pa, selected 10-ms-aligned physical trace,
diagnostics and manifest. Playback WAV is normalized to peak 0.90: it is not
a quantitative SPL measurement. Physically unreachable body M_minus is NOT
exposed as a selectable body; the scientific Core test keeps that gate separate.

## Architecture and safety

- Studio owns the Character, Script, Direction, Take and display.
- Only Core owns PreparedMorphology, task/motor physics and acoustics.
- The pinned creative v0 contract stays authoritative at Core and the vendored
  v0 snapshot is read-only in Studio.
- The new Node localhost service binds to 127.0.0.1:8765 and Vite proxies /live.
  It accepts validated JSON, never launches user-selected commands, and uses a
  fixed Python entrypoint with an exact immutable Core git HEAD check.
- Experimental live mode explicitly disables the unsupported Direction controls.
  No energy/pace/emotion/notes are quietly turned into uncalibrated physics.
- The Core completion marker result.json and each SHA-256/byte-size check must
  pass before WAV, raw NPY and trace CSV are copied into a disk-persistent,
  content-addressed artifact store. Take metadata is also saved server-side.
- A previous Take cannot be silently recycled as a success after an invalid,
  unsupported, physically infeasible, interrupted, or failing run. Job FAILED
  and realization outcomes UNSUPPORTED / INVALID / INFEASIBLE stay distinct.
- Generated files live under .morpho-live-data/ in Studio, excluded from Git.
  Browser localStorage only stores a Take index; it never holds the generated
  WAV bytes. Deleting an item in the UI does not currently garbage-collect
  disk artifacts.

## WSL2 / Linux runbook

Requirements: Node.js >=22.12, npm, Python >=3.11, Git. Clone the two
repositories as sibling directories in WSL2. Run the following in one terminal:

```bash
git clone https://github.com/ryonakayama234/morphoacoustics.git
cd morphoacoustics
git checkout a75418770ed28cbd301d554171a6b60ee5a05ee9
python3 -m venv .venv
source .venv/bin/activate
python -m pip install 'numpy==2.4.6'
python -m pip install -e '.[dev]'
cd ..

git clone https://github.com/ryonakayama234/morphoacoustics-studio.git
cd morphoacoustics-studio
git fetch origin pull/15/head:x2a-live
git switch x2a-live
npm install
export MORPHO_CORE_DIR="$(pwd)/../morphoacoustics"
export MORPHO_PYTHON="$(pwd)/../morphoacoustics/.venv/bin/python"
npm run live:server
```

From a second terminal in the Studio checkout:

```bash
npm run dev
```

Open the Vite URL (localhost port 5173 by default), choose Live Experimental,
click the demo button for あい + seed=0, then Perform. Listen, download,
reload and listen again. Do not label the generated sound natural Japanese.

## Gates before completing Issue #11

1. Studio npm test / npm run test:bridge / npm run build pass.
2. GitHub physical CI checks out the exact Core SHA, runs with NumPy 2.4.6,
   launches two fresh physical executions and verifies 102 acoustic transfer
   calls per run, 24,000 WAV samples, immutable unique Take IDs,
   SHA-matching audio/trace, raw-pressure quantized scientific signature,
   and no-fallback for an unsupported new script.
3. Manual WSL2 Perform -> WAV -> reload -> replay and server restart persistence.
4. Separate code-security/transport review and scientific-claim review.

Wolfram independently checked 0.5 * 48000 = 24000 samples and 10-ms frames
corresponding to 480 samples. This is only timeline arithmetic, not physical
validation of the acoustic synthesis.

No promise is made of adjustable vocal effort, emotion, vowel recognition,
general phonology, 3D anatomy, FSI, or two-body live comparison. These belong
to later, separately gated work.

References:
- https://github.com/ryonakayama234/morphoacoustics/blob/a75418770ed28cbd301d554171a6b60ee5a05ee9/docs/limited-live-physics-x2a.md
- https://github.com/ryonakayama234/morphoacoustics-studio/issues/11
- https://github.com/ryonakayama234/morphoacoustics/issues/69
