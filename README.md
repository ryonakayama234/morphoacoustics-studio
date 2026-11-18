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


## Voice Atlas — exploratory listening notebook (VA-L0)

The CC-A2 two-body creator panel now has a **candidate** label-masked physical Take A/B audition and same-audio A/A control. It collects separate subjective difference, voice-likeness, artifact, and creator-note observations, with frozen Core Take provenance in exportable local JSON. It does **not** synthesize or modify audio, or establish naturalness. See [VA-L0 INDEX](docs/research/voice-audition-v0/INDEX.md), [SYSTEM](docs/research/voice-audition-v0/SYSTEM.md), [DATA](docs/research/voice-audition-v0/DATA.md), and [EXPERIMENT](docs/research/voice-audition-v0/EXPERIMENT.md). This capability remains a draft until CI and actual listening acceptance.
