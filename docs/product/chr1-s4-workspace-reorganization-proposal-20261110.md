# CHR-1 S4 — Workspace 画面再編提案（STOP-AND-PROPOSE）

**Status: PROPOSAL ONLY / MUSE REVIEW PENDING / OWNER IMPLEMENTATION GO PENDING / NO UI CHANGE / NO MERGE / NO QUALITY GO.**  
**Authority:** [S4 Issue #51](https://github.com/ryonakayama234/morphoacoustics-studio/issues/51)（Owner UI GO は「提案」まで、2026-11-10）。  
**Normative:** [frozen Workspace V2 ADR](STUDIO_WORKSPACE_V2_DECISION.md)、採用済み [CHR-R-20261106-02 QI4/QI5-S4](character-v0-implementation-plan-20261106.md)、[Character v0](character-v0-response-20261106.md)。  
**Existing implemented prerequisites:** S1 [#44](https://github.com/ryonakayama234/morphoacoustics-studio/issues/44) / S2 [#46](https://github.com/ryonakayama234/morphoacoustics-studio/issues/46) / S3 [#48](https://github.com/ryonakayama234/morphoacoustics-studio/issues/48)。S5 [#50 completion record](https://github.com/ryonakayama234/morphoacoustics-studio/issues/50#issuecomment-6736075443) は UI 前に限定ベースラインとして完了。**この文書は設計図であり、画面・ブラウザ・物理実行を変更／検証したものではない。**

## 0. 提案の結論と不変条件

製品の主経路を「**サーバ Character の選択と revision 保存 → 固定演技を一度実行 → 不変 v0 Take の試聴・A/B・BagIt ZIP 書き出し**」に一本化する。ただしそれは**画面上の接続**であり、旧 Performance/v0 と CC-A2/v1 を同じ store/schema と見なす統合ではない。新しい器官グラフエディタ、Script-to-speech、backend、パネルは作らない。

- モードは Character / Motion / Scene の**ちょうど3つ**。中央 canvas は常に1つだけで、モード変更は置換。Scene は非実行 scaffold。Character は M0/M1 の既存 axial preset を「選択・確認」するだけで、器官の自由編集を模した図は置かない。
- ADR の固定 slot のみを使う。`project.library` は参照、`selection.inspector` は選択対象の**既に許可された**項目、`take.transport` は不変 Take の再生・比較・書出し、`research.drawer` は evidence/legacy research の入口。モード・選択・再生位置以外の UI 独自 physics authority は作らない。
- `POST /studio/v0/perform` に渡せるのは、サーバが保存した Character の **current immutable revision + snapshot SHA** を確定した submission のみ。固定 `あい`、Direction 空、seed 0、M0/M1、LF `lf_fixed` / 100 Hz、既存 Core pin・既存3 task のまま。`SELECTED_UNRESOLVED` を「Core が検証済み」と描かない。
- v0 の `studio-v0-take-envelope/v0` を旧 `PerformanceResultV0` / `TakeStore` にキャストしない。Take の内容・ID・SHA・旧 pin を書き換えない。`INCOMPLETE_PROVENANCE` / source `UNKNOWN` と `RECOMPUTED` を区別し、UI から VERIFIED SOURCE を生成しない。
- 新 UI が許可されるのは後日の**別 Owner 実装 GO 後だけ**。Draft #33 はビジュアル参考であり未マージ。既知 P2（tablet overflow・inert selector・ARIA tabs）をコピーしない。Studio #32 の品質 HOLD は不変。

## 1. 画面スケッチ（配置案であり実装済みの描画ではない）

### Desktop / tablet 横幅に余裕があるとき

~~~text
┌────────────────────────────────────────────────────────────────────────────┐
│ global.header   Project / Character  Motion  Scene   [限定 v0] [研究]         │
├───────────────┬─────────────────────────────────┬──────────────────────────┤
│project.library│       ONE ACTIVE CANVAS         │ selection.inspector      │
│Characters     │ Character: selected rev + body  │ name / description       │
│  M0 / M1 refs │    [Save revision]              │ permitted M0/M1 ref      │
│Take refs      │       OR                        │ read-only source/status  │
│ (links only)  │ Motion: fixed 「あい」           │ 409/revision feedback    │
│               │     [Perform fixed task]        │                          │
│               │       OR                        │                          │
│               │ Scene: v0 非操作 scaffold       │                          │
├───────────────┴─────────────────────────────────┴──────────────────────────┤
│ take.transport  [selected Take ▷] [A][B] [play] [state] [BagIt ZIP export]   │
│                 [A/B distinct IDs + shared gain + peak-normalized warning] │
└────────────────────────────────────────────────────────────────────────────┘
 research.drawer (closed by default): provenance / hashes / receipt / trace /
 integrity issues / old research harness entry
~~~

`take.transport` は既存 Take history と Compare を**一つの常設下部ドック内へ移し拡大**したもの。別の Compare panel を下へ増設しない。「拡大」は dock 内の選択中 Take 行・再生・A/B・書出しを可読にする意味であり、新 slot ではない。詳細ハッシュをドックに詰めず research.drawer に分離する。

### 320–390px を含む mobile-first

~~~text
global.header: project / three-mode navigation (keyboard-readable)
project.library: within-slot summary/selection, collapsible and reachable
ONE canvas: Character OR Motion OR Scene, one column, no horizontal clip
selection.inspector: within-slot collapsible contextual controls/status
take.transport: always reachable bottom compact bar
                expand *within same dock*: A/B selection / playback / ZIP
research.drawer: closed; explicit access to receipt and legacy links
~~~

モバイルでも **transport の主要操作をページ末尾までスクロールしなければ届かない**設計に戻さない。小 viewport では常時見える compact 操作＋同じ dock の展開状態を想定。端末ソフトキーボード・safe-area・スクリーンリーダーで canvas/保存ボタンを覆わない。library / inspector の折畳みは既存 slot の表示形式で、追加 panel や「4番目のモード」ではない。

## 2. Slot-by-slot 責務・データの出どころ

| Frozen slot | v0 の内容 / 動作 | 避けるもの |
| --- | --- | --- |
| `global.header` | project identity、Character / Motion / Scene 切替、明確な「v0 固定演技・限定来歴」表示、research drawer 起動 | backend 選択、新しい mode、研究 solver knobs |
| `project.library` | `GET /characters` の server Character 要約（名前、ID、head revision、選択中）、M0/M1 BodyPreset **reference**、既知 TakeID reference の選択 / ID 検索入口 | Character snapshot / physical Take の UI 側コピーを正本化、全件 Take 履歴があるとの虚偽表示 |
| `character.canvas` | 選択中の保存済み Character ID / revision / snapshot SHA、M0/M1 axial preset の限定 schematic、保存前後 diff と「revision 保存」 | editable OrganGraph や anatomy/OD-2/OD-3 を偽装 |
| `motion.canvas` | 「あい」（固定1区間）、固定三 task・seed 0・Direction なし・source LF100 の read-only 条件、単一 Perform、結果 ID と dock への焦点移動 | Script/Direction の自由 draft を物理実行可能と見せる、source/effort/pitch/速度編集 |
| `scene.canvas` | 将来の Scene 位置を示す非実行 scaffold / v0 対象外表示 | Speaker/Listener 接触・歩容・ASMR・scene physics の操作ボタン |
| `selection.inspector` | Character 選択時: 名前・説明・M0/M1 preset ref の許可編集、revision・保存結果・CAS 409。Motion/Take 選択時: 確定条件・選択 ref / 状態を**read-only**で表示。source `lf_fixed/100Hz`、`SELECTED_UNRESOLVED` の正確な表示 | unsupported controls、`VERIFIED_BOUND` の公開操作、重複した Character 正本 |
| `take.transport` | v0 envelope が指す**実 WAV artifact** の再生、別 TakeID の A/B、同一 player gain と peak-normalized 注意書き、`GET /cc-a2/takes/:id` に基づく状態と `/archive` の BagIt ZIP 書き出し | solver controls、巨大 JSON/trace 壁、WAV の同一 ID 再生成、旧 `TakeStore` 混在 |
| `research.drawer` | 必要時だけ開く hash / source evidence / Core receipt / physical trace / archive issues / refusal details、明示ラベル付き legacy research 入口 | デフォルトの縦積み実験カード、物理的に未証明の「検証済み」バッジ |

Character/Motion/Scene の canvas は **共通中央領域の相互排他的な姿**であり、3枚の並列 panel ではない。Character の editable 項目（名前・説明・M0/M1）は同一 Character store API の snapshot 更新として扱う。`default_controls`、`active_motion_ref` 等、保存スキーマに字段が存在しても v0 で実行可能な物理 knob とは認めない。source ref は read-only。

## 3. 操作シナリオと状態遷移（必須導線）

1. **Character を選ぶ / 新規保存:** library の server 要約から選択、または新規 Character 作成。`GET /characters/:id` で head と snapshot SHA を照合。名前・説明・M0/M1 preset の許可変更はローカル未保存状態として示し、明示的な「保存」で `POST /characters` または `PATCH /characters/:id`（`expected_revision`）を実行。保存済み revision と未保存の草稿を視覚的に区別する。`409 CONFLICT` 時は勝手に merge / overwrite せず再取得・差分確認・本人の再操作を求める。Character 保存と Perform は別 action。
2. **固定演技へ進む:** Motion に mode 置換。読み取り専用 `あい` / 3 task / Direction 空 / seed 0 / LF100 を提示し、同じ Character の **現 head ID/revision/snapshot SHA** を改めて読み、body と一致することを示す。保存前編集・head 移動・body mismatch・unbound required reference・Core pin drift は明示拒否。submission ID はユーザーの1回の Perform 意思に対し1個だけ発行し、timeout で同 ID を再送したり新 ID に黙って replay しない（S3 durable replay guard）。
3. **実行結果を dock に接続:** `POST /studio/v0/perform` の結果 TakeID を取得したら、`GET /studio/v0/takes/:id` の envelope を `V0TakeAdapter` として読取り、必要時 `GET /cc-a2/takes/:id` で archive integrity を照合。成功の時は Take を選択し dock に再生 action を見せる。`FEASIBLE` ではない拒否結果は no-audio の Take として記録・表示する。サーバ拒否/失敗では WAV をでっち上げない。
4. **A/B と聴取:** A・B は**異なる immutable TakeID** の2枠。選択をもう一度押すと解除可。両方再生可能な場合のみ A/B が有効。相互に同一 task/source/seed/observer かを読み取り可能な範囲で示し、異なる場合は条件差を警告して同条件比較と主張しない。既存 WAV は Take ごと peak-normalized なので、同じ再生ゲインでも**絶対音圧、SPL、vocal effort の比較は不可**。追加 EQ / DSP / post-normalization はしない。
5. **書き出す:** 選択 Take の `GET /cc-a2/takes/:id` で `can_export` と `state/issues` を確認し、可能な時だけ `GET /cc-a2/takes/:id/archive` を開始。ダウンロード完了表示は完全 ZIP 取得後とし、中断時は成功表示しない。`INCOMPLETE_PROVENANCE` でも証拠の限界を併記して export 可の場合がある。`REFUSAL_NO_AUDIO` は refusal-only Bag（WAVなし）。`MISSING_ARTIFACT` / `CORRUPT_ARTIFACT` / `UNVERIFIED_LEGACY` など export 不可の場合は理由を示して無効化。外部保管・SHA/BagIt の独立照合は [S2 runbook](chr1-s2-take-archive-runbook.md) に従い Owner が管理する。ダウンロード＝自動バックアップ完了、とは言わない。
6. **再読込 / 既存 Take へ戻る:** UI は既知 TakeID を参照として保持できるが、再読込時は必ずサーバから再検証する。**現状は v0 全 Take の列挙 API がない**ため、最近作成した ID / browser reference index / ユーザーが入力した既知 TakeID の再取得までを正直に提供し、全在庫表示を装わない。S2 の ID 直指定 lookup は latest-100/current-pin 制限を受けない。ブラウザ index 消失時に「Take 原本が消えた」と言わず、ID を既知なら復帰可能と案内する。

状態名と利用可否は API の独立した性質。例: `INCOMPLETE_PROVENANCE` は音声 artifact の SHA が一致していても full source attestation を意味しない。`AVAILABLE_VERIFIED` が将来使われても、**何を verify したか**（byte integrity と actual-run source provenance）を分ける。

## 4. 現行 UI 要素台帳 — 残す／移す／休眠

対象の実体: [App.tsx](../../src/App.tsx)、[app.css](../../src/app.css)、[CCAtelier](../../src/ccA2/CCAtelier.tsx)、[CCB1Atelier](../../src/ccB1/CCB1Atelier.tsx)、[StudioDraft](../../src/studio/model.ts)。旧経路を削除したことにはしない。

| 現行 main の要素 | S4 提案上の処置 | 行き先と互換境界 |
| --- | --- | --- |
| header の Character 名、X2a / backend chip、長い手順説明 | **移す** | `global.header` に project identity＋3 mode＋限定 v0 status。旧 backend chip は legacy だけに残す |
| 「デモ初期化」 | **休眠（v0）／残す（legacy）** | browser draft のリセットと server Character / physical Take 削除を混同しない。legacy 旧動作への明示導線を維持 |
| Character 名 / 説明入力、ID 表示 | **移す** | `character.canvas` の選択 revision と `selection.inspector` の許可編集。browser `char_mio` は server ID として扱わない |
| Character default energy / default pace | **休眠（v0）／残す（legacy draft）** | 保存フィールドは存在しても固定演技の物理 knob ではない |
| Script 区間編集、追加・削除・並替、segment override | **休眠（v0 実行）／残す（legacy draft）** | `motion.canvas` は固定演技を示し、自由台本は非実行 creative draft。`あい` の結果に流用しない |
| X1a/X1b/X2a 対応 script 選択ボタン | **休眠（v0）／残す（legacy）** | 固定 v0 で可変 text を暗示しない |
| Direction メモ、energy、pace、seed、validated pace ボタン | **休眠（v0）／残す（legacy）** | v0 は Direction 空・seed 0。旧 live/X1b の条件付き有効性は legacy 専用 |
| Perform カード、実行エラー | **移す** | `motion.canvas` の単一 Perform＋その場所の validation/error/409/429。旧 backend dropdown は v0 には移さない |
| Mock / X1a / X1b / live-X2a backend dropdown | **休眠（v0）／残す（legacy）** | v0 は CC-A2 lineage のみ。新 backend option 禁止。旧 entrypoint は研究用に残す |
| sticky Take history、各 Take の audio、job/outcome、A/B ボタン | **移す** | `take.transport` で v0 envelope を中心に再構成。旧 Take は schema 分離した legacy reader に保持 |
| 「Take を削除」 | **休眠（server v0）／残す（legacy browser 履歴）** | server immutable Take を削除しない。v0 の参照解除は「一覧から外す」と明記し原本操作ではない |
| Compare の A/B 2カラム、両方同一ID不可 | **移す** | `take.transport` の A/B。2枠のまま差分条件と再生制約を明示 |
| Compare Input / Result / Audio | **移す** | 選択 Take 要約・audio は dock、request/result 詳細は `research.drawer` |
| Compare trace download / Body binding / timeline / diagnostics / provenance JSON | **移す** | `research.drawer` の折畳み evidence。verified binding と selected body ref の別状態を保持 |
| CC-A2 折畳み入口、独立の M0/M1 select、perform、A/B、WAV/trace/receipt | **移す（v0 主経路）／残す（legacy）** | v0 は Character+Motion+dock で同等操作を提供。旧 `/cc-a2/*`、component と既存実験を黙って切らない |
| CC-B1 折畳み入口、section 8 の面積比編集、音声比較 | **休眠（v0）／残す（private research）** | `research.drawer` から明示的に到達できる旧研究画面。断面積変更を M0/M1 製品操作に昇格させない |
| footer の upstream SHA / browser 保存注記 | **移す／短縮** | primary には保存権威（server Character / browser draft / server Take）の短い注記。SHA と contract の長文は drawer |
| 旧 `AudioPlayer` / `TraceDownload` / `TakeStore` / localStorage | **残す（旧経路）＋新 UI は分離** | 旧 v0 の audio resolution と v0 envelope 物理 Take を同一 Type として変換しない |
| WG2 | **現行 main の独立入口は無し** | Draft #31 HOLD 由来を新規 v0 入口として捏造しない |

**legacy 到達性の下限:** 旧 mock/X1a/X1b/X2a の browser workflow、旧 `/live/*`、`/cc-a2/*`、CC-B1 private experimental UI の**機能・保存された原本・Core pin**を変えない。research.drawer 内の説明付きリンクから**既存の研究 harness を選んで開く**のを提案する。旧画面を開く URL/route と既定入口をいつ切替えるかは Owner 未決事項 D4（`5`）とし、リンク先が未整備のまま旧入口を消す移行を禁止。legacy 操作は 3 mode の4番目の「製品 mode」にはしない。

## 5. ブラウザ下書き共存／明示 import（黙った統合なし）

**既存事実:** `morphoacoustics-studio:s2-workspace:v1`（`char_mio` 等）は browser `localStorage` 下書き。S1 `POST /characters` はサーバで**新規 UUID＋revision 1**を発行し `metadata.notes`（最大 4000 文字）を受け付けるが、現在 **専用 import/one-time transaction/対応表 receipt API はない**。受理できない下書き・旧 Take は物理入力へ流さない。

**提案 UX（Character slot 内の明示 action。バックエンド機能の存在は主張しない）:**

1. 「ブラウザ下書きを確認」→ source storage key / browser-only old ID / name / 変更予定字段 / non-transferable script・Take・backend をプレビュー。「**新規 Character として取り込む（既存は統合しない）**」への個別同意が必要。起動・画面表示だけで import しない。
2. 許可された Character 字段のみ mapping（名前・説明・許可 M0/M1 ref 等）。`char_mio` は server UUID と一致させない。旧 arbitrary script / Direction / Take は転送せず browser draft に共存させる。破損・unsupported / 4KiB 超の receipt は STOP して元データを保護。
3. 一回の user intent に対応する source fingerprint と import intent ID を決め、`metadata.notes` に **origin storage key、legacy character ID、source snapshot digest、import intent ID、時刻・取込範囲・制限**の型付け記録を、**新規作成時の immutable revision 1 内に同時にアンカー**する案。`POST /characters` の返却 server UUID / revision / snapshot digest を readback したら、旧→新の**対応表 receipt**（source reference / source digest / server ID+revision+snapshot digest / status）を明示表示・ローカルに保存可能にする。元 browser draft は削除しない。
4. 同じ fingerprint / import intent の既存 Character が見つかったら**自動再 import しない**。失敗・timeout 時は新 UUID を推測して再 POST せず、`GET /characters` で対応表アンカーを照合して既存作成を解決できるか確かめる。曖昧なら STOP、手動判断。古い TakeID を新 Character に勝手に結び直さない。

**保証境界（重要）:** 既存 `POST /characters` は client idempotency key を受理せず、一覧照合と `metadata.notes` だけでは**同時タブ／クラッシュをまたぐ厳密な exactly-once を証明できない**。この UX は「明示的な一回限りの import 操作・重複時の fail-closed」を提案できるが、原子的グローバル一意性を**実装済み／保証済みと書かない**。対応表の永続保証・canonical digest 形式・並行 import race の規範は Owner 判断 D2。厳密にサーバで exactly-once を要求する場合は別の schema/API 設計承認が先であり、**新 backend を S4 提案に潜り込ませない**。D2 決定まで本番の import 完了を falsely advertise しない。

## 6. 正直な状態表示と disabled 行動

| 状態 / 証拠 | 主要ラベル案 | 行動上の意味 |
| --- | --- | --- |
| Character `SELECTED_UNRESOLVED` | 「M0 選択済み・物理 binding は未確認」 | preset 選択だけで VERIFIED は付かない。実行時の server verification と分離 |
| v0 `INCOMPLETE_PROVENANCE` | 「成果物の完全性を確認可能／**source 実ランの検証は未完**」 | playable/exportable 条件を別計算。確認済み声源とは呼ばない |
| `source_samples_evidence=RECOMPUTED` | 「規定 source を再計算した SHA（実ラン採取ではない）」 | 類似性の照合資料。環境差（SIMD / NumPy）を跨ぐ同一性保証ではない |
| `full_verified_source_state=UNKNOWN` | 「実ラン source samples: UNKNOWN」 | RECOMPUTED と隣接表示し、Verified と緑単色で同化しない |
| `MISSING_ARTIFACT` / `CORRUPT_ARTIFACT` | 「WAV 欠落」／「artifact SHA 不一致」 | 再生・A/B・export を fail-closed、TakeID と診断には到達可能 |
| `UNVERIFIED_LEGACY` | 「旧 pin・未検証（read-only）」 | 自動アップグレード / 同 ID 補填禁止。取得可能な既存証拠だけ表示 |
| `REFUSAL_NO_AUDIO` | 「Core 拒否・音声なし」 | no audio、許可される refusal-only ZIP は別明示 |
| `409` / `429` / invalid task | 「revision 競合」／「実行中」／「固定演技以外は非対応」 | retry/merge/replay を自動化しない |

`AVAILABLE_VERIFIED` を表示する場合も「archive artifact の照合」と「actual-run source の検証」を混同せず、v0 envelope の `UNKNOWN` を優先して説明する。音質について「自然な日本語音声」「検証済みの人物声」等は主張しない。S5 の限定ベースラインは再現性の証拠であり品質 GO ではない。

v0 で **押せる UI を作らない**範囲: OD-2／OD-3、器官/身体の自由変更、歩容、Scene の編集/物理、フォント、再生速度、source/F0/effort/energy/pace knobs、自由 Script / Direction 実行、SMC/ASMR、WG2。将来位置を表示するときは「v0 対象外」か「研究中」、無効ボタンで操作可能性を演出しない。**再生速度**はブラウザ audio element に実際の能力があっても製品コントロールとして露出しない。

## 7. スクロール回帰・mobile・accessibility 受入仕様（実装時に検証）

- **scroll 回帰:** 縦積み旧 `App.tsx` の `editor-stack` → sticky `takes-panel` → ページ下部 `comparison-panel` という経路を廃止し、canvas は高さ/横幅の制約内に収める。window / body に無意図の horizontal overflow を生まない。モード切替・Take 選択・research 開閉で scroll position が唐突に先頭/末尾へ飛ばず、操作された見出し/結果へ予測可能に focus 移動。重複 sticky / nested scroll trap / viewport 外の Export を許さない。
- **transport:** Desktop は常設下部 dock に少なくとも selected Take / play / A/B / ZIP / state を可視化。Mobile では compact dock の最重要操作を常時到達可能にし、展開は同 slot 内。viewport safe area・小縦幅・オンスクリーン keyboard で CTA を覆わない。長い ID/hash は折り返し/ellipsis＋全文コピー/確認可能、画面幅を押し広げない。
- **寸法試験:** 320, 360/375/390, 768, 1024, 1280/1440 CSS px（それぞれ縦・横向きも確認）。320 での主要フローが横スクロールなしで到達可能、768 tablet で Draft #33 の既知 overflow が再発しない。スクリーンショット desktop/tablet/mobile は **後日 S4 実装受入**に保存し、現 PR では撮影済みとは書かない。
- **入力と支援技術:** Character/Motion/Scene が tabs であれば tablist/tab/tabpanel、`aria-selected`、roving tabindex、左右/Home/End キー、Tab focus order を一貫させる。tab でなければ正しい navigation semantic を使い、role だけ偽装しない。visible focus、44px 程度を目安とした touch target、Enter/Space 操作、drawer の ESC・focus return・ラベルを確認。状態は色だけで伝えず文字ラベル。no-audio/409/429 は読上げ可能なエラー領域を持つ。**inert body selector の再発禁止。**
- **データ regression:** reload/server restart を挟み、server Character の正本 revision、TakeId 直取得、A/B、ZIP、旧 research endpoints の到達性を検証。browser draft の既存 key・take index は破壊せず、元と別 namespace として扱う。Take 不可状態では再生/書出しの success UI を出さない。

## 8. Owner / Muse へ残す未決事項（提案中に決定しない）

| ID | 判断者に求める判断 | 現状に即した提案／決定しない理由 |
| --- | --- | --- |
| **D1** | Take list UX の下限（既知 ID + browser ref index + 手入力でよいか） | `GET /studio/v0/takes/:id` と S2 全在庫 lookup はあるが **v0 一覧 API はない**。サーバ全件一覧を求めるなら別 API/データ契約と追加 GO が必要。黙って latest 100 を全件と表示しない |
| **D2** | browser draft import の exact-once 強度、receipt schema / 保管・fingerprint 規則 | S1 metadata.notes 同時アンカー＋明示 receipt 表示案は**原子的 cross-session uniqueness の保証がない**。厳密要求なら独立 API/schema/ゲート判断が必要。D2 未決で保証を売り込まない |
| **D3** | Character を保存した後 Motion へ自動切替するか、明示「次へ」を使うか | 誤って未保存 draft を実行しないことは必須。既定 focus/進行方法は Owner の usability 判断 |
| **D4** | old research harness へのリンク先 URL/route、初回既定 view と切替日 | 旧 mock/X1a/X1b/X2a / CC-A2 / CC-B1 は生存必須。`research.drawer` からの legacy access を提案するが未実装リンクを有効表示しない |
| **D5** | dock の高さ・展開初期状態／mobile inspector の折畳み初期状態 | `take.transport` 常設、canvas 優先、320px で横 overflow 無しは制約。具体的ピクセル値は screenshot / 操作検証で決定 |
| **D6** | 名前・説明・body ref の編集を canvas と Inspector のどちらに収めるかの最終操作細部 | 所有 slot は `character.canvas` と `selection.inspector` に固定。編集項目は許可 scope 内だけ。二重 editor は置かない |
| **D7** | S5 限定 baseline Take への最初の到達方法／ID の提示方法 | S5 実在記録は #50 にあるがユーザー PC の Store は GitHub から取得できない。ID を提示する方式は一般の Take list 完全性を偽装しないものにする |
| **D8** | S4 実装 GO 時の検証責任者・スクリーンショットと keyboard/ARIA 判定基準の確定 | Muse は凍結 ADR 準拠、legacy reachability、科学的 claim limit を審査。Owner は実装 GO を別途判断。CI PASS と音質採用は別 |

**別 ADR 判断の境界:** この提案は**slot/mode 契約を一切変更しない**。もし Muse/Owner が「常設 import panel」「第4 mode」「新しい研究 panel」「transport を下部以外へ配置」等を必要と判断した場合、本書への混入・既成事実化ではなく、凍結 `STUDIO_WORKSPACE_V2_DECISION` の変更可否を独立 ADR として Creator が先に判断する。**D1/D2 の新 API/schema が必要な場合も S4 実装 GO と別に明示承認する**（現 PR には含めない）。

## 9. 後続 S4 実装の審査チェック（この PR では未実施）

- [ ] ADR の3 mode / closed slots / one canvas replace / no extra panel を Muse が机上照合する
- [ ] Character 新規/選択/rename/M0-M1 保存 → CAS競合 → 再読込で server head と snapshot の整合が保たれる
- [ ] Motion の固定 `あい` 以外、任意 Direction/seed/source/未保存 body が拒否される。double submit/replay 時に duplicate physical Take ができない
- [ ] v0 Take は envelope adapter のみ。no-audio / missing / corrupt / legacy / incomplete provenance の可用性が state に一致し、消えた Take を同 ID で補充しない
- [ ] M0/M1 の独立 TakeID で A/B、同一 gain・peak normalization caveat、BagIt download（成功／拒否／破損）を通す
- [ ] browser draft 共存、explicit import と receipt、旧 localStorage key、旧 X2a・CC-A2・CC-B1 への実際の到達・実行を回帰確認する
- [ ] Desktop/tablet/mobile screenshot、320px 横 overflow、dock scroll/focus、ARIA tab keyboard、modal/drawer focus、disabled controls を人手＋browser E2E で監査する
- [ ] `npm test`、`npm run test:bridge`、`npm run build`、CC-A2/S0/S1/S2/S3 policy、CC-A2 physical/browser、X2a live physical/browser、CC-B1 private regression（該当 pin）を実装 exact HEAD で実行する
- [ ] 受入前後の原本 hashes と retention を独立照合する。S5 限定 baseline を品質認定に昇格させない

**今回の提出判定:** docs-only proposal。実装テスト、ブラウザ撮影、Core 動作、音質評価、migration、merge は**一切実施していない**。Muse の契約適合レビューと Owner の別実装 GO を待つ。

### 現物確認の入口

- [凍結 ADR](STUDIO_WORKSPACE_V2_DECISION.md)、[採用計画 QI4/QI5-S4](character-v0-implementation-plan-20261106.md)、[Issue #51](https://github.com/ryonakayama234/morphoacoustics-studio/issues/51)
- [App.tsx](../../src/App.tsx)、[app.css](../../src/app.css)、[StudioDraft](../../src/studio/model.ts)、[CCAtelier](../../src/ccA2/CCAtelier.tsx)、[CCB1Atelier](../../src/ccB1/CCB1Atelier.tsx)
- [Character API client](../../src/studio/characterApi.ts) / [S1 store](../../server/character-store.mjs) / [server routes](../../server/cc-a2-server.mjs)
- [v0 envelope adapter](../../src/performance/V0TakeAdapter.ts) / [S2 archive](../../server/take-archive.mjs) / [runbook](chr1-s2-take-archive-runbook.md)
- [旧 A/B selection](../../src/studio/compareSelection.ts) / [S3 facade](../../server/v0-facade.mjs) / [S5 限定 baseline 記録](https://github.com/ryonakayama234/morphoacoustics-studio/issues/50#issuecomment-6736075443)
