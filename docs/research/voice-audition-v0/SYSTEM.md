# VA-L0 SYSTEM — physical causality and observation

The below shows **existing** physical sources and this increment's **new** observation layer.

~~~mermaid
flowchart TD
  subgraph Core [Existing Core real physics: no changes]
    M["CreatureSpec + versioned 1D prepared body M0 or M1"]
    G["Fixed 3-task GestureScore + LF source 100 Hz"]
    R["Morphology-conditioned realization"]
    P["Time-varying 1D acoustics"]
    W["Physical raw Pa + derived playback WAV + provenance"]
    M --> R
    G --> R
    R --> P
    P --> W
  end
  subgraph Studio [Existing CC-A2 plus VA-L0]
    T["Verified immutable v1 physical Takes"]
    C["Creator selects two body Takes"]
    L["Masked order A/B or identical-WAV A/A control"]
    H["Human hearing: difference, voice-likeness, artifact"]
    N["Local observational record + JSON export"]
    T --> C --> L --> H --> N
  end
  W --> T
  X["Optional SMC / ASMR external imports later: NOT active"] -. "future opt-in capability adapters only" .-> G
~~~

## Dependency and authority

1. Core main is the source of physical law and explicit backend capability; `src/morphoacoustics/` and `src/morphoacoustics_graph/` are unchanged.
2. Adopted CC-A2, separate from X2a, owns validated 16.0/17.6 cm body selections; `server/cc-a2-server.mjs` checks fixed physical source, exact body and raw artifacts.
3. VA-L0 in `src/ccA2/audition.ts` and `VoiceAudition.tsx` receives **archived** CC-A2 physical Take refs, not simulation controls. It does not write back to the Core or determine physical feasiblity.
4. Existing CC-B1 BodyRevision Gate C research PR stack (#145, #159, #163, #165, #166) stays draft and distinct; VA-L0 does not consume or claim its API. Studio CC-B1 private atelier also remains separately scoped.
5. In future, organ nodes/ports and MotorPersona can be compared with exactly this observer UI only after their respective source/physical validity gates. This iteration confers no adoption.

## Creative journey

Character → two embodied fixed-gesture Takes → choose pair → label-masked audition (or A/A) → separately record difference and quality → reveal exact bodies → review notes + evidence → try different physical hypothesis in a later iteration.

The original pressure and prepared-body provenance are not modified. Existing WAV volume normalization in CC-A2 is inherited unchanged; it prevents calibrated SPL claims and cannot be assumed to equalize perceptual loudness. Monitoring room, hearing, device, prior exposure, and ordering are limitations. The nearby parent app can reveal identities before listening: **this is masking, not strong scientific blinding**.
