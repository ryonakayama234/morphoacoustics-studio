# CHR-R-20261106-02 — Character v0 下限・実装計画（Muse QI1–QI7 への回答）

**状態：ANSWER / DESIGN PLAN ONLY / REVIEW PENDING / NOT IMPLEMENTED / NO UI GO / NO CORE CHANGE / NO QUALITY GO / NO MERGE.**  
回答: ChatGPT（2026-11-06 JST）。宛先: Muse（監督者）・Owner。質問票: [CHR-Q-20261106-02, Studio Draft #39](https://github.com/ryonakayama234/morphoacoustics-studio/pull/39)。追跡: [Studio Issue #38](https://github.com/ryonakayama234/morphoacoustics-studio/issues/38)。本稿は新規 docs-only Draft PR であり、採用済み仕様 [CHR-R-20261106-01](character-v0-response-20261106.md) の **v0 下限だけ**を実装可能な段階へ展開する。**実装、UI変更、Core変更、マージは実行していない。**

## 日本語要約／判定

**最小の完結性を「キャラクターの同一性を失わず、特定の身体・固定演技・固定音源が生み出した物理 Take を将来も照合・持ち出せること」に置く。** 最初にサーバー側の Character/Take 永続化と外部 export を整え、既存 CC-A2（Performance Contract v1）の実行経路を v0 製品用 adapter として厳格に再使用する。UI は最終段階で凍結 ADR の既存スロットに移す。旧 live/X2a/v0 の動作と研究用 CC-B1/WG2 を一括移行・破棄しない。

- **PI1: AGREE WITH BOUNDARY** — 実行 authority は `server/cc-a2-server.mjs`。`live-server.mjs` と v0 `TakeStore` の物理・契約差は消さず、製品 workflow だけを新 adapter に集約する。
- **PI2: AGREE** — Character 正本はローカルサーバー内、ブラウザーは編集途中の非権威 cache だけ。
- **PI3: REVISE ORDER** — export/retention は UI より先。**正式 baseline は完成した v0 UI 導線を通って作る**必要があるので UI 後に採取する（各段階で予備の科学的 smoke は実施）。
- **PI4: AGREE** — S0–S5 を別 PR/別受入記録とし、各 GO は Owner が明示する。計画採用は実装 GO ではない。

証拠に基づく重要な不足: 現行 CC-A2 receipt は `source={id:"lf_fixed",f0_hz:100}` だが、**発声に使った source sample bytes の SHA は発行していない**。WAV は **Take ごとに peak-normalized** であり、等再生ゲインでも絶対振幅/SPL の比較は成立しない。source ID・実行 checkout SHA・演技 SHA と **実サンプル SHA を同義にしてはならない**。不足する証拠は `UNVERIFIED_SOURCE_SAMPLES` として保持し、仕様の完全な因果保証と混同しない。対応の最終要否を RQ1 で Muse/Owner に問う。

### 規範と実体の優先順

1. **採用決定**: [Studio #35 Owner decision](https://github.com/ryonakayama234/morphoacoustics-studio/issues/35) と [PR #37 Owner record](https://github.com/ryonakayama234/morphoacoustics-studio/pull/37)。採用された Character v0 下限は M0/M1、CC-A2 固定三 task、規定 LF100、Take snapshot、A/B。文書冒頭の古い `NOT ADOPTED` は **提出時ヘッダーの歴史的状態**であり採用決定を覆さない。
2. **配置制約**: [STUDIO_WORKSPACE_V2_DECISION.md](STUDIO_WORKSPACE_V2_DECISION.md) は ACCEPTED/FROZEN。ただし UI 実装済みではなく [Draft #33](https://github.com/ryonakayama234/morphoacoustics-studio/pull/33) は未マージ。新 UI の具体的な着手には、なお STOP-AND-PROPOSE の Owner 許可が必要。
3. **実行・研究の現状**: [Studio CC-A2 runbook](../cc-a2-two-body-studio.md)、[Core CC-A2 science](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/cc-a2-two-body-live.md)、[Studio #32](https://github.com/ryonakayama234/morphoacoustics-studio/issues/32) の quality NO-GO。OD-2/OD-3、SMC、WG2、CC-B1、Scene/ASMR を v0 実行に昇格させない。

## QI1 — 対象モジュール／経路の確定

| 創作導線 | 現行ファイル／現状 | v0 下限の処置 | サーバー／証拠 |
| --- | --- | --- | --- |
| Character を選ぶ | [`src/studio/model.ts`](../../src/studio/model.ts) は v0 の draft、[`src/App.tsx`](../../src/App.tsx) は localStorage 編集 | **適応**。サーバー側 Character ID/revision を取得し、draft は未保存編集だけに使う。任意 script/Direction を物理入力とはみなさない | S1 の Character API、S3 の trusted adapter |
| M0/M1 body を確認 | [`src/ccA2/CCAtelier.tsx`](../../src/ccA2/CCAtelier.tsx) の固定 PRESETS | **再利用＋厳格化**。`v3b-axial-M0@1` / `v3b-axial-M1@1` の二択。選択前の ref と Core の実現後 digest を区別 | [`server/cc-a2-server.mjs`](../../server/cc-a2-server.mjs) は Core `b569f044bfda309dff1a00cccf8365754e6b1355` を pin |
| 固定 Performance | CCAtelier の `makeCCRequest` が v1 request、`"あい"`、`seed=0`、空 Direction、固定 requested capabilities を組立てる | **再利用、サーバー主導で凍結**。クライアントが任意の text/energy/pace/source/task を勝手に実行できないよう allowlist。`motion.canvas` には固定 task のみ | Core v1 schema、`cc-a2-axial-live/1` |
| Perform | `POST /cc-a2/perform` は現在独立稼働。`live-server.mjs` は Core SHA `a754187…` の X2a/v0 専用 | **CC-A2 を v0 唯一の physical Perform 経路**とする。新しい Studio-v0 facade は CC-A2 を呼ぶが legacy endpoint を壊さない | S3。v0/v1 validator を無理に共通 `TakeStore` へ cast しない |
| Take 保存・再読込 | [`src/performance/TakeStore.ts`](../../src/performance/TakeStore.ts) の freeze はメモリ上のみ。CC-A2 は `<DATA>/takes/<runId>.json` と content-addressed artifacts を保存 | **追加の immutable provenance envelope と完全性検証**。既存 JSON は書き換えない。受入済み physical Take と拒否結果を区別 | S2。直接の TakeID lookup、restart、全履歴 inventory |
| A/B | [`compareSelection.ts`](../../src/studio/compareSelection.ts) は v0 の UI 選択。CCAtelier は v1 local selection | **選択ロジックを適応**。A/B は2つの別 Take ID、共通物理条件・比較不能条件を明示。A/B 選択は Take を変造しない | S3 の domain model、S4 の take.transport |
| Export | 現行 CCAtelier は個別 WAV/trace リンクのみ | **新設**。WAV＋Take JSON＋原 Core result＋全4物理 artifacts＋manifest をまとめてローカルに download | S2 の ZIP BagIt、S4 の take.transport action |

**実行サーバーの収束判断**: 「**UI/製品 API は S3 で CC-A2 lineage に収束、物理サーバーは統合しない**」を選ぶ。`/cc-a2/perform`・`/cc-a2/takes`・`/cc-a2/artifacts/*` は互換維持。v0 用 API は CC-A2 サービス上の独立 namespace（提案: `/studio/v0/*`）へ、server 内の一つの既存 v1 validated executor を呼び出す。`/live/*` とその旧 Core pin/データルートは S0–S5 を通じて変更せず、旧 v0 mock/fixture UI の振る舞いも S4 以前は不変。S4 の既定表示からの退避は UI 変更 GO に含め、必要な研究者アクセスを維持する。**unification = integration façade、not Core pin migration**。

## QI2 — Character 永続化・同一性

**Authority:** CC-A2 と同じローカルデータ root family（既定 `.morpho-cc-a2-data`、設定 `MORPHO_CC_A2_DATA_DIR`）。ただし物理 Take store と Character mutable head を別 namespace に分離。browser `localStorage` に人物 identity を委ねない。DB/クラウド/他人のアカウント/ログイン機能は設けない。

**提案ディスク形式（この PR は仕様であり実在しない）**:

~~~text
<CC_A2_DATA>/
  characters/<character_id>/head.json          # 唯一の mutable pointer、CAS 更新
  characters/<character_id>/revisions/000001.json  # immutable full snapshots
  characters/<character_id>/revisions/000002.json
  takes/<runId>.json                            # 既存 CC-A2 原本：変更しない
  v0-takes/<take_id>.json                       # 新規の immutable provenance envelope
  artifacts/<sha256>.<ext>                      # 既存原本を再利用
  quarantine/                                   # 異常検知時の隔離 log、削除ではない
~~~

`head.json` は `record_schema=studio-character-store/v0`、`character_id`（opaque UUID/衝突防止）、`current_revision`、その revision snapshot の SHA-256、`updated_at` のみを保持し、`revisions/*.json` が表示名、description、既存 v0 CharacterSpec の defaults、`created_at`、revision、`active_body_ref`、`active_motion_ref`、`source_profile_ref`、Core capability scope と創作 metadata を保持する。`take_refs` は immutable Take から求める読み取り専用インデックス（故障時 rebuild 可）であり、キャラクターの可変 revision に Take の正本を埋め込まない。`character_id` を rename/body change で再発行しない。

**ref の一つの型語彙（選択時/確定時を分離）**:

~~~json
{
  "kind": "core_body_preset",
  "preset_id": "v3b-axial-M0",
  "preset_revision": 1,
  "producer_repo": "ryonakayama234/morphoacoustics",
  "core_commit": "b569f044bfda309dff1a00cccf8365754e6b1355",
  "backend_id": "cc-a2-axial-live/1",
  "binding_state": "SELECTED_UNRESOLVED"
}
~~~

M1 は `preset_id=v3b-axial-M1` のみ異なる。**選択だけでは Core の preparation_digest は得られない。** v1 `result.embodiment.status=BOUND` かつ request/receipt/body が一致した時だけ、Take 側へ `preparation_digest` と `body_receipt_ref` を添えた同じ `kind` の `VERIFIED_BOUND` ref を凍結する。この区別は [`server/cc-a2-server.mjs::assertCausalResult`](../../server/cc-a2-server.mjs) の現行 trust boundary と整合する。Studio 独自の BodyRevision を発行しない。

**rev と更新:** display name やデフォルト ref を変更するたび新 snapshot（単調増加 revision）；head は `If-Match` 相当の expected revision で compare-and-swap、同時更新衝突は `409 CONFLICT`。フリーズ済み Take は creator revision、v0 CharacterSpec snapshot、実行時 body/motion/source を保持し、現在の Character head に自動追従させない。physical request を組む瞬間の snapshot が同じ ID/revision と一致しなければ拒否。JSON の schema_version は既存 Performance Contract v0/v1 を名乗らず別 envelope とする。

**既存 draft の扱い:** **coexistence + explicit one-time import only**。`src/studio/model.ts` と `App.tsx` の `morphoacoustics-studio:s2-workspace:v1` をそのまま残す。既存 default `char_mio` は世界で一意なサーバー character_id とみなさない。ユーザーが明示的に import し、ID 衝突・既存 revision・破損を検査した場合だけ新規 server Character を作る（default は新 UUID、新旧対応表を receipt に記録）。Take の旧 ID を勝手に結び直したり、ブラウザデータをサーバーの同一人物として上書きしない。

**永続書込みの下限:** server の単一 writer gate、入力サイズ・パス・schema 検証、同一 filesystem 内に一時ファイル作成→flush/sync→rename、immutable revision/Take 原本は no-overwrite `wx`、head の楽観ロック、起動時走査・digest 再確認・未完了書込みからの復旧。電源喪失と手作業削除への絶対的保証はできないので、外部バックアップ/export を別責務として必須にする。[Node fs documentation](https://nodejs.org/api/fs.html) の非同期書込み・flush 論点を踏まえ、atomic rename と **durability は別に**試験する。

## QI3 — Take 保持／外部 export（実装できる粒度）

**原則:** immutable = クライアントの `Object.freeze` ではない。保存された original request/result、Core 元 result、物理 bytes の SHA-256 が再読込でき、missing/corrupt を成功に見せないこと。全 Take を消失不能とは断言しない；外部への検証済み export と二重保存を運用上の実現可能な対策とする。

**新 `v0-takes/<take_id>.json` の最低フィールド:** `record_schema`、`take_id`、`created_at`、`character_id` / `character_revision` / immutable Character snapshot hash、`request_snapshot` とその digest+algorithm、Core v1 の `frozen_core_result`（原文と区別）、保存済み `PerformanceResult/v1`、typed `exact_body_ref`/Core receipt/preparation digest、`motion_ref` と Core receipt の `task_plan_sha256`、`source_profile_ref`（fixed `lf_fixed`, F0=100, pinned producer）、`source_definition_sha256`（存在する場合、その意味と hash 対象）、`source_samples_sha256`（現状は **null / UNVERIFIED_SOURCE_SAMPLES**）、`solver_ref`、Core full SHA、Studio git SHA、adapter version、NumPy 2.4.6、seed、clock 48k、0.5s、観測面・boundary/load の **実証済み値のみ**、raw Pa NPY / physical trace / receipt / WAV の path+hash+bytes+media type、`playback_gain_policy`、`job_status`、`realization_outcome`、diagnostics、capability/identity claim limit。値が receipt にない場合は `unknown` を保存し推定で埋めない。`integrity_state` は読み込み時に計算する投影値とし原本を改訂しない。

**source SHA の未解決境界:** 現行 [Core `tools/cc_a2_live.py` @ frozen SHA](https://github.com/ryonakayama234/morphoacoustics/blob/b569f044bfda309dff1a00cccf8365754e6b1355/tools/cc_a2_live.py) は source 生成結果を内部で使い、receipt には `lf_fixed` と F0 のみを出す。既存 pinned code/definition の hash と、**その実行で使った正味の sampled flow** hash は異なる。Studio の read-only 監査で同一 pinned deterministic generator から再構築した source sample hash を記録する案は、あくまで **recomputed** の証拠であり Core-emitted ground truth と称してはならない。最終 VERIFIED SOURCE ゲートを要求するなら Core の将来独立 gate が必要になる可能性を RQ1 として明示し、本ラウンドでは Core を編集しない。

**export フォーマット（提案）:** `take-<take_id>.bag.zip` — ひとつの ZIP 内に BagIt v1.0 のファイル構造を保持。受け取った人はアプリなしで WAV を取り出せる。SHA-256 manifest の payload 全件照合が必要。既存 content-addressed 原本を **bytes を変更せず**含め、古い URL と ZIP 内相対ファイルの対応を別 JSON に置く。ZIP は stored bytes/no audio transcoding; export 時も原本を一切更新しない。

~~~text
take-<take_id>.bag.zip
  bagit.txt
  bag-info.txt
  manifest-sha256.txt
  tagmanifest-sha256.txt
  data/take.json                 # immutable envelope
  data/character-revision.json   # exact creative snapshot
  data/performance-request.json
  data/core-result.json          # original Core output
  data/stored-result.json        # application ref rewrite preserved
  data/portable-ref-map.json
  data/artifacts/<sha256>.wav
  data/artifacts/<sha256>.npy
  data/artifacts/<sha256>.csv
  data/artifacts/<sha256>.json   # physical receipt
~~~

Core が拒否した Take は **`refusal-only` export** とし、存在しない WAV を生成したふりをせず、BagIt の contents/claim で明記。成功した FEASIBLE physical Take には上記四 artifacts の完全在庫が必須。bundle は UTF-8、安全な固定パスの allowlist、ファイルサイズ上限、ZIP streaming、相対パス・symlink・`../` 排除、ダウンロード失敗で未完了 ZIP を成功扱いしない。パス入力を TakeID として安全に検証。export 前/後に SHA 再計算し不一致なら **fail-closed**。HTTP localhost origin restriction/no-store を継承。archive import は v0 非対象（将来追加時に Zip Slip/symlink 検証）。[RFC 8493 BagIt](https://www.rfc-editor.org/rfc/rfc8493.html) は fixity/運搬の根拠であり、攻撃者に対する署名や永続保存そのものの保証ではない。[RO-Crate 1.2](https://www.researchobject.org/ro-crate/specification/1.2/introduction.html) の豊富な研究 metadata は将来拡張候補で、v0 に必須依存させない。

**閲覧時の状態:** `AVAILABLE_VERIFIED` / `MISSING_ARTIFACT` / `CORRUPT_ARTIFACT` / `UNVERIFIED_LEGACY` / `INCOMPLETE_PROVENANCE` / `REFUSAL_NO_AUDIO`。物理 WAV が missing/corrupt なら再生・A/B の可用性を明示して停止し、欠落 SHA と復旧手順を表示。Take の metadata は表示・export 可能な限り維持し、履歴から黙って消さない。再計算による同 ID の補填、別 body/source への自動置換は **禁止**。復旧は既知の export/backup の一致する SHA を手動検証して別オペレーションで行う。既存 `newestPhysicalTakes` は固定 Core SHA ＋最新100件を返すため、**UI の最近一覧 ≠ 保管された全証拠**。新 export/lookup は TakeID により全 inventory を走査し、旧 pin も read-only 表示・`UNVERIFIED_LEGACY` 付きで保護する。

**A/B policy:** 新しい追加 DSP/EQ/normalization 禁止、プレイヤーの同一ゲインを維持。既存 CC-A2 WAV は **各々 peak-normalized**（[Core receipt の `playback_peak_normalization`](https://github.com/ryonakayama234/morphoacoustics/blob/b569f044bfda309dff1a00cccf8365754e6b1355/tools/cc_a2_live.py)）。よって等ゲイン再生だけでは raw pressure の音圧比・SPL は比較できない。v0 A/B は同じ source/task/seed/observer/proxy 証拠の下で *音色・聴感* を比較し、強さに関する物理量は raw NPY 上でのみ別途検証（校正済み耳/距離の SPL と言わない）。`pair_group_id` と A/B 現在選択は別の user selection 記録であり、immutable Take の過去は書き換えない。

## QI4 — 凍結 ADR スロット内の UI 移行（**別の明示的 UI GO 待ち**）

| 凍結 slot | v0 完了時の役割と元画面の扱い |
| --- | --- |
| `global.header` | プロジェクト ID、Character/Motion/Scene mode、明示的限定状態。新 backend dropdown は設けない |
| `project.library` | Character と BodyPreset ref、TakeID への参照だけ（物理データの複製なし） |
| `character.canvas` | Character 選択・現在の M0/M1 body 確認。1D axial preset の正直な schematic のみ。偽の器官グラフ編集なし |
| `motion.canvas` | 固定 `"あい"相当` 実験演技を read-only 条件として明示＋Perform。自由 Script/Direction は **creative draft としてのみ**残し、実行可能と誤認させない。CC-A2 の旧 Compare パネルを増殖させず共通 editor に統合 |
| `scene.canvas` | 既存モードの非実行 scaffold のみ。scene audio/ASMR は実装しない |
| `selection.inspector` | 選択 Character の ID/revision、M0/M1 preset と verified digest（あれば）、motion/SourceProfile `lf_fixed/100Hz`、capability/unsupported 状態。source/effort/pitch/OD-2 sliders なし |
| `take.transport` | 永続 Take list/selection、A/B、playback、export、missing/verified badge。現在縦積みの Take history + Compare は **ここに吸収** |
| `research.drawer` | 元 Take Comparison の provenance、dynamic trace、raw pressure refs、receipt、Core SHA、SHA 検証異常、実験注記。既定は閉じる |

旧 `src/App.tsx` の Character は編集機能を Character mode+inspector に適応。Script/Direction は Motion の創作素材として残すが fixed performance を変更しない。旧 Perform は Motion の単一 action に、Take history/Compare は take.transport に移る。旧 CC-A2 折畳み入口は v0 の通常導線になって廃止。CC-B1 の私的研究機能／旧 live-X2a の実際の動作は変更しない。研究者アクセスの保持方法は既存 slot（例: `research.drawer` 内の legacy reference/link）に限定し、新たな panel/mode/backend は加えない。**WG2 は現行 `App.tsx` に独立した専用折畳みセクションとして確認できず、質問票 §1 の「WG2 entrance」表現は現行 main の記述として不正確**（Draft #31 の別 lineage と区別する）。

[Draft #33](https://github.com/ryonakayama234/morphoacoustics-studio/pull/33) のデザインは参考だが未マージであり、記録された tablet overflow・inert body selector・ARIA tab semantics の既存 P2 問題をそのまま再利用してはならない。S4 は Owner の **個別 STOP-AND-PROPOSE UI GO** を受け、desktop/mobile レイアウト、キーボード、screen reader、実行不可 state、legacy reachability の acceptance を明示する。

## QI5 — 独立して審査・マージ可能な段階（**本 PR 自体はマージしない**）

以下の各 S は **別実装 PR**、個別 Owner GO、個別 reviewer audit、exact HEAD の受入記録。先行 S の採用前に後続のコード着手を承認済みと解釈しない。全ステップで既存 `npm test` / `npm run test:bridge` / `npm run build`、`node --test server/cc-a2-server.policy.mjs` を保持し、CC-A2 physical CI（`.github/workflows/cc-a2-live.yml` の `server/cc-a2-smoke.mjs` と Chromium `server/cc-a2-browser-smoke.mjs`）、legacy X2a CI（`.github/workflows/live-x2a.yml`）、CC-B1 private regression を **該当する pinned dependencies で**再確認する。実行に必要な Core は変更せず既存 SHA を checkout。CI の path filter で走らない suite は手動・workflow_dispatch・記録で補う。WG2 は unmerged HOLD のため main への取り込みで「試験」しない。

| Step | 目的と予定ファイル | 非目標 | 追加の受入条件／維持する試験 | Owner 判断 |
| --- | --- | --- | --- | --- |
| **S0 inventory / backup gate** | 既存 data root・全 take/artifact ID/hash と schema/pin を棚卸し。`docs/product/chr1-preflight-*.md`、read-only audit/test | 古い Take 再同定、勝手な migration、実装 GO | 既存一式 PASS。旧 data dirs の read-only SHA inventory、別保存先のバックアップ、起動再読込/旧 v0-v1 拒否チェック、現役 Core SHA を固定。欠落は UNKNOWN 明記 | **YES: 保存先/退避方針** |
| **S1 Character store** | `server/character-store.mjs`、`server/character-store.policy.mjs`、`server/cc-a2-server.mjs`（独立 API）、`src/studio/model.ts` は互換維持 | UI、Take rewriter、body editor、Core schema fork | 新 ID/revision 連番・rename・body switch・CAS 409・process restart・corrupt/missing/head mismatch・二重作成の負試験。旧 `App`/CC-A2 untouched | **YES: S1 GO** |
| **S2 Take archive/export** | `server/take-archive.mjs`、`server/take-archive.policy.mjs`、`server/cc-a2-server.mjs`、必要な ZIP library lock。すでに保存済み CC-A2 原本は不変 | 音質修正、Core 計算、UI、cloud、旧履歴上書き | 完全 ZIP BagIt validate→外部 copy→再検証、raw/WAV/receipt 全 SHA、欠落・tamper・symlink・path traversal・同ID retry・restart・crash interrupted write・>100件・旧 pin の負試験。既存 smoke PASS | **YES: S2 GO、export/backup policy** |
| **S3 v0 facade / perform binding** | `server/cc-a2-server.mjs` に `/studio/v0/*`、提案 `src/studio/characterApi.ts`・`src/performance/V0TakeAdapter.ts`、追加 tests | legacy v0→v1 無理な置換、新 backend、source control、CC-B1/WG2 | frozen server Character rev→許可 M0/M1→固定3-task/source/seed→real Core v1→v0 envelope。body mismatch、未対応文字/Direction、replay duplicate、Core pin drift、refusal/no WAV、source provenance state の陰性対照。real 2-body smoke + legacy regression PASS | **YES: S3 GO、source gate RQ1 disposition** |
| **S4 UI within frozen slots** | `src/App.tsx`、`src/app.css`、`src/ccA2/CCAtelier.tsx`（共通UIへ移行）、提案 `src/workspace/*`、UI/ARIA tests、`vite.config.ts` は必要時のみ | 新パネル、3D/OD-2/OD-3、SMC、source knob、audio DSP、別 research backend option | 既存7 slot・3 mode、canvas replace、keyboard+ARIA、inert controls 無し、desktop/tablet/mobile screenshots、Character→fixed Perform→Take A/B→ZIP export、reload/restart、legacy research access、missing artifacts shown。CC-A2 Chromium と全 CI PASS | **YES: 独立の STOP-AND-PROPOSE UI GO** |
| **S5 fresh M0/M1 baseline** | `docs/evidence/chr1-character-v0-baseline-20261106-or-later.md` と外部保存済み2個の検証可能 bundle hash、E2E receipt | WG2 lost UUID の retro-attribution、自然な声・品質 GO、実験源の変更 | **完成 UI から** M0/M1 fresh execution、each export verified independent storage、request/result/task/source/code/raw/WAV SHA と pair control 署名表、A/B 可、app restart、backup から復元テスト、Owner が目で確認できる記録。失敗なら baseline を PENDING | **YES: capture/publish decision** |

**S0 での保管原則:** Studio #32 の失われた2 UUID は **永久に evidence UNKNOWN**。削除済み WAV を作り直して同じ UUID にしない。旧 dataset をバックアップせず writer を切り替えることは STOP。個別 physical CI の PASS は S4 UX/品質 GO ではない。

## QI6 — 新 baseline 文書と主張可能範囲

**格納先:** 新規 `docs/evidence/chr1-character-v0-baseline-<capture-date>.md`（ファイル名と実採取日を一致させる）。Git に **metadata, hashes, reproducible command/checkout only** を残し、WAV/NPY/ZIP 原本は作業ディレクトリ外の Owner 管理 export store に保存（公開/配布は別決定）。GitHub Actions artifact は期限があるため唯一の保管先としない。

**2件とも記録:** UTC/JST 実行日時、Take ID、CharacterID+creative revision/snapshot SHA、request ID+body selected ref、実行後 `preparation_digest`/body receipt SHA、固定 task ID/`task_plan_sha256`、source ID/F0/source definition hash と source samples status（未確認なら UNKNOWN）、Core exact SHA `b569f044…`、Studio exact SHA、adapter/NumPy、seed=0、48000 Hz/0.5s、observer/boundary の証拠、raw NPY SHA+quantized pressure SHA、trace SHA、receipt SHA、WAV SHA、peak normalization、file sizes、export ZIP SHA、BagIt manifest verification、保管場所の非秘密識別子、A/B same/different field matrix、refusal/diagnostic/warning、監督者 review と Owner decision status。**実数 SHA や TakeID は未来の capture が終わるまで創作しない。**

| Claim / hypothesis | baseline でできる判定 | baseline で主張できないこと |
| --- | --- | --- |
| H-ID: 同じ `character_id` でも M0/M1 body snapshot は異なる | ID/revision と physical receipt digest の比較 | 実在の人物同定、MotorPersona |
| H-BODY: fixed task+LF100 条件で axial length が 0.160→0.176m | Core original receipt、source/task 同一性、M0/M1 physical spectra/raw pressure 差 | 同定された日本語母音、実人声に近づいた、口径以上の自由身体編集 |
| H-TAKE: 後日同じ TakeID の根拠を再読込・持出しできる | restart、独立 store の ZIP BagIt SHA verification、missing artifact refusal | 二次バックアップも消された状況での絶対復元 |
| H-AB: 制約を明示した A/B で身体差を試聴可能 | 2 Take、共通タスク、音量の留意表示、playability | peak-normalized WAV を絶対音圧/SPL/声量比較とみなすこと |
| H-QUALITY: 以前の WG2 creator rejection より改善 | **この baseline だけでは判定不能**（旧実 artifact 欠損、条件不一致） | 品質 GO、自然音声、女性声、ASMR、旧2 UUID の M0/M1 対応 |

## QI7 — リスク／除外／事実訂正

**主要リスクと停止条件**: (a) browser-only identity の再発 → server authority + export + recovery drill、(b) file-format lock-in → 明示 record_schema と read-only old version、(c) 破壊的 migration → 旧 store を隔離/非改変、(d) body ref が preset selection と verified preparation を混同 → state を分け、receipt 不一致拒否、(e) 旧 v0と v1 の schema coercion → adapter で区別、(f) 100件 limit/固定 SHA で過去が見えなくなる → full inventory 直指定 lookup、(g) source bytes SHA の証拠不足 → unknown を明示、(h) per-Take peak normalization を SPL と誤読 → fixed player gain＋比較範囲ラベル、(i) 凍結 ADR の panel 拡張/仮機能誇張 → Owner の別 UI GO、(j) OD-2/SMC/CC-B1/WG2 混入 → allowlist と test deny、(k) ディスク消去・ZIP corruption → 外部複製の検証運用。**保存も評価も失敗を隠さず STOP。**

**明示除外**: Core code/physics/PR pinsの更新、CC-B1 / WG2 の実行挙動、Core OD-2 revision UI、OD-3 G0/G1、SMC compiler、自由 text TTS、Pitch/Effort/Source editing、speaker quality、Scene rendering、ASMR、出力後処理、cloud、auto-merge。UI 内容も本稿では実装しない。

**質問票 §0–1 との精密化**: `App.tsx` に「独立した WG2 入口」が現存する、という記述は current main では確認できず CC-B1/CC-A2 の入口が確認できる。`TakeStore.ts` の `deepFreeze` はメモリ中であって永続化の証拠ではない。CC-A2 は server-side `takes/<runId>.json`（ファイル名が take_id ではない）で、その最新100件の列挙は古い/異なる Core pin を表示しない。CC-A2 source sample SHA は receipt に absent、WAVは per-Take peak-normalized。履歴上の `CHR-R-20261106-01` 原稿ヘッダーは提案当時の status だが Owner の後続採用コメントが正本。これらを都合よく丸めない。

## Muse / Owner への逆質問票（3件、回答依頼）

**RQ1 / 実サンプル SHA の要求水準（技術的ゲート）:** CC-A2 既存 Core receipt は source `lf_fixed` と F0=100 を記録するが源波形サンプル SHA を emit しない。v0 baseline の「exact source」は **(A) pin された Core generator 定義/ID と再計算 sample SHA（`recomputed` と明記）で限定受入**、それとも **(B) actual-run sample bytes の Core-emitted hash が得られるまで full VERIFIED SOURCE を保留** のどちらとするか。**推薦 B を厳密版とし、Core 無変更の本計画では欠測を UNKNOWN のまま S1/S2/S4 まで進め、baseline 完全採用は RQ1 の GO に従う。** Core に要求を出す場合も本 PR では変更しない。

**RQ2 / UI STOP-AND-PROPOSE の個別 GO:** S4 で Draft #33 を直接マージせず、ADR の固定 slot に既存導線を再配置し、旧 CC-A2 折畳み入口を退役させ、legacy CC-B1/X2a の研究アクセスを保全する方針に **原則 AGREE** か。**推薦 AGREE。ただしこの回答は UI 作業許可ではなく、実際の S4 着手時に独立 Owner GO を再取得する。**

**RQ3 / バックアップとベースラインの管理権限:** 正本を localhost データ root、外部 ZIP を Owner の別ストレージへ二重保持、Git には manifest/取扱方法/ハッシュのみ（音声・物理実バイナリはデフォルト非公開）とし、S0 のバックアップ確認と S5 の export 実在確認を Owner 受入項目にする方針に **AGREE** か。別の retention/公開要件があるなら exact policy を提示してほしい。

**Muse に依頼する審査形式:** QI1–QI7 と PI1–PI4 それぞれ `AGREE / REVISE / DISAGREE` を提示し、REVISE はファイル/セクション単位の置換案と根拠、上記 RQ1–RQ3 は選択・条件を回答する。Owner が設計採用を最終決定する。**回答未着の段階で合意済みとは主張しない。**

## 参照した現行コード・専門基準

- [Studio README](../../README.md)、[Character adopted specification](character-v0-response-20261106.md)、[frozen workspace ADR](STUDIO_WORKSPACE_V2_DECISION.md)、[Issue #32](https://github.com/ryonakayama234/morphoacoustics-studio/issues/32)、[Issue #35](https://github.com/ryonakayama234/morphoacoustics-studio/issues/35)、[Issue #38](https://github.com/ryonakayama234/morphoacoustics-studio/issues/38)、[Muse PR #39](https://github.com/ryonakayama234/morphoacoustics-studio/pull/39)。
- [Studio App](../../src/App.tsx)、[Studio draft](../../src/studio/model.ts)、[TakeStore](../../src/performance/TakeStore.ts)、[A/B selection](../../src/studio/compareSelection.ts)、[CCAtelier](../../src/ccA2/CCAtelier.tsx)、[CC-A2 server](../../server/cc-a2-server.mjs)、[live server](../../server/live-server.mjs)、[Vite proxy](../../vite.config.ts)、[CC-A2 runbook](../cc-a2-two-body-studio.md)。
- [CC-A2 policy](../../server/cc-a2-server.policy.mjs)、[CC-A2 E2E](../../server/cc-a2-smoke.mjs)、[Chromium smoke](../../server/cc-a2-browser-smoke.mjs)、[CI](../../.github/workflows/ci.yml)、[physical workflow](../../.github/workflows/cc-a2-live.yml)、[legacy workflow](../../.github/workflows/live-x2a.yml)。
- [Core CC-A2 frozen runner](https://github.com/ryonakayama234/morphoacoustics/blob/b569f044bfda309dff1a00cccf8365754e6b1355/tools/cc_a2_live.py)、[Core CC-A2 research](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/research/cc-a2-two-body-live.md)、[Core Performance Contract](https://github.com/ryonakayama234/morphoacoustics/blob/main/docs/performance-contract-v0.md)。
- 専門基準: [RFC 8493 / BagIt](https://www.rfc-editor.org/rfc/rfc8493.html)（fixity vs durability/authenticity の分離）、[RO-Crate 1.2](https://www.researchobject.org/ro-crate/specification/1.2/introduction.html)（研究 provenance の拡張可能性）、[Node.js fs](https://nodejs.org/api/fs.html)（非同期書込み・flush）、[OWASP archive traversal](https://owasp.org/www-community/attacks/Path_Traversal)（ZIP パス境界）。この参照は設計 rationale であり Studio の実装・性能を実証しない。

---

**FINAL STATUS: ANSWER SUBMITTED FOR MUSE REVIEW / OWNER DECISION PENDING / DOCS-ONLY / NO NEW IMPLEMENTATION / NO UI OR CORE CHANGE / NO MERGE.**
