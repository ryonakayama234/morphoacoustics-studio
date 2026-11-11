# BODYMAP-R-20261111-01 — 身体モジュール地図：QM1–QM5 設計回答

**回答日:** 2026-11-11 JST  
**回答者:** Research Lead（ChatGPT）／ **審査:** 監督者 Muse ／ **決定:** Owner  
**質問票:** [BODYMAP-20261111-01](body-module-map-questions-20261111.md)（[Studio Draft PR #57](https://github.com/ryonakayama234/morphoacoustics-studio/pull/57)、[追跡 Issue #56](https://github.com/ryonakayama234/morphoacoustics-studio/issues/56)）  
**状態:** **設計処方／未採用／未実装。** 本文は Owner の 2026-11-11 方向づけを前提とする回答であり、Core・Studio・SMC・ASMR・EL の実装、機械可読スキーマの発行、関門変更、GO、マージ、製品での有効化を許可しない。B1 P2（Studio Issue #54）は独立のまま。

## 0. 結論・根拠の格付け・設計不変条件

**提案の主軸:** 製品の編集対象を「声のパラメータ」ではなく**身体の有向・型付き構成（Body Assembly）**にする。身体が保存するのは構造・物性・可動域・接続可能性であり、演技／運動、音源駆動、観測条件、聴き手、ニューラル推論は独立させる。**身体だけで音は鳴らない**。同じ身体に異なる運動を実行して異なる音になることと、実行不能な運動は実行不能のまま残ることを製品上の価値にする。

**証拠ラベル:**
- **[F] 確認された限定事実:** 下記の Core/Studio 文書・実装・採用記録に裏づく範囲だけ。数学的・数値的検証を生物学的妥当性、自然音質、一般組合せ可能性へ外挿しない。
- **[H] 設計仮説／推奨:** この回答の分解、将来の契約、構成規則、順序、関門候補。レビュー／Owner 決定までは規範的効力がない。
- **[U] 未検証:** 人間以外の器官パラメータの妥当領域、異種間 motor transfer、一般グラフ・実時間 FSI、知覚上の音質改善や神経補正の有効性。

**最初から守る不変条件 [H]:**
1. `Design intent` は実行可能性を保証しない。`assembly-binding`、`realization`、`evaluation` を区別し、**未モデルの器官／効果を黙って無視した音**は出さない。
2. **Body ≠ Character ≠ MotorPersona ≠ Performance ≠ Take ≠ Receiver**。Body の変更は新しい参照／改訂を作るが、同一 Character ID の変更、過去 Take の再解釈を意味しない。
3. 物理的出力は必ず body × 運動 × source/負荷 × backend × 観測条件から導く。`playback_gain`、F0、努力量、材質、音源の同一視を禁止する。
4. 既存 OMA v0 語彙、Core の BodyRevision／Performance Contract／OG-3・OG-4 物理 ABI は**非破壊**。地図はそれらを指す**設計・製品オーケストレーション層**であって新しい物理ソルバでも第二の正本レジストリでもない。
5. 非人間の身体は許すが、「人間解剖の外にある」ことを「検証された」とは呼ばない。精度、適用領域、同定可能性を状態として露出する。

**主な確認アンカー [F]:** [OMA v0 凍結 Issue #288](https://github.com/ryonakayama234/morphoacoustics/issues/288#issuecomment-6677841120)、[OMA-R-20261106-01](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/oma-1-vocabulary-response-20261106.md)、[Fidelity 0](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/fidelity-0.md)、[OD-2 DECISION](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/research/od2-reusable-physical-body-20261102/DECISION.md)、[B1 計画回答](body-b1-plan-response-20261110.md)、[B1 P1 正式ピン記録](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54#issuecomment-6767339003)。このリストは個別能力の証拠範囲を拡張するものではない。

## QM1 — モジュールの分解

### 処方 [H]

**「器官／実行器官」と「層を横断する役割」を混同しない。** 編集可能な Body Assembly は、器官・接合・境界面・材質・アクチュエータの構成を保持する。Source は媒体駆動と振動発生を分け、Tract は空間的な気柱、Articulator はそれを変形させる運動物体として分ける。Receiver は **Body の外側**の観測／聴き手側オブジェクトである。

以下のポート名は**将来の設計意図の説明**であり、OMA v0 の新しい実行 ABI ではない。`p` は音響圧力 [Pa]、`U` は**体積速度** [m³/s]、`P` は平均流体圧 [Pa]、`Q` は平均体積流量 [m³/s]、`F` は力 [N]、`v` は作用点速度 [m/s]、`u` は制御量、`y` は観測値とする。`p/U` と `P/Q` は小信号と平均流であり同一ポートにしない。

| 層／モジュール候補 | 物理的役割、将来の入出力（設計意図） | 編集する持続パラメータと実行時状態 | 境界・責務 |
| --- | --- | --- | --- |
| **S1 駆動媒体・貯留／気流供給** | 肺・気嚢・ポンプ相当。圧力差／質量保存を介して平均流 `P,Q` を供給し、必要なら源側の音響負荷 `p,U` を持つ | 容積 [m³]、流体密度 [kg/m³]、音速 [m/s]、抵抗 [Pa·s/m³]、コンプライアンス [m³/Pa]；状態：圧力、貯留量、平均流、弁状態 | 人間の肺に固定しない。単なる外部 `lf_fixed` 波形はこの器官の実装ではない |
| **S2 自励／強制音源器官** | 声帯・鳴管・膜・弁・打撃／摩擦源。`P,Q`／`F,v`／制御を受け源変動を発生、音響負荷 `p,U` と相互作用 | 振動体数、質量 [kg]、剛性 [N/m]、損失 [N·s/m]、間隙 [m]、材質、配置；状態：変位、速度、接触、位相、流量 | `F0` は観測特性または制御目標であり Body の唯一の「声の高さ」ではない。複数源も構造で表現 |
| **S3 主音響腔・導波路** | 声道・任意の空洞経路。`acoustic.p_u` による伝搬・反射・共鳴 | topology 上の腔、長さ [m]、断面積 [m²]、形状、流体、壁条件；状態：`p,U` 場、時変断面と境界 | 16区間は Fidelity-0 の**数値離散化**であり独立した16器官ではない |
| **S4 調音・可動組織** | 舌・唇・顎・軟口蓋・任意の変形体が腔境界を変える。`actuation.command`→将来 `F,v`／幾何拘束→S3 | 幾何、付着点、材質、可動域、アクチュエータ配置；状態：位置、速度、ひずみ、接触／狭窄 | 「唇がない」は器官不在であり、ゼロ寸法の唇とみなさない。舌の変形と声道の面積は**原因と結果** |
| **S5 分岐・交通・切替** | 口鼻結合、側腔、複数源への分流、弁。分岐 junction は `p` 共通と向き付き `U` 保存、可動弁は独立の運動・流体則 | 接続グラフ、開口／弁幾何、分岐接続位置；状態：分岐別 `p,U`、弁開度 | 「枝がある」ことと「鼻腔がモデル化された」ことは違う |
| **S6 組織・壁の構成則（横断）** | 壁／発声体／調音体の剛性・損失・流体連成。将来 `F,v` と `p,U` の相互仕事、熱・粘性損失 | 構成則の型、密度、弾性／粘弾性、異方性、粘性；状態：ひずみ、応力、散逸 | 材質は器官の**属性／構成則**であり、「柔らかい器官」という独立の解剖学種ではない。B2 の流体境界層損失も組織弾性と同義ではない |
| **S7 開口・放射境界** | 口・鼻・他の開口と外部音場の結合。`p,U`→外部負荷／放射場 | 開口面積、向き、周囲媒質、放射インピーダンス／指向性モデル；状態：境界 `p,U`、放射場 | 固定抵抗・理想圧力開放は、解剖学的な放射モデルの代用として明記 |
| **E1 空間・Scene（外部）** | 伝搬、距離、壁反射、相対姿勢を扱う。放射場→音場 | 位置 [m]、回転、材質／環境；状態：外部圧力場等 | Body 本体の版とは分離。近接場を遠方場ゲインで偽装しない |
| **E2 Receiver／聴き手（外部）** | 耳介・外耳道・機器・マイク、将来の聴覚変換。音場→`receiver.observation` | 受音位置、校正、耳形状／負荷、参照面、測定プロトコル；状態：受音圧、機械／神経応答（将来） | **観測専用**という役割を守る。耳の負荷を物理連成する場合は別途、校正済み**物理ポート**の証明が必要 |
| **C1 Motor／Gesture／Controller（外部の実行制御）** | `GestureScore`、協調計画、身体固有 controller から S1/S2/S4/S5 へ命令 | 運動習慣 `MotorPersona`、gesture 語彙、時間・位相・優先；状態：目標と実行軌道、適合／不能診断 | モーラ／テキスト／「可愛い」は**器官ではない**。発話の滑らかさは後段 crossfade でなく物理状態の継続と運動協調で検証 |

**物理因果の模式図 [H]**（実装済み配線を表さない）:

```text
Body Assembly: [S1 駆動] -> [S2 音源] -> [S3 主腔] --+--> [S7 放射]
                                      ^                 |
             [S4 調音] --幾何／接触---+     [S5 側枝／弁]
             [S6 構成則] --各器官／壁に結び付く
 C1 Gesture / controller -> S1, S2, S4, S5（身体外の運動）
 E1 Scene -> E2 Receiver -> 観測波形／特徴／知覚
```

**抜け／二重計上対策:** 「気流源」と「声門音源」は機能が異なるため分離する。「声道」と「舌・唇」は重複ではなく**場を持つ腔と境界を動かす器官**。「放射境界」と「聴き手」も異なる。枝 junction の受動法則と側枝器官、音源内部の弁と主腔への接合を分ける。身体の個性に関わる **Material・Actuator 配置・習慣 MotorPersona** を忘れない一方、Material と MotorPersona を器官クラスへ押し込まない。

### OMA v0 との正確な関係 [F → H]

- [F] 凍結語彙の実効的な**器官種は2つ**: `organ.tract.serial1d`（Fidelity-0／CC-A2／OD-2 の**1器官**としての tract）、`organ.passive_tube.uniform1d`（OG-3 固定2本／OG-4 固定3本の**グラフ部品**）。対応する既存能力を超えて実行可能とは言えない。
- [F] 実行可能ポート語彙は `acoustic.p_u` のみ。限定法則 `ideal.series.p_u`（OG-3）と `ideal.branch3.p_u`（OG-4 固定三管一点）は別の採用範囲。`acoustic.p_u` の綴りが同じでも任意グラフ・任意 backend の相互接続は**未保証**。
- [F] v0 の **6つの UNMODELED 予約**は `airflow.pressure_flow`、`mechanical.force_velocity`、`tissue.contact`、`actuation.command`、`acoustic.radiation_interface`、`receiver.observation`。後ろ2つのうち `actuation.command` は制御、`receiver.observation` は読み取りであり、同じ電力ポートではない。
- [F] 壁の有効宣言は `rigid-wall`（`MODELED_LIMITED`）。効果予約7つは `effect.viscothermal_loss`、`effect.wall_compliance`、`effect.wall_damping`、`effect.radiation_impedance`、`effect.turbulence_noise`、`effect.source_tract_coupling`、`effect.tissue_stress_strain`。いずれも v0 では `UNMODELED`。
- [H] 上表の S1–S7 は**製品の編集／意味論的カテゴリ**であり、OMA v0 に器官 ID やポートを足す提案ではない。設計可能な Blueprint → Core 正本での組み立て・準備 → 物理実現 → 観測の対応表を置き、将来 OMA 新版は必要能力だけ個別ゲートで追加する。既存 `CreatureSpec`／`SourceOrganSpec`／`ArticulatorSpec` は意味論的記述であって実行資格の証書ではない。

### 根拠・射程

[F] [OMA-R QD1–QD4](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/oma-1-vocabulary-response-20261106.md) と [Core domain/preparation の分離](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/fidelity-0.md) が限定能力・凍結綴りを定める。[H] Geometry→area function→acoustics の責務分離は [VocalTractLab 公式の背景説明](https://www.vocaltractlab.de/index.php?page=background) と整合するが、非人間器官の検証根拠にはならない。[U] S1/S2/S4/S6 の一般連成は未検証。

## QM2 — パラメータ範囲と人でない身体

### 処方 [H]

**「ヒト基準の最小～最大スライダー」ではなく、4つの独立集合を管理する。**

1. **意味／構造の領域** `D_design`: 非人間の種・材質・複数音源などを無制限に*記述する自由*。ただし正の幾何量、型・単位、接続関係の構文上の矛盾は `INVALID`。未モデル部分は消さずに保持。
2. **物理則の適用領域** `D_model(B, law, topology)`: 採用された保存則・近似・構成則が意味を持つ領域。たとえば1D 平面波近似は横方向の高次モードが無視できる幾何・周波数に限る。粘性損失、源とフィルタの強結合、接触等を無視する近似を無条件に外挿しない。
3. **数値可解領域** `D_numeric(B, discretization, runtime)`: 収束・CFL／時間刻み、行列条件数、非負容積、メッシュ変形、エネルギー残差等を満たす領域。数値が失敗しただけなら身体が物理的に不可能とは言わず `NUMERICALLY_UNRESOLVED`。
4. **証拠付きの主張・製品領域** `D_claim(evidence)` と `D_product(approved_version)`: 独立参照・計測済み許容差、task/source/load/observer、ピン、Owner 採否で限定。**数学的に計算できる**だけでは**自然な生体の再現**や**製品提供**を主張しない。製品で選択できる領域は実行・証拠・採用済み領域の交差に制限する。

**範囲は数値の組だけでなく** `(topology, model, parameters, control, frequency/time band, load, observation plane, backend, pin)` **を引数にした能力 envelope** にする。人間の身体比を規範化するのではなく、必要なら `ka`（波数×代表半径）、`Mach`、`Re`、壁コンプライアンス比、幾何に対する空間／時間離散化などの無次元指標を使って**適用境界を検証**する。具体的閾値はバックエンドごとの事前登録実験で定め、後付けしない。すべての候補に単一の任意の「最大長 2 m」等を設けない。

| 非人間の例 | パラメータ差か、構造差か | 期待する処理（設計） |
| --- | --- | --- |
| 極端に長い／短い1本の腔 | **同一 topology なら連続幾何パラメータ**（全長、各区間長、面積）。ただし数値区間数の再離散化は物理的同一性ではなく別の数値表現 | サイズから音を再計算。現行 OD-2 は**全長固定16×10mm**のため対象外、一般拡張には新たな物理検証・版管理 |
| 2つの独立音源 | **構造差**（源ノード×2、別々の振動体と駆動・接続） | `source_count=2` だけで既存1音源を複製しない。合流法則・位相・負荷・二方向結合の能力ゲート |
| 唇のない身体 | **器官種／actuator の不在**。別器官による閉鎖なら別の実現器を関連づける | `lip_aperture=0` による偽装を禁止。唇 gesture は無条件実現せず、別実現手段がなければ `UNSUPPORTED` または、能力ありで到達不能なら `INFEASIBLE` |
| 肺でなく気嚢／ポンプ／水中媒体 | **駆動源・媒体・位相／貯留の構造差**（同一法則で充分なら後からパラメータ化可） | 流体密度や音速だけ置換しても弁／循環／源–負荷則は生まれない。別 backend／検証を要求 |
| 鼻腔・側嚢の有無、可動連通 | **枝の存在は topology**、長さ・面積は parameter、開口運動は state/controller | OG-4 の固定三管 junction は原理的な受動参照のみ。解剖学的「鼻声」の製品能力へは昇格しない |
| 硬い／軟らかい／異方性の組織 | **同じ器官に付属する構成則 family とその parameter**。family 変更はモデル選択の変更 | `rigid-wall` 以外は現行 OMA v0 で UNMODELED。無根拠な「柔らかさ」の音響効果を出さない |

**線引き判定**: (a) 接続グラフ・器官の有無・自由度の数・保存則の組が変わる→**構造／法則 family の変更**、(b) それらを保ち計測可能な係数だけが変わる→**パラメータ変更**、(c) 時間中に弁・筋が動く→**状態／運動**、(d) 流体や観測が変わる→**媒体／境界／観測条件**。曖昧なものは安易に同じスライダーへ畳まず新しい family として審査する。

### 根拠・射程

[F] [Fidelity-0 の制限](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/fidelity-0.md) は普遍的 `CreatureSpec` 制約ではなく特定 backend の制約。[OG-3 Gate C](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/og3-gate-c-limited-adoption.md)／[OG-4 限定採用の OMA 整理](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/oma-1-vocabulary-response-20261106.md) も極めて閉じた fixture。[H] 1D モデルの適用域と実数値計算域を区別する科学的根拠は [VocalTractLab の 1D 面積関数説明](https://www.vocaltractlab.de/index.php?page=background)。[U] 非人間サイズや多源系の有効パラメータ領域は未測定。

## QM3 — 組み合わせの規則と同一性

### 処方：構成・実行の二段階検査 [H]

**設計上の配線条件:**
- **型とパワーを合わせる。** 音響二端子は向き付き `(p[Pa],U[m³/s])` の組であり、共通境界圧と向き付き体積流量保存を適用する。ピーク複素 phasor `exp(+jωt)`、採用した参照面を共有し、平均パワーは向き付き `0.5 Re(p U*)` [W] で監査。`U` と粒子速度 [m/s] の加算を取り違えない。異媒体は変換則が必要。
- **異種ポートを直結しない。** `airflow.pressure_flow`、`mechanical.force_velocity`、`tissue.contact` はそれぞれ連続式／境界則／接触法則が要る。`actuation.command` はエネルギーポートではない。`receiver.observation` を音響負荷につなぐことは禁止。負荷を持つ実耳の結合は独立の物理端子と観測端子を分ける。
- **トポロジーを検査する。** 必須ポートの供給元、端子、接続方向、重複 ID、浮いた腔／未終端、保存則の個数、接合点の流量連続、能動要素の駆動と安定性を検査。孤立部分は明示的に非参加の Blueprint で保存できても、音を出した成功結果に含めてはならない。
- **対象 backend の capabilities と完全一致で実行を許可。** 種や器官名だけで受理しない。同じ `ideal.branch3.p_u` でも OG-4 の固定3ポート fixture 外なら `UNSUPPORTED`。任意の自由接続 UI があることと、そこに物理 solver があることは別。

**段階と型付き結果（OMA v0 の設計段階語彙に合わせる）:**

| 段階 | 通る条件 | 非成功の処分／偽装防止 |
| --- | --- | --- |
| `design` | 参照・単位・構文・配線が整合する Blueprint。UNMODELED 予約も**注釈つき保存**可 | 不正値／矛盾する二重指定は `INVALID`。保存可能≠音生成可能 |
| `assembly-binding` | Core の既存正本が返す immutable prepared rest state／receipt と能力参照が整合 | 身体 ID／digest／pin 不一致は `INVALID`。全く準備できない未対応構造は `UNSUPPORTED`。可能な rest state は消さず残す |
| `realization` | 要求する全器官／運動／法則が backend の範囲内で、実際に物理状態を形成 | 必要能力が未実装なら `UNSUPPORTED`。**モデルが対応した合法 task**の到達不能だけ `INFEASIBLE`。発散は `NUMERICALLY_UNRESOLVED` |
| `evaluation` | source・負荷・観測面・時刻・媒体・calibration が限定能力と合致 | 受信観測未モデルなら `UNSUPPORTED`。物理／観測失敗時に「音あり Take」を作らない。機器／環境障害 `FAILED` は到達不能と別 |

`UNMODELED` は**保存された効果・ポートの宣言状態**であり、実行結果の成功 status ではない。部分的に別のモデルで計算して完成品として返すのでなく、必要な能力ごとに早い段階で理由・path・backend・不足 law を返す。数値失敗と到達不能の混同は禁じる。コードや wire reason の新設は、この回答では**提案しない**。

### 同一性／再導出／B1 との共存 [F → H]

**同一性は4階層に分ける [H]:**
1. `Character ID`: 創作上の同一人／存在。身体変更・衣装・運動習慣の違いがあっても Character ID 自体は同一であり得る。
2. `Blueprint identity`（将来、提案）: topology、器官インスタンス／接続・物性 law の指定と選択値、version の**設計意図の版**。未モデルも記載できるが、**物理実行可能性や Core-issued BodyRevision ではない**。
3. `Prepared physical body identity`: 正本 Core が所有する原点 parent、family、厳密な操作、対応アルゴリズム、producer pin、prepared geometry／material の**実行時の不変参照**。同じ計算された断面積でも別 lineage なら同一改訂と断定しない。
4. `Take/execution identity`: Body ref に加え、選択 Character revision、motor score／controller、source、負荷、observer、fidelity、clock、backend・Core pin、実行来歴、観測・アーカイブ digest に依存する。そのため Body の同一性だけで Take 同一性にはならない。

[F] **B1 の既知の正本を維持**: Core の有限閉集合は `tract1d.local-log-area-5.v1`、親 `v3b-axial-M0@1`、center `4/8`、ratio wire string `"0.90"/"1.00"/"1.10"`、5区間重み `(0.25,0.5,1,0.5,0.25)`。**非 null 4 revision ＋ 1.00 由来の M0 alias 2要求**。`1.00` は新 BodyRevision を発行しない。M1 は別の preset で OD-2 親ではない。`preparation_digest` は prepared state 証拠であって lineage ID の代替ではない。旧 CC-B1 site08 一区間編集を混ぜない。

[F] **正式 B1 Core pin:** `b5dc95ddbf00efe423635e8ff73f2b550239cd2b`（[Studio #54 Owner 記録](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54#issuecomment-6767339003)）。Core [P1 catalog protocol](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/product/body-b1/P1_CORE_CATALOG_PROTOCOL.md) は閉集合＋再導出／読み戻しの証拠だが、**Studio P2 契約／façade／ピン移行を実施したことにはならない**。既存 Studio の旧 `b569f044…` Take は旧 pin のまま残す。

[H] 将来の Body Assembly から Core 物理体への昇格は「新規 body family と適用 backend に対する**Core-owned 権威／厳密な receipt**」として追加し、Studio は**opaque ref**を持つだけにする。現行 Character `kind: core_body_preset` と、B1 計画上の `kind: core_body_revision` を無断で単一 schema に変えない。まず B1 が v1 内部 transport alias を**再導出／実行／provenance 三角照合**できるかを P2 で証明し、不可なら独立の v2 設計 GO。新地図の hash を旧 `revision_id` に混ぜない。将来変換・alias の際も、旧文字列・旧 Take・旧 receipt を正本として読み戻せることを条件にする。

**不可欠な反例テスト [H]:** 別 lineage 同断面積／同 family 別 pin／同 body 別 gesture／null alias 重複／旧 Take の誤 pin 移行／不正型のポート／分岐流量を粒子速度で加算／UNMODELED を消した生成／unsupported task を feasible と返す／合法 task の数値発散を infeasible と返す。いずれも**偽の実行成功**を拒否する。

### 根拠・射程

[F] [OMA-R QD2–QD6](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/oma-1-vocabulary-response-20261106.md)、[Body Binding v0](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/body-binding-v0.md)、[B1 QP1/QP2](body-b1-plan-response-20261110.md)、[Core P1 catalog](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/product/body-b1/P1_CORE_CATALOG_PROTOCOL.md)。[U] 新しい body-family の cross-backend canonical identity は未検証であり、この回答でアルゴリズム採用はしない。

## QM4 — 既存資産との対応／地図の空白

### 3区分の判定基準 [H]

- **製品で使える（限定）**: Studio の採用済み導線に現在存在し、**明記された物理・演技・観測 envelope 内**で使用できるもの。音質 GO や完全来歴を含意しない。
- **研究のみ**: Core の限定採用された**研究／物理 API**、既に検証した bounded science、あるいは未採用 Draft のプロトタイプ。**Core API の限定採用**は**Studio 上の任意身体組み立て機能の採用**ではない。
- **未実装**: 役割・概念・予約名はあるが、該当する物理効果／製品接続の実装・採用証拠がない。研究例が存在しても、目的とする一般能力が未実装ならここに記す。

| 地図位置 | 現時点の区分と実物 | まだ言えないこと／空白 |
| --- | --- | --- |
| **Body identity／Character／Take** | **製品で使える（限定）:** Studio Character v0 保存→固定演技→来歴つき Take→A/B・export。M0/M1 の Core `core_body_preset` 経路 | 任意の Blueprint Assembly、自由な器官差し替え、完全 VERIFIED SOURCE、音質 GO はない |
| **S3 主腔：静的 1D** | **製品で使える（限定）:** M0（16区間×10mm）／M1（11mm 区間）の固定物理実行。**研究のみ:** Fidelity-0 の source-free transfer、OG-3 固定2管、OG-4 固定3管 | 任意管数・汎用 graph・非人間解剖の実証はない |
| **S3 OD-2 局所身体編集** | **研究／Core 正本発行のみ:** 正式 pin `b5dc95d` の有限閉カタログ。場所は**S3 主腔の rest geometry の限定編集**（新器官ではない） | Studio の creator-selectable P2/P3/P4、一般的な「伸ばす／縮める」編集は未提供。B1 保留を変更しない |
| **S1 気流駆動** | **製品で使えるものは固定入力の効果のみ:** CC-A2 系の外部 prescribed LF 駆動（実行入力） | 肺／気嚢／循環・圧力と平均流の物理的身体モデルは**未実装** |
| **S2 音源** | **製品で使える（限定）:** 規定 LF、`F0=100Hz` の源を用いた既存固定 Take。研究レベルの音源議論あり | 自励振動、source–tract coupling、源の複数性、声質の自由な器官編集は**未実装** |
| **S4 調音・運動** | **研究のみ:** Fidelity-0 の限定 CONSTRICT、Exp027/029、OD-3 の同一身体での時刻変更と3-task協調。**製品は固定演技のみ** | 舌／唇／顎の組織力学・接触・汎用身体依存 realizer、自由 gesture 再生は**未実装** |
| **S5 側枝／弁** | **研究／Core 限定採用:** OG-4 固定受動3ポート。鼻腔一般化ではない | 発声時の動的鼻咽腔弁、任意枝／多源合流、腔と運動の連成は**未実装** |
| **S6 Material／損失** | **現行剛壁・無損失 idealization のみ**（限定現行モデル）。OMA v0 は `rigid-wall` 有効記述 | B2 の受動損失、壁弾性・減衰、組織応力ひずみ、接触は**未実装**。材質 UI を付けただけでは物理にならない |
| **S7 放射・境界** | **製品で使える（限定）:** 継承された固定の理想／抵抗端子と `0.20m` 圧力プロキシ。**研究のみ:** 境界・負荷のメトロロジー検討 | 実際の開口放射インピーダンス、3D 指向性、耳元近接場は**未実装** |
| **E1/E2 Scene／聴き手** | **研究のみ:** Core `asmr/` は採用不能なメタデータ・レジストリ、EL-RP1 Draft #283 は合成ポート数値と同定可能性／参照面の資格づけ | 実耳・耳道校正、HRTF の任意負荷下の再利用、接触／湿潤 ASMR／知覚を製品音源とする能力は**未実装** |
| **C1 SMC／Motor Persona** | **研究のみ:** Core Draft #253 の `packages/speech-motor-compiler/` 系譜、SMC-5 等は symbolic/task timing の限定研究。MotorPersona は仮説 | main/Studio での正式コンパイラ・body adapter・一般 `GesturalScore` 再生は**未実装** |
| **測定／ニューラル** | **研究のみ:** OD-2・OD-3 の数値 oracle、source pin、Core voice metrology、neural causal boundary 設計文書 | 全 Take 同一測定パックと要因分離検証、因果制約つきニューラル補正の製品採用は**未実装** |

**製品化の最優先空白 [H]:** (1) B1 P2 の権威ある body ref→固定物理 Take の橋、(2) 同一負荷・同一観測面で差を検査できる Take 測定／比較、(3) B2 の最初の**本当に異なる物理効果**と独立オラクル、(4) Source の生理学的駆動と音源の分離、(5) 組み立て上の `UNSUPPORTED` 可視化と安全な版管理、(6) 編集UI に現れた値が物理に効かないときの明示的拒否、(7) source/load/observer の実測／校正を伴う段階的採用。音声の自然さはこの地図の穴を隠す後処理では埋めない。

### 根拠・射程

[F] [B1 計画 QP1–QP6](body-b1-plan-response-20261110.md)、[B1 正式ピン決定](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54#issuecomment-6767339003)、[OD-3 DECISION](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/od3-reusable-body-performance-20261102/DECISION.md)、[OG-3 Gate C](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/og3-gate-c-limited-adoption.md)、[OMA v0](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/oma-1-vocabulary-response-20261106.md)、[ASMR Architecture（未採用）](https://github.com/ryonakayama234/morphoacoustics/blob/main/asmr/ARCHITECTURE.md)、[SMC Draft #253](https://github.com/ryonakayama234/morphoacoustics/pull/253)、[EL-RP1 Draft #283](https://github.com/ryonakayama234/morphoacoustics/pull/283)。区分は**この目的での製品利用可否**であり、研究の価値順位ではない。

## QM5 — 地図上の進め方／関門

### 最初に5要因の「分けて変える」実験を固定 [H]

監督者の**未決定の3層提案**（測定パック／5要因／段階化）は、本文では**評価設計案**として採用を提案する。固有音色を物理的に説明する前に、要因を観測上識別できることを検証する。

| 要因 | 主に変えるモジュール・介入 | 固定すべき対照／まず見る観測 |
| --- | --- | --- |
| **source** | S1・S2: 流量駆動、振動体、発声様式 | S3・S7・E2 と task を固定。基本周期、倍音・spectral tilt、非周期成分、source／load 依存 |
| **tract** | S3・S4・S5: rest area、狭窄、側枝 | 同じ源・負荷・観測面・時間。複素 transfer／共鳴、変化した rest body receipt |
| **boundary** | S6・S7: 損失・壁条件・放射終端 | 同じ器官・源・観測距離。複素インピーダンス、受動パワー収支、伝達 |
| **observer** | E1・E2: 測定参照面、校正、外部伝搬・聴取 | **身体と音源の計算は固定**。raw Pa と観測伝達を別記。マイク距離や再生 gain を声の変化と呼ばない |
| **motion** | C1→S1/S2/S4/S5: 運動目標、重なり、習慣 | 同じ身体・源定義・負荷／観測。状態軌道・接触／狭窄・時間変化と音響の因果対応 |

**Take 測定パック v0 候補 [H]:** immutable request／Character・Body ref・exact Core pin／solver・runtime／source 実行時 SHA の取得資格（再計算と区別）／task・運動時刻／媒体・壁・端子・観測面／raw Pa とサンプルレート・長さ・hash／圧力基準と preview gain policy／preparation・revision・receipt／失敗・UNMODELED・numeric status／複素 transfer を取得できるならその基準・位相／F0・高調波傾斜・formant 候補・雑音指標・レベルを**観測特徴**として版付け／聞き手試験・知覚評価は別添。絶対 SPL でないプロキシに絶対音圧のラベルを貼らない。`effort` と `playback_gain_db` は別欄。

**要因分離の試験方針 [H]:** 5種の一因子介入＋null／mutation 対照、再実行・オラクル・ブラインド聴取を目的別に分離する。重要なのは「あらゆる介入で F0 と formant が厳密独立」と断言することではなく、**同じ条件で変えた原因と、観測された応答を追跡できること**。源–声道相互作用が有効になる段階では交互作用を陽に測り、独立性の近似を捨てる。

### 推奨段階・個別関門 [H、すべて新規 GO 未発行]

| 段 | 主対象 | 着手前に守ること／次段への関門 |
| --- | --- | --- |
| **G0 地図／測定契約** | QM1 の意味論地図、5要因、Take 測定パック | 残存する OMA v0／Performance Contract と衝突なし、計測量・単位・参照面・source 状態が明示され、M0/M1 と OD-2 既存 receipt について**再導出できないものを UNKNOWN**と記す。凍結境界外の UI/実装を許さない |
| **G1 B1 P2–P5（別トラック）** | S3 の限定 OD-2 身体を Studio の既存枠へ | **Studio #54 の独立 GO・Owner-PC backup 再検査が必要**。旧 `b569` Take 保全、正式 `b5dc95d` で Core catalog→CC-A2→façade→Character→Take の同一性・refusal・source／負荷照合、4 revision＋2 alias の新規証拠。地図ラウンドが B1 の GO を代行しない |
| **G2 B2：受動損失の最小物理** | S6／S3 の `effect.viscothermal_loss`（まず壁の流体境界層等）。材質自由化ではない | lossless 対照でパワー収支・受動性（外部から無給電時の不当な増幅なし）・周波数複素応答を**独立計算／測定参照**と比較。単位・安定性・反例と事前固定誤差を通す。`wall_compliance` や `tissue_stress_strain` を同時 GO にしない |
| **G3 物理源の豊かさ** | S1／S2: 平均流・音源状態・発声努力と phonation regime | 既存 fixed LF を不変対照に、源単体と loaded source の違い、流量／圧力／振動状態、発声努力と gain の分離を実証。源–声道双方向結合は別サブゲート。F0／倍音だけを操作した偽「生体」を不可。**B3 の源身体化部分はここに依存** |
| **G4 放射・境界** | S7 と E1 の参照面、`effect.radiation_impedance` | 固定抵抗／圧力開放と新しい放射負荷の差を同じ源／Body で検証。端子インピーダンス、パワー・参照面・距離／指向性の適用域を固定。観測後 EQ で放射モデルを代用しない |
| **G5 Motion／SMC 接続** | C1→S4/S1/S2 の task→body-specific realization、時間協調 | 既存 Core/OD-3 を baseline とし、**SMC Draft を product import しない**。明確な TaskGoal→GestureScore の契約／法則／bridge を別ゲートで検証。isolated concat と overlapping gesture、状態継承、到達可能／不能、異なる Body への同一 task 転移を試験。発話の自然さを neural crossfade の成果にしない |
| **G6 E2 Listener／ASMR 段階採用** | まず E2 の**校正済み合成 receiver／負荷**、次に E1 近接場、最後に contact ASMR | EL-RP1 の **RESEARCH ONLY** と圧力のみからの source impedance **非同定性**を保持。Stage A: 数値合成一ポート、参照面／単位・passivity、Stage B: 独立校正された実測、Stage C: 近接場・耳道負荷・接触音。各段で観測と負荷を区別、rights／pre-reg／独立 review／採用 RFC、Studio opt-in と pin が必要。Core `asmr/` メタデータを使用許可とみなさない |
| **G7 B3 側枝・複数源・動的弁** | S5、S2/S3 の多枝／多源、S4 可動接合 | まず OG-4 **固定受動枝**を形状・参照面を守った独立対照とする。分岐の向き付き流量・受動性・特殊点の数値拒否、次に閉鎖・開放の動的連成と多源相互負荷を**別 subgate**。鼻腔・鳥・幻想身体はそれぞれ独立能力。未モデルを「直列管に吸収した」と偽装しない |
| **G8 最後のニューラル継ぎ目** | C1 の提案／逆推論（上流）、S6/S2 等の closure・surrogate、最終 microtexture（下流） | **身体・物理音の基準系と不足成分が測定で同定**され、適用 domain・fallback が明示されて初めて審査。ニューラル OFF／residual 単独／身体介入・実行不能／源結合介入／未知身体 OOD の負例で物理因果が残ることを検証。単一巨大 vocoder の自然音で物理を上書きしたら STOP |

**順序に関する限定:** 上表は推奨依存関係であり全工程の一括発注ではない。G6 の合成 receiver 科学は前倒しの**研究**をしてよいが Studio 製品採用は対応ゲート後。G7 の固定枝数学は既存 OG-4 で並行可能だが、多源・動的枝・「鼻声」製品提供は G3/G5 等に依存する。B3（「側枝・源の身体化」）は同一 PR の一括作業とせず、**G3 の source と G7 の topology／動的接合に分割**して審査する。

### ニューラルを「最後」にする具体的な意味 [H]

物理本体: `(Body topology, geometry, material, Actuators, Gesture, source, load) → physical state → y_phys`。ニューラル上流の発音／gesture 候補や inverse proposal は**身体実現可能性の権威を持たない**。下流を許すのは `y_phys` と物理状態で条件づけられた**未解像の微小変動**で、formant・音素・身体の実行不能を再生成してはならない。surrogate は訓練 domain 外で物理へ戻すか「未対応」とする。事前固定した体積／エネルギー・源負荷・身体差の介入が neural ON/OFF でも保たれることを関門とする。これはニューラル導入の GO ではない。

### 根拠・射程

[F] [OD-2](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/research/od2-reusable-physical-body-20261102/RESULTS.md)、[OD-3](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/od3-reusable-body-performance-20261102/DECISION.md)、[SMC Draft #253](https://github.com/ryonakayama234/morphoacoustics/pull/253)、[ASMR ARCHITECTURE](https://github.com/ryonakayama234/morphoacoustics/blob/main/asmr/ARCHITECTURE.md)、[EL-RP1 Draft #283](https://github.com/ryonakayama234/morphoacoustics/pull/283)、[Neural causal boundary](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/neural-causal-boundary.md)。[H] 運動重なりと task-space 実行の一般的な学術根拠は [Task Dynamics に関する研究](https://pubs.asha.org/doi/full/10.1044/2022_JSLHR-21-00212)。これらは新しい多物理モジュールの実装合格や音質向上の実測を意味しない。

## 監督者 Muse への逆質問（MQ）— 既定提案つき

これらは回答本文を未完にする質問ではない。監督者は **AGREE / REVISE / REJECT** と根拠・反証条件を返し、Owner が採否・後続 GO を判断する。

**MQ1 — Body Assembly の編集資格を「意図」と「実行可能な構成」に分けるか。** 既定提案: **YES**。UNMODELED 要素は保存・表示可、出音要求時には型付き拒否。Blueprint hash を既存 Core BodyRevision に昇格させない。反証: 保存と実行を分離できず誤出音する場合。

**MQ2 — B1 `core_body_revision` は本ラウンドでも Core 正本とし、汎用 Assembly identity を別レイヤーとするか。** 既定提案: **YES**。Studio #54 P2 の完了なしに `b5dc95d` を Studio 提供済みとしない。反証: 型・pin・旧 Take を保った再導出が証明できない場合。

**MQ3 — B2 の第一効果を受動 `viscothermal_loss` とし、組織の硬さ／柔らかさ UI は物性検証まで未対応にするか。** 既定提案: **YES**。ただし先に独立参照・数値安定性・有効周波数帯を事前登録する。反証: 同じ負荷・観測で受動性／複素応答が再現できない場合。

**MQ4 — B3 を source 身体化と branch／動的弁の二つの審査系列に分けるか。** 既定提案: **YES**。既存 OG-4 の固定 junction を anatomy や複数の自励源の根拠にしない。反証: 系列間の必須 law／source-load 境界が未定義なまま両系列を「統合済み」とする場合。

**MQ5 — Listener を外部モジュールとして扱い、まず合成一ポートのみ、実耳・近接場・ASMR は独立科学／権利／製品ゲートとするか。** 既定提案: **YES**。EL-RP1 の「単一負荷での pressure-only HRTF は source impedance を決めない」を維持。反証: 根拠がない負荷変更や HRTF 掛け算で耳到達圧を主張する場合。

**MQ6 — ニューラル因果監査を、body／task 反事実を守れない出力は採用しないという stop gate にするか。** 既定提案: **YES**。自然らしさの A/B 好評だけでは通さない。反証: residual が単独で内容を復元し、物理側の `INFEASIBLE` を「直す」場合。

## 最終的な提案の効力

本書が提案するのは**製品視点の身体モジュール地図と、その物理能力を昇格させる検証順序**だけである。既存の凍結 OMA 語彙、有限 OD-2 カタログと正式 pin、B1 保留、SMC／EL／ASMR Draft の未採用状態、旧 Take、Studio 凍結 ADR は変更しない。**実装・採用・UI 変更・新契約・関門の開始・マージはすべて後続の明示的決定事項**とする。
