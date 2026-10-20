# DATA — trusted exactly pinned physical monitor provenance

~~~mermaid
flowchart LR
  R["Fixed schema + character ID"] --> C["Exact Core SHA; PreparedBranch3 body digest x2"]
  C --> M["Prescribed U(t), 6 ports p[Pa]/U[m³/s]"]
  M --> W["Raw A.in Pa; two mono WAVs / pair-shared gain"]
  W --> V["Node verifies SI NPY/PCM bytes, graph, energy, hashes"]
  V --> A["Atomically indexed immutable Take pair + SHA-addressed files"]
  A --> B["GET Takes and artifacts with readback verification"]
~~~

- Request: only exact schema og-aud1.preview.request.v0 and ASCII character_id. No arbitrary graph/path/command supplied by browser.
- Core snapshot identity: OG-4 typed A.in/out, B.in/out, C.in/out plus law ideal.branch3.p_u at J; C areas exactly 0.00015 and 0.00060 m², matched distal loads. Snapshot blueprint_digest + preparation_digest independently revalidated by Core. Static OG-4 phasor source is for original graph binding, not the time stimulus.
- Exact source: Experiment045 analytical flow U(t) 48kHz × 1s, m³/s; SHA256 pinned. Six port array shape (6 ports, 2 observables, 48000 frames) float64 SI, p(A.in,t) also exported raw and signed J conservation audited. Non-radiated internal pressure only.
- PCM16 mono 48000 × 1s checked sample-by-sample against saved raw Pa and single A/B gain; JS independently checks formula samples, source, J and full time-integrated inlet/outlet energy. Archive files have SHA256 content names, pair record saved atomically after checks and revalidated on reload.
- Failure examples: stale/dirty Core revision, unsupported organ geometry, invalid NPY format/dtype, changed source bytes, wrong PCM values, bad body receipt, path escapes, corrupted archived artifacts -> no successful playable Take and no fallback.
- This security boundary is trusted local single-user software; a hostile same-host administrator is not defended. Human phonation/loudness or external radiation is NOT measured.
