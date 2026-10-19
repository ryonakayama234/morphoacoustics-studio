# CC-A2 — 2身体を交換して聴く（Studio限定実験、正式採用前）

**Status: Draft PR candidate, NOT adopted.** Existing X2a is independently adopted and remains unchanged. This adds a separate Performance Contract **v1** UI/localhost bridge, not a universal anatomy editor.

Parents: [Studio #14](https://github.com/ryonakayama234/morphoacoustics-studio/issues/14), [Core CC-A2 PR #122](https://github.com/ryonakayama234/morphoacoustics/pull/122), adopted Contract v1 [Core PR #101](https://github.com/ryonakayama234/morphoacoustics/pull/101).

## Creator scenario

1. Characterの名前・説明を通常のStudioで作る。
2. 下部のCC-A2 Stage Aパネルから16.0 cmの身体A (`v3b-axial-M0@1`) を選択しPerform。
3. 次に17.6 cmの身体B (`v3b-axial-M1@1`) でPerform。
4. 保存された2つのTakeをA/Bとして選択し、WAVを再生し、身体traceと物理計算receiptを参照する。
5. ブラウザ再読み込み・localhost再起動後も同じTakeを読み込む。

発話は単一の実験用「あい」だけです。音源F0=100 Hz、固定したtask-level Gesture、seed=0、0.5s 48kHz mono; 変更は声道の長さだけ。**自然な日本語、聴覚的な話者性、身体組織の実在的モデルは未検証です。**

## Current SYSTEM / DATA flow

```mermaid
flowchart TD
    U["Studio Character draft"] --> S["CC-A2: body preset A@1 or B@1"]
    S --> R["PerformanceRequest v1, exact chosen body"]
    R --> L["CC-A2 localhost 127.0.0.1:8766"]
    L --> V["Pinned Core v0/v1 schemas + trusted source revision check"]
    V --> C["tools/cc_a2_live.py"]
    C --> B["PreparedMorphology and physical capability test"]
    B --> G["Frozen three-task movement + fixed LF 100Hz source"]
    G --> A["Real moving acoustics"]
    A --> O["Raw pressure, normalized WAV, geometry trace, receipt"]
    O --> X["Core exact digest and v1 semantic result"]
    X --> N["Independent Node NPY quantum/bytes + body/oracle verification"]
    N --> T["Content-addressed files + immutable Take on disk"]
    T --> P["Creator audio playback / A-B / reload"]
    B --> F["UNSUPPORTED / INFEASIBLE: no playable WAV"]
```

### Trust and contract

- Core's v1 JSON schemas are read from an **exact SHA pinned checkout**, rather than redefining Studio schemas; v0 remains unmodified and separately supported.
- Core Python produces `sha256-canonical-json-v1`; Studio treats it as an opaque authority, never asserting JSON.stringify byte equivalence.
- A selection is exact preset ID/revision. Result must contain a matching resolved BOUND body/preparation digest. Historical Takes retain that snapshot, with no mutable/latest re-resolution.
- The limited bridge only listens on loopback, enforces a bounded request, a single worker, a fixed Python command, a 180-second worker timeout, and a source revision/dirty-worktree gate. This is a trusted local research tool, not a multi-tenant security sandbox.
- Studio independently quantizes the **actual** 24,000-sample NPY pressure bytes; A also matches frozen Experiment029 pressure checksum, and both match Core execution receipt. Changes in terminal resonances are checked against frozen Experiment028 Wolfram peaks; all errors refuse Take storage.
- WAV is peak-normalized separately. It is not calibrated SPL, and listening preferences are not scientific physics gates.
- Core outputs are rewritten into immutable server-local, content-addressed artifact refs only *after* verification. Both original Core result and transformed archived result are retained for audit.
- User interactions are versioned v1 Takes separate from adopted v0/X2a history; no mass migration, no free-text Direction-to-physics mapping, no post-hoc neural or EQ.

## WSL2/Linux local runbook

The CC-A2 Core is an **unmerged** feature branch. Use a separate pinned checkout from the existing frozen X2a Core tree (which must remain at `a75418770ed28cbd301d554171a6b60ee5a05ee9` for X2a). The CC-A2 trusted source check will not accept a different Core HEAD.

```bash
git clone https://github.com/ryonakayama234/morphoacoustics.git morphoacoustics-cc-a2
cd morphoacoustics-cc-a2
git fetch origin pull/122/head
git checkout 588c52cac2774adbdb2e2fb802cbec04669833e2
python3.11 -m venv .venv
source .venv/bin/activate
pip install 'numpy==2.4.6'
pip install -e '.[dev]'
cd ..

git clone https://github.com/ryonakayama234/morphoacoustics-studio.git
cd morphoacoustics-studio
git fetch origin feature/cc-a2-studio-two-body-20261019
git switch --detach FETCH_HEAD
npm ci
export MORPHO_CORE_DIR="$(pwd)/../morphoacoustics-cc-a2"
export MORPHO_PYTHON="$MORPHO_CORE_DIR/.venv/bin/python"
npm run cc-a2:server
```

In a second WSL2 terminal, run `npm run dev` in the same Studio checkout, open the Vite URL and scroll to CC-A2. To exercise legacy X2a independently, run its separate existing service against its independently pinned older Core checkout.

**Do not use the Core feature branch as a replacement for the old X2a pinned source checkout.** After core PR changes, update the Studio exact SHA, both CI pin and this runbook before claiming new-head compliance.

## CI / review gates

- Core's dedicated pinned Python test / frozen Experiment028 Wolfram and Experiment029 M0 quantized checks must PASS at exact Head.
- Studio `npm run build`, `npm test`, CC-A2 Node policy and Core-backed real HTTP E2E CI must PASS on exact pinned Core SHA.
- End-to-end: two fresh physical executions, raw NPY / WAV and immutable result, no counterfeit audio for missing body, reload/restart persistence.
- Browser automated flow and actual Windows/WSL2 human audition remain **separate human/UX gates** if not executed.
- Independent physics, contract/provenance and security reviews must examine exact HEADs. AI-only review must disclose independence limits.
- No merge/Ready before scoped GO_LIMITED decision after blocking checks. Unsupported is not acoustic INFEASIBLE; a process failure is FAILED.

## Known limits

The 2 preset IDs represent only the adopted Experiment028 10% axial length contrast with a shared Experiment029 permissive articulator wrapper; their combined PreparedMorphology binding is newly authored and independently auditable. Unsupported Direction, gestures, seed and text are rejected by Core. Current v1 panel is intentionally separate from the existing v0 TakeStore to prevent silent schema migration and reinterpretation of older artifacts.
