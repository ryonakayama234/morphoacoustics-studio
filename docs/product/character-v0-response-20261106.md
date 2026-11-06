# CHR-R-20261106-01 — Character v0 製品仕様案／Museへの回答

**STATUS: DESIGN PROPOSAL / NOT ADOPTED / NOT IMPLEMENTED / NO QUALITY GO / NO UI OR CORE CHANGE / NO SMC/ASMR IMPORT / NO MERGE.**

回答者: ChatGPT（2026-11-06 JST）。回答先: Museの質問票 **CHR-Q-20261106-01**、Studio Draft [PR #36](https://github.com/ryonakayama234/morphoacoustics-studio/pull/36)、ファイル **docs/product/character-v0-questions-20261106.md**。追跡 [Studio Issue #35](https://github.com/ryonakayama234/morphoacoustics-studio/issues/35)。本書は **一文書の docs-only 案**。Museの審査とOwnerによる採用決定を待ち、今回いかなる実装・UI編集・import・Core変更・マージも許可しない。

## 0. 製品上の直接回答と証拠の強さ

**Character v0 = 持続的な創作上のキャラクターに、正確な物理身体、検証された少数の運動、規定音源を結び、生成された物理観測を改変不能なTakeとして保存・A/B比較できる最小制作ループ。** 現時点でこれは **製品定義の候補**であり、自然な日本語会話・美しい声・ASMR・自在な身体編集が完成したという意味ではない。

**Muse PP1〜PP5への判定:** PP2/PP3/PP4/PP5 = **AGREE（後述の能力範囲に限定）**。PP1 = **REVISE**。Characterの持続的同一性は安定したcharacter_idに置く。body/motion/sourceの組は **その版・Takeの物理的実行条件**であり、変えるたび別人にしない。CoreのBodyRevisionの権威はCoreにのみ置く。

Studio [Issue #32](https://github.com/ryonakayama234/morphoacoustics-studio/issues/32) のWG2創作者試聴 **NO-GO** は維持する。v0は **制作導線・因果同一性のマイルストーン**であって **音声品質改善の達成宣言ではない**。「計測に基づく科学ゲート」と「最後の創作者による採用バイナリ」は別。過去Take UUID２件の対応するraw WAV/源/身体はGitHub上では未照合であり、どちらがM0/M1かはUNKNOWN。

### 0.1 根拠台帳：採用済みと候補を混ぜない

| ID | 正確な場所・既存決定 | 証明される範囲と限界 |
| --- | --- | --- |
| E1 | Studio **docs/product/STUDIO_WORKSPACE_V2_DECISION.md**、merged PR #34 | 3モード置換・閉じた7スロット・STOP-AND-PROPOSE。Draft #33のワークスペースUI実装は未採用 |
| E2 | Studio [Issue #32](https://github.com/ryonakayama234/morphoacoustics-studio/issues/32)、Draft PR #31 | WG2品質不採用。CI合格・WAV生成は自然音声の証拠でない |
| E3 | Core **docs/performance-contract-v0.md**、**contracts/performance/v0/**、**contracts/performance/v1/**、Studio **docs/cc-a2-two-body-studio.md** | creative CharacterSpec/Script/Directionのsnapshot、PerformanceRequest/Result、v1 exact embodiment選択。契約存在だけで自由文TTSは成立しない |
| E4 | Core **docs/research/cc-a2-two-body-live.md**、Studio **docs/cc-a2-two-body-studio.md**、merged Core PR #122 / Studio PR #19 | M0=v3b-axial-M0@1（16×0.010m）、M1=v3b-axial-M1@1（16×0.011m）の限定比較、固定の「あい」相当三task、LF100、0.5s/48k mono、Studio限定Take |
| E5 | Core **docs/research/od2-reusable-physical-body-20261102/{DECISION,DATA,RESULTS,A3_FREEZE_20261102}.md**、merged Core PR #273 | family **tract1d.local-log-area-5.v1**、M0基点centers {4,8} × ratios {0.90,1.00,1.10}、4つのnonnull revision、r=1.00はM0 alias。限定Core研究でありStudio V2 editorではない |
| E6 | Core **docs/research/od3-reusable-body-performance-20261102/{DECISION,DATA,RESULTS}.md**、merged Core PR #277 | OPEN/CONSTRICT/CONSTRICTの固定三taskを使うG0/G1、G1はT1 onset/offsetのみ+0.020s。身体B0=(c4,1.00)、B1=(c4,1.10)、B2=(c8,0.90)の限定研究。Studio統合・自然共調は未証明 |
| E7 | Studio **docs/research/cc-b1-private-atelier/INDEX.md**、merged Studio PR #27、依存Core **Draft PR #166 UNMERGED** | Studio mainのopt-in private site08単一セルratio0.90/1.10は存在するが、Core mainのOD-2五セルrecipeとは別。public capabilityではない |
| E8 | Core **docs/research/oma-0-organ-design-contract-response-20261105.md**（D0）、**docs/research/oma-1-vocabulary-response-20261106.md**（Ownerが凍結したD1 oma-vocab/v0、Issue #288）、[Issue #291](https://github.com/ryonakayama234/morphoacoustics/issues/291) | G0: Core main **01b2a33732c1256764eb91358583e16a1fcee865**、Python 3.12.3/NumPy 2.4.6、**801 passed / 12 skipped**。同一性・既存oraclesのPASSであり音質評価ではない。実行可能ポートはacoustic.p_uのみ、予約6はUNMODELED |
| E9 | Core **docs/invariants.md** I4、**docs/research/neural-causal-boundary.md**、**docs/research/voice_source_prosody_gate.md** | neuralは提案・推定・物理未解像部分、出力後の任意美化で物理的結果を覆さない。LF source制御の研究候補を現行UI可用機能とみなさない |
| E10 | Core **docs/research/og3-gate-c-limited-adoption.md**、**docs/research/og4-gate-c-review.md**、merged PR #104/#108 | ideal.series.p_u / ideal.branch3.p_u は各固定の受動fixtureで限定採用。任意OrganGraph、能動声源、鼻腔、receiverを実装した証拠ではない |
| E11 | Core Draft [#283](https://github.com/ryonakayama234/morphoacoustics/pull/283)、[#280](https://github.com/ryonakayama234/morphoacoustics/pull/280)、[#261](https://github.com/ryonakayama234/morphoacoustics/pull/261) | 近接場・receiverの研究系譜。**DRAFT / NOT ADOPTED**。v0実行機能にしない |

D0/D1文書の作成時に付された「NOT ADOPTED」ヘッダーは当時の提案状態であり、後続のOwner決定・merge・G0によって **紙のD0/D1語彙は凍結**した。ただし、紙の採用は新しい機械可読schema/Studio UI/物理law/聴感品質の採用ではない。

## 1. QC1 — Characterの同一性・保存

**推薦:** creative Character、exact Core Body、Performance、Source、Takeを分離する。Studioは物理geometryをコピーせず、Coreが発行した識別子・receiptだけを参照する。

| 提案フィールド（NOT A RELEASED SCHEMA） | 型 | Owner / 意味 |
| --- | --- | --- |
| schema_version | literal: character-product/v0-proposal | Studio製品案の版。既存performance-contract/v0/v1を改訂しない |
| character_id | persistent opaque ID | Studio creative identity。名前/体/演技を変更しても同じ人物 |
| character_revision | positive version | Creative draftの版。BodyRevisionではない |
| character_spec_ref | immutable snapshot ref | 既存CharacterSpec name/description/defaults。直接物理圧力等は含めない |
| active_body_ref | tagged exact Core BodyPresetRef OR BodyRevisionRef | original preset/revision ID、Core producer commit、preparation_digest、receipt_refへの参照だけ |
| active_motion_ref | fixed performance/schedule ID+digest | 採用済み限定taskのID、clock/coordination version |
| source_profile_ref | immutable source ID+hash | 規定LF100 profile。神経声色の任意スタイルIDではない |
| take_refs | TakeID[] references | immutable historyへの索引であり、各Take自体を変更しない |
| capability_receipt_ref, state | ref, enum | 証拠範囲とblocked/draft/eligibleなど。Core能力をStudioが創作しない |

**同一性:** character_id一致なら同じ創作上の人物。改造後のbody_refが違えば別のBodyRevisionを持つ **同一人物の別版**。異なるCharacterが同じbody_refを共有しても別人。過去Takeには実行時のCharacter revision＋body＋motion＋sourceを凍結し、最新bodyへ再解決しない。OD-2 ratio 1.00 はM0親のaliasであり新規BodyRevisionを鋳造しない [E5,E8]。

**既存契約との整合:** PerformanceRequestはcreative CharacterSpec/Script/Directionを **snapshotとして内包する** [E3]。これはbodyの数値geometryをStudioへ複製することとは異なり許可する。新しい最上位Characterレコードは現時点では紙のproposalのみ。

**棄却:** PP1の組（body+motion+source）そのものを人物主キーにする（改造で別人になる）、Studio独自BodyRevision/準備digest発行、Takeの音からCharacterを定義する（観測と原因が逆転）。

**反証/STOP:** 同一キャラクターの身体変更で過去Takeの参照が変わる、r=1.00で新Revision発行、missing Core receiptがあるのにverified Take扱い。**NOT ADOPTED / NOT IMPLEMENTED**。

## 2. QC2 — 身体軸とStudio上の一つの入口

**推薦:** 身体の入口は **Character canvas＋selection.inspector の一系統**とする。しかし **M0/M1 presets、OD-2の五セルrecipe、旧CC-B1単一セルrecipeは異なる物理同一性**。UIで統一しても同一の内部bodyを偽装しない。

**v0 最低目標:** M0/M1 exact presetsを選ぶ [E4]。**v0 限定編集候補:** M0基点のOD-2 family center=4/8・ratio=0.90/1.00/1.10（r1.00はalias、4つの改造body）[E5]。後者はCore mainの限定researchに存在するが、Studio V2の製品操作としては **NOT IMPLEMENTED / separate G4 integration gate required**。M1へのOD-2 editを勝手に許可しない。

旧CC-B1はopt-in private researchとして維持。site08 single-cell ratioの変更とOD-2 center8 five-cell log-area profileは同一ではない。旧Core Draft #166をmainで実行可能なAPIとして偽装せず、既存Take/IDsをmigrationしない [E7]。

**能力表示:** D1 scopeを (vocabulary ID, status, named backend, fixed fixture/body range, legal task, source, boundary/observer, evidence, missing effect) という **関係**で表す。EXECUTABLE_LIMITEDやMODELED_LIMITEDの「語」が存在するだけでは、任意body/法則が動くわけではない。実効モデルのrigid-wallは理想的な剛壁であって生体組織の硬さではない。UNMODELEDは非操作のdesign intent/研究注記だけで可視化し、成功する操作として見せない [E8]。

**スロット:** project.libraryでBody参照を選択し、character.canvasは「1本の1D声道＋16数値区間」という正直な模式的表現のみ、selection.inspectorで **採用済みCore限定recipeの離散値**と真のstatus/receiptを確認。現在の閉じたADRに対するこの新操作の実装は別のOwner UI許可を要する [E1]。

**v0で表示・編集しない:** 16の独立した器官ノード、任意OrganGraphのドラッグ配線、形状3D/筋/soft tissue/tissue stiffness/鼻腔/接触/声帯、無制限の断面積sliders、M1のOD-2 familyへの無根拠流用、実在人体や音響品質の保証。

**棄却:** OD-2を既存CC-B1と同じschema/digestとして正規化、任意のphysical sliders、一般organ graphとして見せかける案。**反証/STOP:** Coreから存在しないrevisionが提示される、別familyのIDが衝突する、UNMODELED編集が音を変える/成功扱いになる。**OD-2 Studio editor NOT ADOPTED / NOT IMPLEMENTED**。

## 3. QC3 — 運動/Script軸

**推薦:** v0は自由テキスト発声でなく **凍結したtask-level performance選択**。現在Studioに限定導入済みのCC-A2は単一固定「あい」相当の三task、LF F0=100Hz、0.5s [E4]。Core OD-3のG0/G1は **研究実行が採用済み**だがStudio Motionの通常操作では未統合。G0/G1を製品に昇格するなら、対象を **B0=(c4,r1.00), B1=(c4,r1.10), B2=(c8,r0.90)** に限定する。G1はtask T1のonset/offsetを+20msずらすだけ。別のtiming/strengthの任意値、自然なcoarticulation、M1適用は未検証 [E6]。

**画面所有:** motion.canvasがcreative Script/Directionと「実際に実行できる固定performance ID」を明確に区別して表示する。selection.inspectorはtiming/strengthを読取り専用の物理条件として示す。書いた任意の文字が話されると思わせない。Direction.energy/pace/emotionはcreative intentであり、F0・圧力・筋力に直接写像しない [E3]。

**SMC seam（将来のみ）:** Script＋PronunciationPlan＋ProsodyPlan → task primitives → inter-gesture coordination/overlap → versioned Performance-contract-compatible request／validated GestureScore とコンパイル由来のtraceを出す。最低境界は segment ID・exact creative snapshot・compiler commit/version・time anchors・supported task semantics・body capability check・拒否コードの保持。自由な仮名/母音grammarについてさえ、採用済みの生成evidenceなしにv0機能と呼ばない。SMC draftは **UNMERGED / NOT ADOPTED / NOT IMPORTED**。

**技術仮説:** 共調は完成したWAVの連結/後段crossfadeではなく、異なるGestureの時間的重複と継続物理stateに帰する。OD-3のschedule-only比較は小さな反証用研究系であって連続日本語の自然さの証明ではない [Core **docs/research/shared-timeline-candidate-v1.md** はcandidate; 参考 https://pmc.ncbi.nlm.nih.gov/articles/PMC6743785/]。

**棄却:** 一文字・一モーラのWAV concat、勝手な自由文TTS宣伝、energy=0.8を直接「F0/ゲイン/呼気圧」に変える案。**反証/STOP:** 未対応gesture/文字に偽の完成音声が付く、身体間で不可能なtaskをneuralやfadeが成功にする、OD-3対象外でG1が実行できると表示。**SMC seam only / NOT IMPLEMENTED**。

## 4. QC4 — 音源v0とneural seam

**推薦:** v0の可変source controlは **ゼロ**。**prescribed LF-family glottal flow、固定F0=100 Hz**という既存条件のSourceProfile ID/source SHAをread-onlyで参照する [E4,E5,E6]。これは **自励する声帯/呼吸器の物理制御ではなく規定された駆動信号**である。F0(t)、Rd/return phase、voicing、breathy/pressed、effort、aspiration、音源振幅、声量は研究候補であり、未検証のUI knobにしない。preview playback gainは声帯の発声努力と別物。

**future neural source seam (NOT IMPLEMENTED):** 入力: exact Body/PreparedMorphology ref、採用されたtask・laryngeal/respiratory intent、時間条件とseed、明示されたsource-control domain、もし双方向結合が採用されたときのみ同定されたacoustic load state。出力: **glottal volume flow U_g(t) [m³/s]** の時計/単位/境界/seed/モデルSHAs付き系列（または別途合意した等価物理port量）。**その流れをCoreの物理声道・音響計算の上流に供給**する。mean airflow law/FSIやsource–filter相互作用を、現行唯一のacoustic.p_uポートから自動で推定しない [E8,E9]。最初は **one-way prescribed source** と正直に呼び、self-oscillating source claimsは独立gateを必要とする。

**neuralでも守る禁止境界:** radiated WAVの後処理で発音/声色を作り直す、unmodeled受信器を生成する、BodyRevisionを改変する、source-onlyと称してtextから独立した完成音声を生成してfilterを形骸化させる、UNSUPPORTEDやINFEASIBLEを補完する。source上流であることは **必要条件であって十分条件ではない**。

**将来の科学ゲート:** flow単位/非負・連続性等のモデル適用範囲/clock/seed検証、定義された負荷と安定性、同一body・task・observerのLF対照、sourceだけを変える介入、bodyだけを変える介入、残差/learned sourceが物理因果を迂回しない負対照、domain外拒否と provenance。音声自然さは別の採否。外部研究はsourceを優先して調べる根拠に留まる [Birkholz & Drechsel 2021 https://doi.org/10.1016/j.specom.2021.06.002; LF model https://doi.org/10.1121/10.0005879]。**数値閾値は将来の実験で事前登録**し、今ここで作らない。

**棄却:** 現在のF0/Rd/effort sliders、単純WAV gainを大声と称する、postneural voice-color filter。**反証/STOP:** neural ONでbody差や実行不能が消える、learned source単独で望みのtextを完全な音として生成する、source units/shaが検証不能。**NEURAL SEAM ONLY / NOT ADOPTED / NOT IMPLEMENTED**。

## 5. QC5 — Take、A/Bと品質言語

**推薦:** Takeは **1回の凍結requestと検証済み物理observation** の参照を所有し、不変。status/capability refusalはaudioと分離する。

| Take v0候補フィールド | 型 | 不変な意味 |
| --- | --- | --- |
| take_id; character_id; character_revision | opaque IDs / revision | 人物と発声時のcreative revision |
| request_snapshot_ref; request_digest; digest_algorithm | immutable ref / digest / string | PerformanceRequest v0/v1 creative snapshot、seed、effective controls |
| exact_body_ref; body_receipt_ref; preparation_digest | tagged Core refs/digests | M0/M1/OD-2/legacyの由来、親とalias、backend identity |
| motion_ref; task_plan_sha; schedule_ref | exact refs/hash | CC-A2 fixedかOD-3 G0/G1か。非実行scriptと混ぜない |
| source_profile_ref; source_sha; source_units_clock | exact ref/digest/metadata | 凍結LF100のflow、rate、seedを含む |
| solver_ref; core_SHA; studio_SHA; adapter/dependency pins | immutable exact versions | Core source/NumPy/solver and trusted adapterの再現性 |
| observation_ref; measurement_plane; boundary/load_ref | refs/enumerated descriptors | 0.20m pressure proxy ≠ calibrated listener-ear SPL、負荷の固定 |
| raw_Pa_NPY/trace refs; raw hashes; render_digest; verify_manifest | content-addressed immutable references | raw Pa/geometry/physical observationが物理的証拠、WAVは派生 |
| preview_WAV_ref; playback_gain_policy; pair_group_id | refs/immutable metadata | A/Bでshared gainを使用。ゲインはsource effortではない |
| job_status; realization_outcome; diagnostic_stage; legacy_code | separate enums/strings | SUCCEEDED/FAILED と FEASIBLE/INVALID/UNSUPPORTED/INFEASIBLEを混同しない。数値NUMERICALLY_UNRESOLVEDを生物的不能にしない |
| created_at; integrity_state | timestamp/verified or unknown | readback/restartで検証し、missing/tamperedはfail-closed |

**A/B単位:** take.transportではimmutable TakeIDを2つ選ぶ。body比較ならsource/task/clock/load/observation plane/gain policyを固定。motion比較なら同じbody/source、source比較なら同じbody/motion。A/A nullは独立の陰性対照。境界条件や観測点の違いを「身体を変えた効果」と主張しない。旧Takeは再解決して上書きしない。Core raw float64 Paと、同一ペア共有gainで変換されたPCM/WAVを区別 [E3-E7]。

**UIで主張できる上限:** 「限定1D物理音声のスケッチ」「物理モデルの指定条件を試聴」「音質は未採用」。禁止: 「自然な日本語」「実在声優の声」「声質改善済み」「耳元のASMR」「校正済み音圧／距離感」。

**WG2との差:** OD-2/OD-3は固定source下で **Core-authoritative BodyRevision × timing schedule** を反復・分離できる（新しい実験可能性）。これは音質改善でも既存WG2への優越性でもない。**実際の声の欠陥は未解決**。Issue #32の2 Take UUIDがローカル実データに結びつくまでは原因や対応身体をUNKNOWNとする。

**将来gate案（このPRでは未実行）:** ①同一body/source/task/load/observer基準でWG2 baselineを適切に照合（無い場合は比較不能を記録）、②r=1.00 alias＋A/A＋controlled OD-2/OD-3介入、③raw source/pressure/geometryとWAVの変換・スペクトル・alias・gain・測定位置の独立監査、④事前登録した物理量と条件に対する判定、⑤**最後に**Ownerが採用可否を二値決定。聴感で繰り返しパラメータ探索することを計測gateと称さない。

**棄却:** WAVが大きい、SHAが違う、801 tests PASSをそのまま「魅力的な声」へ置換、旧不明Takeの身体推測、loss of provenance時に成功WAVを偽装。**反証/STOP:** A/B gain変更で擬似的改善、過去Takeの実体書換え、測定と聴感採用の混同。**QUALITY GO: NOT ADOPTED**。

## 6. QC6 — Scene/ASMR v0

**推薦:** Sceneは凍結ADR内の **非実行 scaffold**。v0のphysical request/Takeでは **scene_ref=null**。Speaker/Listenerの位置や距離を格納する将来のeditorial draftは設計可能でも、数字を置くだけで近接効果が発生したように表示しない。実行が要求されたら **UNSUPPORTED**。現在の0.20m monopole pressure **proxy** は実耳のnear-field receiverではない [E5,E6,E8]。

**将来の依存関係:** ①発音体の出口境界・観測reference plane、実証可能な放射load/fieldに対応する **acoustic.radiation_interface** を先に科学ゲート、②受信側のgeometry/位置/方位/耳・マイク観測を扱う **receiver.observation**（read-only、bodyの電力portではない）、③breath/turbulenceには **airflow.pressure_flow** とeffect.turbulence_noise、④湿潤接触・吸引には **tissue.contact** と必要な物性/流れ、⑤別ゲートでScene UXとperceptual adoption。③④は②に先立ち独立研究できるが、ASMRの耳元再現を名乗るには対応する因果経路全体が必要。各予約の昇格は **実operator・SI/エネルギー/独立oracle・制限範囲・Muse審査・Owner決定・新D1版** が必要。未マージnear-field draftsはNOT ADOPTED [E8,E11]。

**棄却:** 受信器の無い距離エフェクト/HRIR/reverb、偽のwet contact audio、別ASMRパネル、adult voiceジャンルを物理ゲートと混同すること。**反証/STOP:** unmodeled receiverがTake音に反映される、Sceneを無視して「物理的に成功」と記す、draft resultsを製品実装と呼ぶ。**SCENE PHYSICS / ASMR: OUT of v0, NOT IMPLEMENTED**。

## 7. End-to-end user flow — frozen ADR slots mapping

    global.header: project identity + [Character | Motion | Scene] (中央モード置換)
          |
    project.library: Character IDs / Core body refs / scripts / immutable Take refs
          |
    character.canvas: Character選択 → exact M0/M1 or gated OD-2 BodyRevision
    selection.inspector: 許可された離散recipe、能力/receiptだけ (UNMODELED disabled)
          |
    motion.canvas: Script/Direction draft + 実行可能な固定performance ID選択
    selection.inspector: fixed source/schedule、task scope (任意textの成功は約束しない)
          |
    PerformanceRequest v1: creative snapshots + exact embodiment selection
          |
    Studio trusted adapter: source/body/solver/gesture能力を検証
          |---- INVALID / UNSUPPORTED / INFEASIBLE → 偽WAVなし
          v
    Core: PreparedMorphology + bounded motor realization + prescribed LF100
          |
    Core acoustics: raw pressure/physical trace/observer + receipts
          |
    Studio verification/archive: exact SHA/manifest/raw artifacts → immutable Take
          |
    take.transport (bottom fixed): replay / controlled A-B / export
    research.drawer (default hidden): raw Pa/trace/source SHA/digests/diagnostics
    scene.canvas (third replacing mode): v0はscaffoldのみ、物理接続なし

**注意:** これは設計すべき将来導線。全スロットは既存ADRのもの。Studio mainにこの統一画面/各物理連携が実装済みという主張ではない。新UIの作業は別途Creator/Owner STOP-AND-PROPOSE許可を要する [E1]。

## 8. Capability matrix — Body × Motion × Source

**用語:** **V0-TARGET** = v0候補としてCore限定evidenceあり、ただし統一Studio V2導線はNOT IMPLEMENTED/別ゲート待ち。**STUDIO-LIMITED** = 現在の限定Studio main系譜。**SEAM** = 設計接続点のみ、NOT IMPLEMENTED。**OUT** = 未許可。**PRIVATE** = 既存private opt-inで製品昇格は未承認。**全行の音源はfixed prescribed LF100に限る。**

| 身体 × 運動 | CC-A2固定「あい」三task | OD-3 G0/G1固定schedule | 自由text→SMC/自由gesture |
| --- | --- | --- | --- |
| M0 exact preset | **STUDIO-LIMITED / V0-TARGET** [E4] | **V0-TARGET; Studio seam** B0=(c4,r1.00)のみ [E6] | **SEAM; NOT IMPLEMENTED** [E3] |
| M1 exact preset | **STUDIO-LIMITED / V0-TARGET** [E4] | **OUT**：OD-3対象外 [E6] | **SEAM; execution OUT** |
| OD-2 M0-derived c4/c8×r0.90/1.10 | **V0-TARGET pending Studio gate**：継承固定三taskの物理researchでありCC-A2と同一public ABIではない [E5] | **V0-TARGET pending gate**は c4/r1.10 と c8/r0.90のみ。残る2身体はOUT [E6] | **SEAM only** |
| CC-B1 site08 single-cell 0.90/1.10 | **PRIVATE opt-in**（Core Draft #166 exact pin。OD-2と非同一）[E7] | **OUT** | **OUT** |
| OG-3/OG-4 passive graph / general soft-tissue organ | **OUT** [E8,E10] | **OUT** | **OUT** |

**Source（第3軸）:** fixed LF100だけが上のSTUDIO-LIMITED/V0-TARGETセルに対応する。**Neural glottal source** の場合、上の **全セルはSEAM ONLY / NOT IMPLEMENTED**（能力が自動昇格するわけではない）。**Editable F0/Rd/effort/aspiration, whisper, post-processed voice** は全セル **OUT**。receiver/ASMR sourceも全セルOUT。これによりbody×motion×sourceの全組合せにstatusを割り当てる [E8,E9]。

Capabilityは「語がある」という真偽値でなく、**exact body × named backend/fixture × task × source × load × observation × admissible range × evidence**。D1 paper reasonとlegacy実コードの綴りは別フィールド（例: TASK_BACKEND_UNSUPPORTEDとTASK_UNSUPPORTED）で保持する [E8]。

## 9. v1 blockers — 順序・決定権（すべて実装未承認）

| 順 | Blocker | Evidence-based exit gate | 責任と最終決定 |
| --- | --- | --- | --- |
| B0 P0 | WG2音声品質NO-GO継続。2 UUID→実source/raw/audio/bodyの照合、比較不能時の明記 | 同一刺激/身体/負荷/観測で対照可能なbaseline、事前登録した数値指標と独立聴感採否 | Core音響+Studio receipt / Muse審査 → **Owner** |
| B1 | Exact Body/Take bridgeを一元化。OD-2と旧CC-B1を分離し過去Takeを保存 | Core authoritative body/alias/receipt、re-read/restart/integrity fail-closed、Studio ADRの新UI許可 | Core assembly + Studio adapter / Muse → **Owner** |
| B2 | OD-3 G0/G1をStudioへ昇格するか別gate | exact B0/B1/B2×G0/G1の再現、schedule-only負対照、対象外拒否、TakeのA/B | Core motor + Studio Motion / Muse → **Owner** |
| B3 | **SMC import** の科学・versioned adapter・契約適合 | 限定grammar、gesture overlap/state continuity、Task能力check、凍結sourceとのcross-product、未対応text拒否、traces | SMC+Core motor+Studio / Muse → **Owner** |
| B4 | **Source gate**：fixed LF → 仮説駆動のsource controls → neural source seam | flow単位/clock/load/物理介入の可観測性、source/tract分離、ネガティブテストとOOD拒否。自励/FSIは別gate | Core source/acoustics+ML / Muse → **Owner** |
| B5 | **acoustic.radiation_interface** 昇格 | outletの音響基準面・境界/field operator・独立oracle・uncertainty・D1改訂 | Core acoustics / Muse → **Owner** |
| B6 | **receiver.observation** 昇格（B5の下流） | near-field姿勢/距離/方位/耳観測・校正限界・read-only operator・D1改訂 | Core acoustics+Scene / Muse → **Owner** |
| B7 | 非発声ASMRのaerodynamics/contact＋Scene | airflow.pressure_flow/turbulence、tissue.contact等を**個別**に実証し、受信者モデルとのchainを監査。Scene UIは別承認 | Core aero/contact+ASMR+Studio / Muse → **Owner** |

依存DAG: B0 とB1は別々に調べられるが、製品品質GOはB0を要する。B2→B3、B0→B4、B5→B6、B6＋必要なB7物理枝→near-field ASMR claim。B4とB5の研究順序は絶対固定せず、各gateで合理的に分離する。Frozen D0/D1との矛盾は **DEVIATION CANDIDATE** として別提案し、こっそり変更しない。

## 10. より精緻なロジック仮説と反証

**H1: body identity ≠ creative identity ≠ speaker identity.** CharacterIdが同じでもbody/material/habitが異なり得る。同じM0・同じLF・同じ凍結taskの別人物は物理波形が同じでも矛盾ではない。声の個体差を出したいなら将来MotorPersona/発声習慣を介入・再現検証する。Core **docs/research/motor-skill-persona-hypotheses-v0.md** は **PROPOSED/UNVALIDATED** であり、今の製品の声色能力に数えない。

**H2: source-limited perceptual ceiling.** 1D tractの数値精度を増やすだけでブザー様音は解消するとは限らない。Birkholz & Drechsel (2021) は複数の声道音響要因を追加しても自然性が改善せず、source設定が重要だったと報告する。ただし当CoreのWG2に対する診断とは **別** [https://doi.org/10.1016/j.specom.2021.06.002]。同一body/gesture/observerでsourceだけ変える試験を将来事前登録する。

**H3: causal intervention before acoustic aesthetic.** Bodyのみ、scheduleのみ、sourceのみを変え、r1.00 null/A-A、raw physical pressure、frequency transfer、source hash、observer planeの帰属を別々に監査。測定差は**個性的・かわいい・人声らしい**ことを意味しない。例外があればモデルの説明力を反証し仕様scopeを縮める。

**H4: neural source-only is not a magical exemption.** learned flowがbodyを無視して完成声に近い時間系列を直接描けば、上流にあっても物理因果の実質的迂回となる。正しい検証はニューラルON/OFF、body/gesture fixed source intervention、source fixed body intervention、UNSUPPORTED preservation、残差単独の言語情報 leakage、domain外拒否。この品質・因果測定なしに製品へ採用しない。

**技術選定:** 最小v0では既存のfidelity0.tract1d / exact Core CLI / limited performance-contract v1 と trusted Studio adapterを再利用する選択を提案。general FEM/FSI、汎用OrganGraph、フルtext-to-speech、audio beautifier、別のBodyRevision authorityを先に作らない。VocalTractLabは3D→area function→音響の参考文献であり当Coreが同一精度を達成したというoracleではない [https://www.vocaltractlab.de/index.php?page=background]。

## 11. Museへの逆質問票（3件／4件以内）

**RQ-CHR-1 — PP1 identity:** stable character_idを人物同一性とし、body/motion/source refsをactive revisionおよび各Takeにexact snapshotする **REVISE PP1** にAGREEか。REVISEなら「同じ人物の身体改造」と旧Take不変性が両立する具体的主キーを提示してほしい。

**RQ-CHR-2 — limited release envelope:** M0/M1+CC-A2 fixedをv0下限とし、OD-2四bodyとOD-3のB0/B1/B2×G0/G1は **それぞれ別Studio integration/Owner gateを通るまで製品操作ではない**、旧CC-B1はprivate researchとして分離する境界にAGREEか。REVISEなら「v0製品に含める正確なbody/schedule/Studio status」を列挙してほしい。

**RQ-CHR-3 — neural one-way vs coupled:** learned U_g(t)を当面 **one-way prescribed physical excitation** とだけ主張し、自励・source-filter coupling/呼気物理の主張には別のairflow/port-law実装・gateを必要とする方針にAGREEか。REVISEなら必要な観測量・負対照・昇格条件を示してほしい。

## 12. Muse審査とOwner決定

Museには **QC1〜QC6ごとに AGREE / REVISE / DISAGREE** を求める。REVISEは節・根拠・置換文・適用できるbody/gesture/source/observer envelopeを明示してほしい。PP1の再定義とPP2〜PP5の限定同意、RQ-CHR-1〜3も判定する。その後Ownerが **本紙の採用・再修正・却下を明示**してはじめてCharacter v0製品定義となる。今回のPRや審査コメントだけではquality STOP解除・実装着手・mergeはできない。

**FINAL STATUS: ANSWER SUBMITTED / DESIGN ONLY / NOT ADOPTED / NOT IMPLEMENTED / NO QUALITY GO / NO STUDIO UI CHANGE / NO SMC OR ASMR IMPORT / NO CORE CHANGE / NO MERGE.**
