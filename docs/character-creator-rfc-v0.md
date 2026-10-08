# RFC v0: Embodied Character Creator — 身体から声を発見する

> Status: **proposal / design-only** — approved API/schemaではない。物理性能や実装済み機能を主張しない。
>
> Parent: [Studio CC Epic #12](https://github.com/ryonakayama234/morphoacoustics-studio/issues/12)
>
> Owners of concerns: Studio = creator UX/persistence; Core = morphology/preparation/physics and canonical performance contract.

## 1. Vision and problem statement

ゲームのキャラクタークリエイトに近い操作で、外見だけでなく**身体という音声生成装置**を創作し、「その身体が実際にどんな声を出し、どんな構音を実現できるか」を発見する。声を直接選ぶだけのボイスエディタでも、見た目だけのアバターエディタでもない。

成功体験の例: 身体Aの顎/声道の形状と身体Bの形状が異なるとき、同じGestureとDirectionを与えて別の観測音響と物理traceが生まれる。変更から音までの由来を辿れ、実現不能や未対応は明示される。

体格や顔つきの編集が常に音を変える必要はない。**物理と結びつけると決めた特徴のみ**因果経路を経て結果へ作用させる。髪・服・目など音と無関係な装飾も自由に創作できる。

## 2. Creator experience / conceptual surfaces

3層の編集モードを想定。項目や名称は将来のUX検証で変更してよい。

1. **Simple / キャラクリ**: 体格、頭部比率、顔、顎、口、発声の傾向など。身体のvalidityを保つ高水準control。プリセット、Undo、A/B比較。
2. **Anatomy / 器官**: 通常・透視・矢状面・器官isolated viewを切り替え、頭蓋/口腔/鼻腔/声道/舌/喉頭等を調節。必要なら物性/運動能力も編集。
3. **Research / 実験**: geometry、物性（density/stiffness/damping/anisotropy等）、muscle/actuator、solver fidelity、control mapping、diagnosticsを単位付きで調節。

Creatorの声の嗜好（かわいい、柔らかい等）は**知覚上の目標・探索条件**であり、単一の物理パラメータや音響gainとして直結しない。候補身体を探索して人が比較するのは将来機能。

### Editing inventory (product-level)

| Category | Creator-facing examples | Physical link / interpretation | Phase |
|---|---|---|---|
| Appearance | 髪、目、衣装、肌、表情、外観プロポーション | 原則visualのみ。物理器官と対応づけた変数のみ連動 | A→C |
| Body frame | 全身スケール、頭部比率、姿勢、頸部、胸郭 | 器官配置・許容範囲・呼吸運動、変形constraints | C |
| Jaw, palate, lips | 顎長/突出、口吻、口蓋、唇、歯列 | oral tract geometry / articulator constraints | B→C |
| Cavities | 声道の長さ、声道断面、鼻腔、側枝、気嚢 | acoustic cavity geometry/topology・共鳴 | B→D |
| Tongue & articulators | 舌体積・形状・可動域・接触 | task reachability、動的狭窄、接触 | C |
| Source organs | 喉頭位置、声帯長/厚/構造、複数音源 | vibration regimes、phonation、source–filter coupling（backend依存） | C→D |
| Respiration | 呼吸容量、呼気系・筋能力、習慣 | 呼気圧/流量/持続、効率（動的backendが必要） | C |
| Tissue and actuators | 材料、異方性、筋付着、力量、粘性 | constitutive law、変形、dynamics | C→D |
| MotorPersona | 話速傾向、調音癖、息遣い、抑揚の癖 | Gesture plan/coordinationへのバイアス。身体能力とは別 | C |
| Fantasy anatomy | 側枝、気嚢、複数声源、非ヒト骨格 | generalized cavity graph + multi-source model | D |

音量gain、実際のvocal effort、F0、声道長は混同しない。現在のbackendに存在しないパラメータは「操作可能」と表示しないか、明確に未実装/観察専用とする。

## 3. Separation of responsibilities / proposed model

これはスキーマ案を確定するものではない。以下の役割境界が正本であり、型名は**仮称**。

    CharacterSpec (creative identity: name, description, defaults)
    AppearanceSpec [proposed] (visual mesh, rig, adornments)
    EmbodimentRecipe [proposed] (meaningful parametric anatomy/material/actuators)
          |
          | validated preparation/compiler (Core-owned)
          v
    CreatureSpec + backend-specific prepared rest state
          |
          + GestureScore (task-level motor plan)
          |     ^ MotorPersona [proposed] influences planning, not anatomy
          v
    Physical state --> acoustics --> observations
          |
          v
    PerformanceResult + immutable Take and provenance

- **Character identity != selected body**: 同一キャラクターがhuman A/short tract/fantasy bodyの間を移れる。
- **Appearance != numerical morphology**: 表示向けメッシュと音響/FEM/XPBD向けメッシュは分けてよい。対応付け・導出・版・単位を記録する。
- **MotorPersona != Direction**: 習慣はキャラクターに持続し、Directionは当該Performanceに対する演出指示。身体の可動範囲が最終的な実現を制限する。
- **EmbodimentRecipe != CreatureSpec**: 編集値は物理状態そのものではない。Coreのpreparer/compilerが妥当性を検証してprepared morphologyを生成する。
- **Sensor output != model internal representation**: waveform、spectrogram、formants等は観測。生成表現として直接上流へ注入しない。

## 4. Product/physics boundary invariants

1. Creator UIはCoreのsolver stateやdomain modelをshadow implementationしない。Adapter経由で検証可能なPreparedMorphologyへ結び付ける。
2. 高水準control → metric geometry/material/action mappingは、単位・範囲・制約・version・由来・未知性を持つ。見た目からF0への硬直的な数式を規定しない。
3. 実行可否、支持backend、妥当性を分ける: FEASIBLE / INFEASIBLE / UNSUPPORTED / INVALID、job FAILEDの意味を保存。
4. ニューラル生成でphysical infeasibilityを「正しい発話」へ修正しない。
5. 同じ固定Gesture/Direction・異なるbodyという**一因子介入**で、音響変化と実現可否を比較可能にする（必要ならbackend精度差と切り分ける）。
6. Body/preset/recipe revision、compiler/preparation version、source evidence、backend version、seed、digestをTakeに固定する。
7. 不支持/非検証の3D、材料計算、FSI、汎用音声を提供済みと装わない。
8. 有用な単純化は許容するが、solver fidelityとモデル仮定を診断として表示する。

## 5. Binding and versioning: the first hard dependency

Current upstream [Body Binding v0](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/body-binding-v0.md) states explicitly:

- CharacterBodyBinding = character_id + exact preset_id + preset_revision.
- PreparedMorphology has Core-owned CreatureSpec + backend-specific rest state + provenance.
- Performance Contract v0 has **no creator-selectable embodiment request field**.
- Body selection requires a versioned contract revision (e.g. performance-contract/v1); do not overload Direction, free-form note or CharacterSpec.default_controls.
- PerformanceResult should carry resolved backend and preparation digest; immutable Take must record the selected/used body.

Therefore Stage A begins with a **Core contract change**, not an anatomy slider. Only stable, validated body presets should initially be presented. Studio UI depends on the canonical upstream contract and mechanically generated/validated types.

## 6. Roadmap with evidence gates

### A — Body preset selection & same-gesture comparison (first implementation slice)

**User story:** 既存キャラクターのままHuman AまたはHuman B（検証済みpreset/revision）を選び、同じ入力で別Takeを保存・並べて確認する。

Upstream gate:
- performance-contract/v1-equivalent Body selection/request snapshot + result body resolution (Core-owned) with v0 compatibility strategy.
- exact revision lookup, stable preparation digest, typed failure diagnostics.

Studio gate:
- select two backend-supported body presets without editing solver internals.
- each Take snapshots request, body selection and resolved provenance; compare observations/diagnostics.
- if one backend cannot generate the requested audio, **UNSUPPORTEDを表示**し、架空の結果を作らない。
- no arbitrary 3D editor, no unvalidated continuous interpolation.
- tests: reload/edited body does not retroactively mutate prior Take; invalid preset mismatch; deterministic mapping; two-body contrast.

**Independent review:** Core contract/provenance reviewer and separate UX/evidence reviewer validate that physical claims do not exceed actual backend capability.

### B — Parametric 1D tract editing

One or two physically meaningful axes (e.g. tract length, sectional area) with explicit units and bounds → immutable recipe → deterministic prep → supported acoustics; display a plot and before/after difference. Distinguish unsupported gesture realizations.

### C — Linked visual and anatomy editing

3D appearance/rest geometry registration, sagittal/transparent views, jaw/tongue/larynx, tissue fields, actuator/reachability capabilities. Render anatomy from Core-admitted geometry; visual-only freedom preserved. XPBD/FEM may be used for limited validation, not mandated upfront.

### D — Generalized creature graph / topology

Add/remove cavity branches, sacs or source organs only when a particular backend supports corresponding physics. Preserve universal domain expressiveness and explicit UNSUPPORTED outside numerical coverage.

## 7. Scientific checks, not aesthetic assumptions

- **Controlled intervention**: change exactly one parameter and hold Gesture, source, backend, seed, receiver fixed wherever applicable.
- **Ideal quarter-wave sanity check** (not a full human vowel model): ideal uniform tract gives f1≈c/(4L), hence length ×1.10 predicts resonances ×(1/1.10)≈0.909 in that idealization. Wolfram symbolic differentiation confirms df/dL=−c/(4L²). Actual formants depend on variable area, losses, branching, radiation, and source/tract coupling; this alone does not predict F0.
- **Physical vs solver failures**: reachability outside anatomical constraints can produce INFEASIBLE; unimplemented branched cavity remains UNSUPPORTED. Never degrade both into success or job failure.
- **Qualitative perception**: “かわいい”, “女声寄り”, “動物らしい” are secondary perceptual evaluations; not scientific identity labels determined by one slider.

Scientific references:
- [VocalTractLab](https://www.vocaltractlab.de/) — reference articulatory/area-function and tract synthesis methods.
- [Wolfram Acoustics in Frequency Domain](https://reference.wolfram.com/language/PDEModels/tutorial/Acoustics/AcousticsFrequencyDomain) — boundary conditions and frequency-domain modeling.
- [Wolfram Hyperelasticity](https://reference.wolfram.com/language/PDEModels/tutorial/StructuralMechanics/Hyperelasticity.html) — material models for later 3D tissues.
- [Core architecture and capability outcomes](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/architecture.md)
- [Core model assumptions](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/model-assumptions.md)
- [E1 causal measurement issue #40](https://github.com/ryonakayama234/morphoacoustics/issues/40)
- [V3 calibrated Gestures issue #33](https://github.com/ryonakayama234/morphoacoustics/issues/33)

## 8. Research questions / unsettled decisions (not silently resolved)

- Which slider axes correspond to identifiable morphology interventions rather than stylistic post-processing?
- What constraints make a creator-generated geometry anatomically, numerically, and semantically valid?
- Which depiction changes are purely visual, which should alter solver geometry, and how is mapping explicit?
- How should personality/habitual gesture defaults combine with segment-level Direction precedence?
- How will a body recipe be versioned, hashed, compared, and migrated as the Core schema evolves?
- Which body edits can be previewed using validated fast backend, which require slower FEM/FSI, and how is uncertainty exposed?
- How should creators inspect creative exploration versus scientifically controlled one-variable interventions?

## 9. Explicit non-goals of RFC v0

No immediate change to Performance Contract v0 or live adapter. No claim that arbitrary human speech or general fantasy morphologies are solvable. No full-body 3D FEM or FSI requirement. No source-free voice identity embedding that overrides morphology. No requirement that all cosmetic edits affect voice. No silent commitment to schema names, number of sliders, or implementation stack.

## 10. Review / implementation handoff

Parent [Studio #12](https://github.com/ryonakayama234/morphoacoustics-studio/issues/12) is the roadmap. Next narrow issues are: (1) Core upstream contract revision for selected body + provenance, (2) Studio validated preset choice and immutable two-body Take comparison. Later B–D each require independent scientific and product gates.

For each child issue: state **goal, existing evidence, invariants, dependencies, measurable acceptance criteria**; leave local implementation techniques to the implementer. Separate peer review of contract correctness from acoustic causal claims.
