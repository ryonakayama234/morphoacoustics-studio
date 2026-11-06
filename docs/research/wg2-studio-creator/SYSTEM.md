# WG2 Studio system — new acoustic physical Take (experimental)
```mermaid
flowchart TD
  UI["Studio: Character + M0/M1 rev1 + 0.25/0.50s"]
  LOCAL["WG2 local service 127.0.0.1:8768"]
  AUDIT["Exact Core clean source SHA + tool executable check"]
  CLI["tools/wg2_creator_take.py"]
  PREP["CC-A2 audited PreparedMorphology registry M0/M1"]
  SRC["Adopted SV1 LF prescribed 100Hz source flow"]
  PHYS["WG1/WG2 native passive waveguide + B0"]
  WAV["Native p/U and causal 48k mouth-port WAV"]
  NOTE["Core fsynced manifest+sha/byte receipts"]
  NODE["Node independently verifies body, native NPY, WAV, hashes"]
  TAKE["Atomic studio take.json marker"]
  PLAY["A/B listen, download, reload, restart"]
  UI --> LOCAL --> AUDIT --> CLI
  PREP --> CLI
  SRC --> CLI
  CLI --> PHYS --> WAV --> NOTE --> NODE --> TAKE --> PLAY
  PLAY -->|reverify before read| AUDIT
```

The Core script is the *only* generator of physical pressure and WAV. Node does not synthesize or normalize. UI uses no unconstrained Script/Direction; only one static /a/-like 100Hz externally prescribed motor/source flow. This is not the old CC-A2 dynamic /ai/, not human-like speaker identity or microphone output. No main backend replacement.

Strict boundaries: Core older X2a/CC-A2 histories remain frozen, new WG2 data root and local port unique, new history only post-validated Take, and source SHA pinned to one exact reviewed Core checkout. Browser reload or server restart loads only previously valid immutable marker; SHA and source verification is repeated before playback.
