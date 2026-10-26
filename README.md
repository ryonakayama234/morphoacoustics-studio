# morphoacoustics-studio

Creator-facing performance studio for the `morphoacoustics` project.

## Boundary

This repository owns the creative application layer: character, script, direction, performance requests, takes, comparison, and backend adapters. It must not absorb solver-specific physical state or redefine the upstream performance contract.

The authoritative creative integration contract lives in `ryonakayama234/morphoacoustics` under `contracts/performance/v0/`.

The checked-in contract snapshot under `vendor/performance-contract/v0/` is read-only application input. `vendor/performance-contract/UPSTREAM.json` records the exact upstream commit and blob SHAs.

## Development

Requires Node.js 22.12+.

```bash
npm install
npm test
npm run build
npm run dev
```

PR #1 intentionally implements only the contract/bootstrap vertical slice. Real synthesis and creator workflow UI come later.

## Current Studio capability status (2026-10-20)

The note about **PR #1** above describes the *historical initial bootstrap*, not the latest application. **CC-A2 limited Stage A was merged on 2026-10-19:** a creator can select two exact validated *serial*-tract physical body presets, generate fresh Core-derived pressure-monitor WAV Takes, compare them and persist/reload them via the documented trusted local integration. See [CC-A2 adoption, test evidence and boundary](docs/cc-a2-two-body-studio.md).

**Not yet implemented/adopted:** arbitrary node/edge anatomy editor, general Character Creator physiology, graph-conditioned branching-organ audio, arbitrary Japanese speech, and radiated ear-received creature voice. The [OG-AUD1 creator design handoff](docs/og-aud1-creator-handoff.md) and [Core executable Wolfram preflight](https://github.com/ryonakayama234/morphoacoustics/blob/research/og-aud1-gatea-20261020/experiments/043_og_aud1_preflight/RESULTS.md) are research-only; they do not make the Studio bridge graph-capable. See [docs index](docs/README.md) and the linked Core/Studio Draft PRs for status and ownership.
