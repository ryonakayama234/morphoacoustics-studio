# BODYMAP-G0-R-20261111-01 — 地図／測定契約：QG1–QG4 Research Lead 回答

**日付:** 2026-11-11 JST  
**役割:** Research Lead（回答・処方）／ Muse（独立審査）／ Owner（採否・GO）  
**質問票:** [BODYMAP-G0-20261111-01](body-map-g0-questions-20261111.md)／[Draft PR #59](https://github.com/ryonakayama234/morphoacoustics-studio/pull/59)／[Issue #58](https://github.com/ryonakayama234/morphoacoustics-studio/issues/58)  
**正本の上位設計:** [Owner 採用済み BODYMAP-R-20261111-01](body-module-map-response-20261111.md)（PR #57 merge `b8051bb`）。  
**状態:** **RESEARCH LEAD PROPOSAL / MUSE REVIEW PENDING / OWNER ADOPTION PENDING / DOCS ONLY**。ここでの契約は**提案・凍結候補**であり、実行用 JSON Schema・Core/Studio コード・製品 UI・物理モデル・既存 Take・P2 の関門・Owner GO を変更しない。採用された後も G0 は**測定設計の採用**であり、測定実施・音質採用の宣言ではない。

## 0. 判定語・不変条件・証拠の射程

- **[F] 既存証拠に根拠のある限定事実:** GitHub main の設計・実装・受入コメントから確認した範囲。**この回答で Owner PC の ZIP や Core 物理ランを再実行・独立検証したわけではない**。
- **[H] 提案する規範／検査設計:** 後続実装の仕様候補、測定方法、記録様式、関門。ここでテスト PASS を報告するものではない。
- **[U] 未実証／未同定:** 実ラン source 波形の同一性、未モデルの source–tract 双方向連成、任意の放射・材質・動的弁、校正済み耳元 SPL、音質の自然さ、全5要因の独立識別など。

**強制する分離 [H]:** `Body ≠ Character ≠ Motor/Performance ≠ Source ≠ Boundary ≠ Observer ≠ Take`。元データ・物理計算・表示用 WAV・事後の特徴導出・聴取回答を異なるオブジェクトとして扱う。`RECOMPUTED` は実ラン証明にならない。**欠測値と適用不能は推定値で埋めず、NULL と理由を残す。** 以前の記録を後日再評価しても、採取当時の来歴状態を上書きしない。

既存拘束 [F]: 現行 Studio の M0/M1 は Core pin `b569f044bfda309dff1a00cccf8365754e6b1355`、規定 `lf_fixed`（100 Hz）、固定「あい」／3-task／seed 0、48 kHz × 24,000 sample の0.5秒、`0.20 m` 圧力**プロキシ**。M0 は16×0.010 m、M1 は16×0.011 m。OD-2 の局所編集は Core 正本の `tract1d.local-log-area-5.v1`、中心 {4,8} × 倍率文字列 {"0.90","1.00","1.10"} に限定し、非null 4 revision／null 2 alias、全長固定 M0 0.160 m。B1 正式 Core pin は `b5dc95ddbf00efe423635e8ff73f2b550239cd2b` だが、**現行 Studio pin をそれへ移した証拠ではない**。B1 P2 は [Issue #54](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54) で独立保留。

## QG1 — Take 測定パック v0 の凍結設計

### 処方 [H]：データモデルと必須・任意を区分する

**`take-metrology-pack/0` は元の `studio-v0-take-envelope/v0` と別の「不変の監査サイドカー」**。元 Take／Core receipt に書き込まない。既存の証拠を参照する `source_evidence`、物理観測 `observations`、事後計算 `derived_features`、欠測・否定結果 `coverage`、その結果を作った手順 `method_manifest` の束とする。**必須**とは「値が必ず測れた」ではなく「欄と測定資格／欠測理由を必ず明示する」こと。

| 区画／必須度 | v0 のフィールド・定義 | 単位・基準・失敗時 |
| --- | --- | --- |
| **Identity 必須** | `pack_id`、`pack_schema_version=take-metrology-pack/0`、`origin_class=NEW_RUN/RETROSPECTIVE`、`origin_record_ref`、元レコード SHA-256、`take_id`（該当時）、発行者・作成日時、親 pack（派生時）、`claim_scope` | UTF-8／正本 URI／SHA-256。未存在 Take に架空 ID を付さない。異種の OD-2 研究 receipt は `evidence_id` として扱う |
| **Request/Body 必須** | 不変 request／入力 digest、Character ID/revision/snapshot SHA の存否、`body_ref_kind`、Core-authored preset/revision/parent、`preparation_digest`、core exact SHA、backend/solver/adapter protocol、case/alias/fixture、物理モデルの適用領域 | 不明は `UNKNOWN`。OD-2 の `revision_id` を Studio 側で再発行しない。`pin` は実行時 pin と事後検査 pin を別に保持 |
| **Source 必須** | source ID、generator/契約版、規定 F0、sample SHA と `evidence_class`、採取時 pin/runtime、`full_verified_source_state`、実ラン認証の有無 | F0 の100 Hz は**入力条件**。観測された出力 F0 [Hz] と混ぜない。実ラン SHA 欄は根拠がなければ `null` |
| **Motion 必須** | script/固定演技 ID、task plan SHA、seed、duration、時間基準 `t=0`、再生制御の有無、実現 outcome と diagnostics | 時間 [s]、sample index [整数]。`effort` 未モデルなら `UNMODELED`、`playback_gain` とは別欄 |
| **Medium/Boundary/Observer 必須** | `rho`、`c`、壁・損失モデル、端子モデルと係数、source 境界、負荷、`pressure_proxy_at_0p20m` の生成定義・距離と参照位置、座標・観測面が既知か | `rho` [kg/m³]、`c` [m/s]、圧力 [Pa]、体積速度 `U` [m³/s]、音響インピーダンス `p/U` [Pa·s/m³]、距離 [m]。値・系がない場合は明示欠測 |
| **Raw signal 必須** | `raw_pressure_pa` の存在・パス・原バイト SHA-256・dtype/endian・channel・frame 数・sample rate・duration・非有限サンプル検査・量子化規則と量子化 SHA（存在時） | **モデル出力の Pa／0.20 m プロキシ**。サンプルレート [Hz]。SHA 対象バイトの仕様（NPY 全体か配列 payload か）を個別に明示。拒否時は `NOT_APPLICABLE: NO_AUDIO` |
| **Preview 必須** | WAV artifact/ref・原バイト SHA・codec、peak normalization、後段 `playback_gain_db` と適用位置、クリップの有無、raw→preview の既知の変換 | `dBFS` はデジタル満振幅基準。既存の各 Take 別 peak-normalized WAV 同士の振幅から物理声量を比較しない |
| **Outcome/Quality 必須** | `job_status`、`realization_outcome`、`numeric_state`、`unmodeled_effects[]`、型付き拒否・収束/有限性・overflow/underflow・artifact integrity・`provenance_state`、証拠リンク | `UNSUPPORTED/INFEASIBLE/NUMERICALLY_UNRESOLVED` を混同しない。既存結果にない status は遡及的に作らない |
| **Coverage 必須** | 全必須観測欄・各特徴について `MEASURED / RECOMPUTABLE / UNKNOWN / NOT_APPLICABLE`、`reason_code`、必要 artifact と欠損理由、派生元と reviewer | `UNKNOWN` は0でも「差なし」でもない。非適用は明確な物理理由があるときだけ |
| **Complex response 任意** | `H(f)` または `Z(f)`、複素数の Re/Im、同一の pressure/flow 入出力ポート、周波数 grid、時間・負荷・端子・phasor 符号、正規化、取得法 | 周波数 [Hz]、`H` の次元は定義次第、`Z` [Pa·s/m³]。他の端子条件の転送関数を合算しない |
| **Additional observables 任意** | 向き付き `p,U`、状態軌道、rest area/length と時変 geometry、energy flux、壁損失、複数源、校正マイク、機器応答 | area [m²]、length [m]、power [W] 等。`UNMODELED` な量を無音でゼロ埋めしない |
| **Perception 別添・任意** | 盲検デザイン・聴取者応答・音量正規化・刺激順序・解析版 | 物理 pack の判定・合格欄に混入しない。気に入った声かどうかは物理 oracle ではない |

**参照面・校正の規則 [H]:**
1. `raw_pressure_pa` が物理単位 Pa であっても、現在の `0.20m` は**簡略化した観測圧プロキシ**である。校正マイクでの人間耳元／自由音場の **absolute SPL（dB SPL）**を名乗らない。
2. v0 の primary level は `p_rms = sqrt(mean(p[n]^2))` [Pa]、全区間と**固定した解析窓**の両方。補助の `20 log10(p_rms / 1 Pa)` は **"dB re 1 Pa (model proxy)"** とだけ表示する（ゼロ・非有限は欠測と理由）。20 µPa 参照の dB SPL は、校正と物理面の資格が得られるまで出力禁止。
3. 共通の `0.20m` 観測条件を比較するときは、源・端子・境界・周囲媒体・計算実装と位相符号の同一性を記録。`preview WAV`／再生 gain／ヘッドフォンは**観測操作**であり発声努力や物理出力の変更と呼ばない。
4. 固定 LF の入力 `f0_hz=100` は原因側の規定パラメータ。出力の知覚 F0、声門自励・source–tract coupling の測定と同一視しない。

### Source 資格を二階建てにする [H、RQ1 厳格 B を維持]

| 資格 | 認めるとき | 書いてよい主張 |
| --- | --- | --- |
| `ACTUAL_RUN_ATTESTED` **（現行 S3 では不可）** | **同一実行過程で**生成器が**実際に物理ソルバへ供給した sample buffer**を hash 化し、sample encoding/dtype/count/境界・実行 ID/信頼 pin と改ざん検出可能な receipt に結び付け、検証可能であること。単なる generator 実行や別プロセス復元は不可 | source の**当該 run input**が attested された。これ単独で full VERIFIED SOURCE／生理学的妥当性まで許さず、他の provenance gate も必要 |
| `RECOMPUTED` | 事後に同じ generator を**別途実行**したと確認でき、generator pin、Python/NumPy/実行環境、dtype/endian/bytes、再計算時刻と SHA を記録 | 同条件で再計算した**候補 sample**。当該本番ランで消費されたバイト列・環境横断のビット一致は **UNKNOWN** |
| `UNKNOWN` | sample bytes/生成法の裏付けがない、または必要 artifact が失われた | hash を捏造しない。`actual_run_source_samples_sha256=null` |

`full_verified_source_state` は現存 S3/S5 について **UNKNOWN 固定**、`provenance_state=INCOMPLETE_PROVENANCE` を保持。将来のゲートが通っても旧 Take を「事後に実ラン確認されたもの」へ書換えず、**新しい実行から新しい証拠**を生成する。OD-2 の source digest が記録されていても、採取経路の独立した実ラン buffer attestation がなければ同様に扱う。

### 版管理される特徴算出 [H]

**v0 の配布対象は「観測特徴の定義・無効判定・版ハッシュまで」**。計算結果の存在を前提にしない。`feature_set_id=bodymap-take-features/0`、`feature_algorithm_id`、実装 Git SHA／依存 lock digest、設定 JSON の canonical SHA、入力 raw SHA、窓と選択区間、変換・欠測理由を特徴値と不可分に凍結する。

| Feature | v0 定義・予定する reference recipe | 無効化条件と主張制限 |
| --- | --- | --- |
| `level` | native raw Pa の非中心化 RMS、mean、peak、clip/nonfinite、全0.5 s と登録済み固定窓で計算。preview の RMS は `preview_dbfs` と別名 | raw 欠損→UNKNOWN、拒否→NOT_APPLICABLE。端子・観測条件が異なれば同じ Pa でも無条件比較しない |
| `f0_observed` [Hz] | raw の解析窓ごとに正規化自己相関の周期候補を抽出、探索帯 70–400 Hz、時間軸 80 ms Hann window／20 ms hop の**提案設定**を preset に記録。信頼度閾値・境界／倍周期・集約方法も凍結してから実施 | 規定入力100 Hzと別。無周期、低信頼、時間変化大の窓は `UNRESOLVED`。**source physiology の証拠ではない** |
| `harmonic_tilt` [dB/oct] | 周期・位相安定窓の harmonic peaks（原則 H2–H10）振幅 dB を対数周波数に対して回帰。H番号、リーケージ補正、harmonic detection、帯域、最少有効倍音を固定 | 高調波が分離不能、source/filter 影響を分離不能なら未算出。**声門スペクトル傾斜と同定しない** |
| `resonance_peak_candidates` [Hz] | 取得資格のある固定負荷複素 transfer の局所ピークを第一選択。raw のピークだけからの候補は別 `output_spectral_peaks` として窓・STFT・ピーク規則を固定 | 合成出力ピークを解剖学的「formant」と断定しない。複素 transfer がない記録に後から理想端子の値を混ぜない |
| `noise_proxy` [ratio / dB] | harmonic mask 内外の残差比などの**明示された数値観測指標**。mask幅、帯域、正規化、周期判定を method に含める | LF100 に伴う数値残差を「実際の息漏れ／気息性」と呼ばない。判定資格がなければ UNKNOWN／NOT_APPLICABLE |
| `time_features` | onset、区間エネルギー、feature trajectory を元 sample index と固定 window/hop の集合で保存 | 時刻を「舌接触／実運動」と推定しない。trace にない器官自由度は未観測 |

上記は**アルゴリズムの初期仕様案**であって、この回答は解析コード・信頼度閾値やその科学的妥当性を検証していない。**G0 凍結時には** feature ごとの具体的アルゴリズム、窓、端点処理、閾値、synthetic unit tests と null の出し方を**機械可読 method manifest の固定値としてレビュー**する。まだ閾値が検証されない特徴は `DEFINED_NOT_VALIDATED` とし、**比較用の必須「値」にはしない**。実測を伴わない段階で feature 完全計測済みと誤認させないためである。

**互換性・凍結 [H]:** (a) Research Lead が仕様提案・field dictionary・method manifest と欠測規則を docs に提示、(b) Muse が単位／参照面／同じデータでの決定性／反例（WAV gain、別負荷、消えた raw、偽 actual SHA）を設計審査、(c) Owner が `G0 CONTRACT ADOPTED` と凍結対象の**文書 commit SHA／内容 SHA／method IDs** を明示して初めて v0 とする。(d) 凍結後は無変更・後付け再定義禁止。誤記修正も amendment ledger に履歴と影響を書く。追加 optional field は `v0.x` と旧読込の互換性試験、項目意味／単位／判定／特徴レシピ・参照面の変更は**新しい major method/pack version**。過去値は旧 method と共存させ、比較は `SAME_METHOD` または**双方の元 raw を保持して同じ新 method で並行再計算した派生値同士**だけで行う。片側だけ新 method なら `NOT_COMPARABLE`。数値差をゼロ埋めしない。

### 参考になる最小のサイドカー形 [H、未発行・非実装]

```json
{
  "pack_schema_version": "take-metrology-pack/0",
  "origin_class": "RETROSPECTIVE",
  "origin_record_ref": "<immutable evidence reference>",
  "origin_record_sha256": "<sha256 or null>",
  "claim_scope": "BOUNDED_MODEL_ONLY",
  "source": {
    "source_id": "lf_fixed",
    "actual_run_samples_sha256": null,
    "recomputed_samples_sha256": "<verified source record or null>",
    "evidence_class": "RECOMPUTED",
    "full_verified_source_state": "UNKNOWN"
  },
  "observer": {
    "type": "MODEL_PRESSURE_PROXY",
    "distance_m": 0.2,
    "calibrated_absolute_spl": false,
    "preview_gain_policy": "PER_TAKE_PEAK_NORMALIZED"
  },
  "raw_pressure": {
    "artifact_sha256": null,
    "artifact_status": "UNKNOWN"
  },
  "feature_set_id": "bodymap-take-features/0",
  "derived_features": [],
  "coverage": [
    {"field": "f0_observed", "status": "UNKNOWN",
     "reason_code": "NO_VERIFIED_RAW_SIGNAL"}
  ]
}
```

この JSON は **wire/schema 追加の提案ではない例**。`UNKNOWN` に使う `null` を「値は0」に変えてはならない。

## QG2 — 5要因分離の実験設計

### 処方 [H]：**「要因を分ける実験設計」**と**「現状で実験可能」**を別行で管理

**共通固定条件:** 同じ Core exact pin／backend／runtime の対象内比較、同じ規定 LF100、固定3-task／seed 0／48k×24000、負荷／0.20m proxy、raw Pa 参照、保存済み request と準備済み body の正本。OD-2 と M0/M1 を跨ぐときは **Core の別 pin／研究・製品 run 系譜を混ぜず**同 pin での再実行を先に要求。**一因子を動かしたつもりで二因子を動かしていないか**を source・geometry・task・terminal・observer の SHA／値で検査する。

| Factor | 介入・固定・想定 observable | **現行の実物での資格**／主張上限 |
| --- | --- | --- |
| **Source** S1/S2 | `lf_fixed` を固定した null baseline を置き、将来は**独立の源 waveform／駆動**を同一 body/task/terminal/observer に与える設計。入力周期・振幅・スペクトル、source–load 応答 | **現行 Studio は介入不能**。規定 `lf_fixed` の pin/同一性検査、M0/M1／OD-2 間での固定要因としてのみ使える。100 Hz を声帯制御の自由レバーと主張しない。源–声道結合効果は `UNMODELED` |
| **Tract** S3 | **M0↔M1**（断面積は同じ、全区間長 10→11 mm）、**Core OD-2**（M0 rest、中心 4/8、倍率 0.90/1.10 の5セル log-area変更）。同じ LF/task/terminal/observer、raw Pa L2・共鳴候補・準備形状 | **M0/M1 は現行 Studio の既存実行可能条件**、OD-2 は**Core 研究／P1 カタログ**まで（Studio B1 P2 未実施）。M0/M1 を「局所面積編集」の実験とは呼ばず、異なる pin の Take は直結しない |
| **Boundary** S6/S7 | 同じ geometry/source/task に対して終端負荷 `Zload` または壁効果だけ変え、同じ portで複素 `Z/H`、Pa・受動性を観測 | 現行の**製品 Take で負荷を可変にする介入は不可**。固定抵抗端子を登録。理想圧力開放の source-free 参照や G2 の受動損失候補は**別研究条件・将来 gate**。異なる境界の既存 transfer を同じ負荷の検証に流用しない |
| **Observer** E1/E2 | 物理計算 **raw Pa を一切再実行／変調しない**。保存済み proxy から表示 gain・正規化だけ変え、その dBFS 応答が予測どおりで raw hash 不変かを検査。将来は校正済み距離・受音点 | **今できるのは表示／評価系の null・gain 対照**。`0.20m` は固定で、距離／実耳／近接場の効果を**実測分離できない**。gain 変更を身体差や声量差と呼ばない |
| **Motion** C1→S4 | body/source/terminal/observer固定で onset/overlap 等を変え、時間別 trace・area・Pa を比較 | **製品 Studio は固定3-task のみ**。既存 Core OD-3 には**同一身体の時刻変更／3-task協調の限定研究**があるが、新しい Studio 自由運動や任意 controller の実証ではない。G0 では設計可能・研究証拠のみ |

**5要因の同時分離は現状では「達成」ではない**。現行実行で一因子介入が厳密に成立する主軸は **tract（限定比較）**、observer は表示 transform のみ、source/boundary/motion はそれぞれ将来の run gate を要する。`source×tract` の双方向力学、`boundary×source`、`motion×tract` の交互作用は、因果的な完全独立性を宣言できず `NOT_IDENTIFIABLE_WITH_CURRENT_MODEL` とする。LF 外部入力を変えない現行モデルの中では「源が反応しなかった」は**モデル上固定したから**であり、実生体で無影響という結果ではない。

### 対照・反例・聴取の三重化 [H]

1. **Null control:** 同じ body/source/task/load/observer の再実行（pin・環境を一致）＋ OD-2 の c4/c8, `r=1.00` はどちらも**同一 M0 alias**。null は新 BodyRevision として発行しない。M0/M1 は物理的 null ではない。幾何・receipt のビット一致と raw の**事前凍結された許容差**を区別する。
2. **Mutation control（検証器の失敗を証明）:** ① OD-2 の center／ratio／parent／prepared digest／pin／負荷／観測面をすり替え、② `raw` の一部だけ／WAVだけを改ざん、③ `2*p_null-p_variant` で相対 L2 の大きさを保持し、WAV と manifest hash まで協調して更新した偽造を、**保存 manifest 再読込だけでなく信頼できる再実行 oracle** で拒否する。④ preview gain の差を raw Pa 差として報告したケースを拒否。mutation は正規物理例と混ぜない。
3. **Replay と独立 oracle は別:** 再実行は同 source/code/seed を同一実行範囲で繰り返す**再現性**検査。独立 oracle は親幾何・5cell law・同一負荷の複素応答・出力波形を別経路で求める**正しさ**検査。原判定を流用した自己照合は独立 oracle と呼ばない。OD-2 既存閾値：`max log-area residual ≤1e-12`、体積相対 residual ≤1e-12、timed log-area ≤1e-10、同条件 complex relative error ≤1e-9、same-runtime replay L2 ≤1e-12。**既存 OD-2 限定 run への根拠**であり別実験へ自動移植しない。
4. **知覚評価は別試験:** 物理解析・対照と cutoff をロックした後、刺激の音量正規化規則／例外／順序 randomization、ABX/2AFC 課題、聴取者の属性・除外規則・サンプル数と検定法を**別事前登録**。実施者・分析者に条件の暗号化 label を使い、回答後に開封する。**「聞き分け可」は物理因果や音質 GO ではなく知覚結果**。有意差を見てモデルを調整したら新実験として扱う。

**事前登録に必要な欄 [H]:** `prereg_id/status/revision`、対立仮説と棄却可能な予測、許可済み case/positive/null/mutation の正確な IDs、factor と**唯一の intervention 対象**、他4要因の固定値・hash、実験系譜（Studio/Core research）、pin/runtime/source 資格、sample 数・解析時窓、primary/secondary observables と method SHA、同一参照面・units・盲検・多重比較、**先に固定する threshold**・未検証欄、STOP/UNKNOWN 規則、独立 oracle、データ保全・検証者・実施 GO の署名。未実行の実験は `REGISTERED_NOT_RUN` とし、値だけから PASSED を作らない。

**実験実施に進める設計関門（G0 内では GO を発行しない） [H]:** (i) 介入が適用可能な既存 backend と pin に閉じる、(ii) 他要因が hash／参照面で固定できる、(iii) null と少なくとも一つの偽造 mutation が事前に定義される、(iv) method と oracle を実行結果を見る前に凍結できる、(v) 実験不可の factor は `BLOCKED_BY_CAPABILITY` と分けて登録、(vi) Muse 審査後に Owner が**当該実験**の個別 GO を出す。測定の設計完成を5要因すべての実測完了と同一視しない。

## QG3 — 既存証拠の遡及適用・UNKNOWN 台帳

### 処方 [H]：元の証拠を保存し、派生の「資格」を判定する

**判定アルゴリズム:** 各 `(origin_evidence_id, field, method_id)` について、
1. 当時の信頼できる物理 run/receipt に**測定値そのものと測定手順／参照面**が保存されている → `MEASURED`（当時の報告・artifact の SHA と証拠階級を併記）。**今回再検証済みという意味ではない**。
2. 原 artifact bytes と frozen method/pin/units/reference plane が**利用可能・検証可能**で、**新たな物理実行をせず**決定的に算出可能 → `RECOMPUTABLE`。実際に計算を行った場合は `DERIVED_RECOMPUTED` と新 SHA/algorithm/runtime/time を付与し、元に書き戻さない。source waveform を**新たに generator 実行**する場合も `RECOMPUTED` であり actual-run にはならない。
3. いずれも満たさない／原 SHA や参照面が欠ける／必要な入力が当時の run で採取されていない → `UNKNOWN`。物理的に対応量が存在しないことが証明できる拒否記録では `NOT_APPLICABLE` とする。

**優先順序:** report に値が記載されていても raw bytes を今読み出せない場合、**`MEASURED_REPORTED_NOT_REVERIFIED` という source-local qualification** を添える。`MEASURED` は「証拠当時に測った」であって「Research Lead がこの回答で再実測した」ではない。多数の source を取り違えない。

| 遡及対象 | **MEASURED（既存記録にある）** | **RECOMPUTABLE（原 artifact が残り・入手できる場合のみ）** | **UNKNOWN／昇格禁止** |
| --- | --- | --- | --- |
| **S5 M0/M1 2 Take**（[Issue #50 完了コメント](https://github.com/ryonakayama234/morphoacoustics-studio/issues/50#issuecomment-6736075443)） | Take/Character ID、Studio `daef28b`/Core `b569…`、Python 3.12.3/NumPy 2.4.6、WAV 48,044 bytes と SHA、raw Pa **量子化 hash**、task-plan SHA、source sample の**RECOMPUTED** SHA、envelope SHA、BagIt の検証結果、`INCOMPLETE_PROVENANCE`、fixed 0.20m proxy。M0 の量子化 raw hash が既存 X2A oracle と一致したこと | Owner 保管 BagIt の**原バイト検証後**に native raw Pa RMS／モデル proxy level、時系列特徴、`f0_observed` 候補など（入力 raw の有無・parser/method が条件）。元 WAV だけから raw Pa を逆算しない | actual-run source SHA、full VERIFIED SOURCE、校正済み SPL／実耳特性、自励音源状態、身体組織・壁損失の実測、真の吸気・努力量。過去に測っていない listener reaction を後付けしない |
| **Core OD-2 六ケース＋P1 receipt/catalog**（[Core RESULTS](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/research/od2-reusable-physical-body-20261102/RESULTS.md)、[P1 protocol](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/product/body-b1/P1_CORE_CATALOG_PROTOCOL.md)） | 4 nonnull revision＋2 M0 null alias、parent/preparation receipt・六ケースの正本 record、固定 source・task・load・0.20m proxy、48k×24000 raw、6本研究 WAV、同系統の raw Pa relative L2（例 c4 r0.90=0.05627127、c8 r0.90=0.02659999）、geometry/complex oracle・数値 refusal・archive retry の限定検証結果 | trusted archive の raw NPY と full receipt が得られたら同じ method で level/feature を計算できる。固定レシピからの再導出は **`RECOMPUTED` source/case** と明記、Core-pinned 再実行なら **NEW_RUN** として旧研究 run と区別 | **Studio P2 製品 Take**、旧 b569 S5 Take との同一 pin 音響比較、true actual-run source buffer SHA、calibrated receiver、声質の個体同定／自然性、load を変えた連成応答 |
| **S3 façade 実装と受入**（[Issue #48](https://github.com/ryonakayama234/morphoacoustics-studio/issues/48)、[main v0 façade](https://github.com/ryonakayama234/morphoacoustics-studio/blob/main/server/v0-facade.mjs)） | Snapshot→M0/M1→固定実 Core request→v0 envelope の**製品経路のテスト**、body mismatch・replay／pin drift・refusal／no-WAV の負例、`actual_run_source_samples_sha256=null`／`full_verified_source_state=UNKNOWN` の実装、S3 監督者受入 | 既存のテスト fixture／保存済み result bytes があれば同じ pin で envelope・hash・state を検査。**特定の実測音響値は保存された正本 artifact を確認してから** | S3 policy PASS から全 Take の raw Pa や F0を推定すること、source actual-run 証明、P2 の新 revision 利用資格、abs SPL |

**SOURCE 特記:** S5 の `4d075fd8…` は**再計算 SHA**。Core OD-2 の run 記載の `source_sha256_le_f64=4d075fd8…` も、生成・取得過程の別照合がない限り `ACTUAL_RUN_ATTESTED` と断言しない。P1 では異なる環境で source float64 bytes SHA に差が観測され、同一モデル内の数値受入とは**別のビット同一性問題**である（[P1 protocol: Source-bit portability](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/product/body-b1/P1_CORE_CATALOG_PROTOCOL.md)）。したがって **古い記録に「実ランで使われた同一 source」と事後追記しない**。

### UNKNOWN 台帳の最小スキーマ [H]

| 欄 | 必須内容 |
| --- | --- |
| `ledger_key` | `origin_evidence_id + field_path + method_id`（同一証拠／項目の再評価も新行で append） |
| `source_anchor` | URL／commit／アーカイブ byte hash（未入手なら null）、測定日、誰がどこで実測したと報告したか |
| `origin_class` | `S5_TAKE / OD2_RESEARCH_RECEIPT / S3_FACADE_EVIDENCE / NEW_TAKE` |
| `status` | `MEASURED / RECOMPUTABLE / DERIVED_RECOMPUTED / UNKNOWN / NOT_APPLICABLE`、`evidence_level`（`REPORTED_ONLY / BYTES_VERIFIED / REEXECUTED` 等） |
| `missing_reason` | `NOT_CAPTURED / ARTIFACT_UNAVAILABLE / SOURCE_NOT_ATTESTED / UNMODELED / UNCALIBRATED / METHOD_UNFROZEN / PIN_MISMATCH / REFUSAL_NO_AUDIO / NOT_IDENTIFIABLE` 等 |
| `lineage` | 元 artifact SHA、参照面・unit、method ID/hash、計算環境／取得時刻、別派生 record refs、reviewer、`claim_limit` |
| `resolution` | `OPEN / NEW_EVIDENCE_ATTACHED / SUPERSEDED_BY_NEW_RUN` と審査署名。`UNKNOWN` 自体は削除せず append only |

**最初から OPEN にする台帳行の例 [H]:**

- `S5_M0 / actual_run_source_samples_sha256 / UNKNOWN / SOURCE_NOT_ATTESTED`、M1 も同様。
- `S5_M0 / calibrated_spl_db / UNKNOWN / UNCALIBRATED`、M1 も同様。
- `OD2_* / studio_product_take_id / UNKNOWN / NOT_CAPTURED_IN_STUDIO`（**研究は研究のまま**）。
- `S3_façade / source_tract_bidirectional_state / UNKNOWN / UNMODELED`。
- `S5_* / observed_f0_v0 / UNKNOWN / METHOD_UNFROZEN_OR_RAW_NOT_VERIFIED`（将来 raw 確認と凍結済みメソッドが揃えば**新しい派生値**として解決可）。

**改ざん・後付け防止 [H]:** 原 Take／receipt／BagIt ZIP は immutable content address で参照。台帳は append-only（元行と reviewer の SHA／日付を固定）、派生パックは `origin_class=RETROSPECTIVE`・`backfill=false`・`measurement_time` と `derivation_time` を別記。元の `record_sha` が変われば拒否。新しい計算で `RECOMPUTABLE`→`DERIVED_RECOMPUTED` にしても**当時の measured 欄は変わらない**。`UNKNOWN` を削除せず解決イベントを足す。実行結果を伴わずに `MEASURED` を宣言すること、preview から raw を推定すること、historical b569 を b5dc95d として読むことを STOP にする。

**表示ルール [H]:** 新規 `NEW_RUN`（実ラン input attestation があればその資格も別）と `RETROSPECTIVE[S5/OD2/S3]` を常時分離する。同じ feature 名／単位でも source pin・model・observer・method・provenance のいずれかが一致しない比較は `NOT_COMPARABLE`。遡及記録は既存証拠の**目録**であり、現時点での実行成功・製品採用ではない。

## QG4 — 成果物、G0 完了条件、B1 P2 と G2 の関係

### G0 で Owner が採用判断する成果物 [H]

| 成果物（docs-only） | v0 完了に必要か | 完了判定／提出物 |
| --- | --- | --- |
| **A. Measurement Contract** | **必須** | 本 QG1 の field dictionary／units／observer plane／source class／failure／provenance／versioning と一致する、凍結 SHA をもつ仕様 |
| **B. Pack schema proposal + feature method manifest** | **必須** | 本文例を含む、**提案であって現行 runtime schema ではない** data dictionary、compatibility table、feature の計算定義・版・無効規則（未検証ならその注記） |
| **C. Retrospective & UNKNOWN ledger template** | **必須** | S5 2件・OD-2 6 case・S3 evidence に実在 anchor を持たせた初期 3区分 matrix／UNKNOWN OPEN 行、事後変更拒否ポリシー |
| **D. Five-factor preregistration template + capability matrix** | **必須** | 5因子の可能／未対応、現行 tract 実験 case/null/mutation、固定4因子と測定・oracle・聴取の境界、関門が記載される |
| **E. G0 adoption decision record** | **必須** | Muse が QG1–QG4・MQ を AGREE/REVISE/REJECT 審査、Owner が採否・**採用範囲と版・commit/hash** を書面で決める。未決は OPEN と明記 |
| **F. 全5因子の新規物理 run・全特徴計測** | **任意／G0 非対象** | 後続の実験 GO が必要。欠落のまま仕様を採用可能 |
| **G. 正本 JSON Schema 配布・UI・物理 renderer 改修** | **G0 対象外** | 新しい実装・別 PR／別 Owner GO。G0 完了判定に含めない |
| **H. 新しい実耳・知覚テスト** | **任意／別関門** | 較正・権利・事前登録・盲検の独立審査なしに物理結果と結合しない |

**G0 完了の論理積 [H]:** `A ∧ B ∧ C ∧ D ∧ E`。ただし B の method 未検証は明示して凍結すること（「既に測れた」を意味させない）。現行 capability で不可能な source/boundary/motion の介入は `BLOCKED_BY_CAPABILITY` と固定し、**不可能性を透明に記録した設計**で完了としてよい。Muse 審査・Owner 採用がなければ `G0 OPEN`。**本回答の提出自体は G0 完了ではない。**

### B1 P2 接続：参照は可能、関門変更は不可 [F→H]

**現行の決定 [F]:** [B1 採用計画 QP4](body-b1-plan-response-20261110.md) および [Issue #54 の P1 正式ピン決定](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54#issuecomment-6767339003) に従う。P1 完了、正式 Core pin `b5dc95d…`、**P2 は独立 Owner GO 待ち**。Owner PC バックアップ再検査はピン移行前の受入前提。**4 revision＋2 null alias の fresh product-path physical baseline、同一性／negative／old-pin 保全**を、G0 の採用・遡及再導出で代替できない。

| P2 固有要件（既存） | G0 測定パックが補助できるもの／**できないこと** |
| --- | --- |
| 新 pin の契約／façade bridge と必要なら v2 判断 | request/body/receipt/pin を比較する**欄**を供給するだけ。`performance-contract/v1` を改変せず、v1 bridge を「既に成功」と認定しない |
| 4 nonnull revision＋2 alias の新規 Core→CC-A2→façade physical path | 6ケース別 pack／原 raw・geometry・source・proxy trace を**新規採取後に**索引できる。Core OD-2 研究の6 WAVを Studio P2 新規証拠と見なさない |
| 同一モデル oracle＋negative／拒否時 no audio | pack の原 SHA／受入方法・mutation を添えられる。**P2 既存の exact-run/shape/同一性 oracle を書換えない** |
| 旧 `b569` Take／archive の read-only 再解釈禁止 | `origin_pin`・`RETROSPECTIVE` により別系列を維持。`b5dc95d` へ更新せず、過去 source の actual-run 証明も追加しない |
| P2 個別 GO と Owner PC バックアップ再検査 | G0 は代替権限を持たない。G0 の契約凍結と P2 GO は論理的に独立 |

**注意 [H]:** P2 の実装時に測定パックを導入するなら、既存 P2 証拠を**削ったり、その成功条件を緩めたり、逆に採用済み P2 へ事後的な追加合否を課さない**。G0 が P2 で未提供の観測（calibrated SPL、ACTUAL_RUN source SHA、完全 5-factor separation）を新しい P2 必須証拠にしてはならない。不可避な契約衝突は別 issue と Owner 判断に戻す。

### BODYMAP G2（B2 受動損失事前登録）への必須と任意 [H]

**G2 への最小必須インターフェース:** (1) G0 A–E 採用、(2) 既存 lossless baseline の Body/source/terminal/`0.20m` の資格と数値誤差を記載できる、(3) `effect.viscothermal_loss` の対象と `rigid-wall` baseline との差だけを事前登録できる、(4) `p,U` と複素 transfer／power/passivity を**将来の新実験で**計る条件・必要単位・参照面・独立 oracle・null/mutation/数値拒否を明記、(5) 実測できない source や校正済み耳圧を UNKNOWN とする、(6) G2 自身の**Owner 別 GO**。B2 に必要な新しい独立計算・周波数誤差・パッシビティ閾値は**結果を見る前に G2 登録時に**凍結する。`rigid-wall` を動的組織モデルへ勝手に昇格させない。

**G2 に不要なもの:** B1 P2/P3/P4 完了を G0 の必須要件へ組み込むこと、source 生理学の自励化、組織弾性・壁コンプライアンス・壁減衰・一般 Material editor、鼻腔／側枝一般化、任意の MotorPersona、実耳／ASMR、ニューラル、聴取の音質 GO、5要因の製品可変化。G2 が既存 Core の研究条件だけで開始できるかは**G2 の事前登録・Owner 判断**で決め、Studio B1 とは別系列のまま保つ。

## 根拠（参照した採用済み資料／現行コード）

- [F] [BODYMAP-R（main）](body-module-map-response-20261111.md) QM1–QM5、[G0 質問票](body-map-g0-questions-20261111.md)。
- [F] [Studio #48 / S3 Owner 処分](https://github.com/ryonakayama234/morphoacoustics-studio/issues/48)、[Studio main `server/v0-facade.mjs`](https://github.com/ryonakayama234/morphoacoustics-studio/blob/main/server/v0-facade.mjs)、[`V0TakeAdapter.ts`](https://github.com/ryonakayama234/morphoacoustics-studio/blob/main/src/performance/V0TakeAdapter.ts)（source再計算とRQ1 strict-B、snapshot、preview gain の区別）。
- [F] [Studio #50 / S5 Owner PC 実測記録](https://github.com/ryonakayama234/morphoacoustics-studio/issues/50#issuecomment-6736075443)、[S2 archive runbook](chr1-s2-take-archive-runbook.md)（BagIt と既存 provenance の区分）。
- [F] [Core OD-2 RESULTS（正式 B1 pin 時点）](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/research/od2-reusable-physical-body-20261102/RESULTS.md)、[P1 closed catalog protocol](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/product/body-b1/P1_CORE_CATALOG_PROTOCOL.md)、[B1 Issue #54 決定履歴](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54)。
- [F] [B1 計画 QP1–QP6（main）](body-b1-plan-response-20261110.md)。過去の提案書内の `pending` 文言より、後日の Issue #54 Owner 決定を優先する。**本回答で新たに物理実行・統計推定・聴取をした事実はない**。

## 監督者 Muse への逆質問（MQ）

以下は本文を未完にする質問ではない。**既定提案と反証条件**を提示するので、Muse は `AGREE / REVISE / REJECT` と根拠、Owner は採否と別 GO を返せる。

**MQ1 — Feature method の `DEFINED_NOT_VALIDATED` を v0 凍結時に許すか。** **推奨 YES**。データ辞書・比較条件を凍結し、値の受入資格は method の synthetic tests／独立レビューまで留保する。反証：未検証でも数字が必須 PASS と表示される構造なら NO（methodをより狭い v0 に削る）。

**MQ2 — S5 Owner PC BagIt の未取得を `REPORTED_ONLY` として遡及台帳の初期値にするか。** **推奨 YES**。S5 完了の受入記録は尊重するが、別プロセスで ZIP bytes を今回再照合したとは表示しない。反証：既に独立取得された完全検証可能な pack-ready artifact が出典ごとに特定される場合、その field だけ `BYTES_VERIFIED` に進める。

**MQ3 — 5要因のうち G0 実行可能比較の代表を「同一 pin・固定条件の限定 tract 実験」とし、observer は gain negative、残り3因子を capability-blocked に保つか。** **推奨 YES**。Core OD-3 の motion や source-free transfer の研究例は参考として別層に残す。反証：既存製品 pin で他因子が独立に介入可能である exact-run receipt と oracle が示された場合は prereg を別版で改める。

**MQ4 — G0 pack を B1 P2 の受入書式へ**追加任意添付**とし、P2 の合否・GO には使わないか。** **推奨 YES**。新しい必須条件にしたい場合は Issue #54 の変更提案と Owner 独立判断が必要。反証：pack 導入により既存 v1 の拒否・source の strict B・旧 pin 保全が破壊される場合は導入を停止。

**最終効力:** **回答・設計処方のみ**。既存証拠の資格は本文に記した限界を超えず、G0 の採用・凍結／次段開始・B1 P2 の GO・Studio／Core の実装・PR マージはすべて別の審査と Owner 決定による。
