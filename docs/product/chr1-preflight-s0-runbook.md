# CHR-1 S0 — 読み取り専用の棚卸し／Owner・Muse 受入手順

**状態: S0 スクリプト実装・検証手順のみ。Owner PC の実棚卸し、実データのバックアップ、Muse 受入は PENDING。S1 以降の GO ではない。**

根拠: [Studio Issue #41](https://github.com/ryonakayama234/morphoacoustics-studio/issues/41)、採用済み [CHR-R-20261106-02](character-v0-implementation-plan-20261106.md) `QI5 S0、[Issue #32](https://github.com/ryonakayama234/morphoacoustics-studio/issues/32)。2026-11-07 の Owner 決定により、バックアップ先は **Owner PC 内の Studio リポジトリ外の専用フォルダ**。正確なパスは実行時に Owner が指定し、S0 受入記録に記入する。WAV/NPY/ZIP 等の実データは GitHub に置かない。

## 対象データルート

| root | 既定パス（Studio root から） | 実パスの環境変数 |
| --- | --- | --- |
| CC-A2 | `.morpho-cc-a2-data` | `MORPHO_CC_A2_DATA_DIR` |
| browser 候補 | `.morpho-browser-data` | `MORPHO_BROWSER_DATA_DIR`（**棚卸し用のみ**、既存サーバーの設定ではない） |
| CC-B1 | `.morpho-cc-b1-data` | `MORPHO_CC_B1_DATA_DIR` |
| legacy live/X2a | `.morpho-live-data` | `MORPHO_LIVE_DATA_DIR` |

Issue #41 が指定する browser 候補と、現行 `server/live-server.mjs` の実際の `.morpho-live-data` は**別**のため両方を走査する。環境変数の値はサーバーと同様にカレントディレクトリ基準で解決するため、**Studio root から実行する**。CLI の `--cc-a2-data PATH` / `--browser-data PATH` / `--cc-b1-data PATH` / `--live-data PATH` で個別上書き可。

`src/App.tsx` の browser `localStorage` は Node から直接棚卸しできない。`.morpho-browser-data` が存在しなくても `localStorage` が空と断定しない。ブラウザプロファイルへの自動アクセス・移行は対象外。

## 収集内容／厳格な境界

- データ root 全体をファイルシステムで再帰走査し、API の最新100件・現役 pin 限定フィルターを使わない。Take record / artifact / run / registry / schema / other のすべての**通常ファイル**について、相対パス、SHA-256、サイズを採る。ID は JSON 内の `take_id`・`run_id` と、パスからの推定（`PATH_ONLY`）を区別する。CC-A2 の `takes/<runId>.json` を Take ID と誤同定しない。
- JSON の `schema_version` / `record_schema` / `core_commit` / `backend_version` など、**実際に記録されている値のみ**一覧化する。サーバー宣言内の `CORE_SHA` は `OBSERVED_SOURCE` として取得し、既存 Take の実行時 pin と同一と仮定しない。source samples の不在は `UNVERIFIED_SOURCE_SAMPLES` として扱い、再計算・補完しない。
- Take が宣言した artifact 参照の SHA/サイズ照合、content-addressed ファイル名の SHA 検査を行う。欠落・読取失敗・破損 JSON・symlink・走査中の変更を `UNKNOWN` または `PARTIAL` として明示し、成功やゼロ件に丸めない。symlink は追跡せず、通常ファイル以外は開かない。root 自体がない場合は `UNKNOWN`、存在して空なら `PRESENT` の0件。
- [Issue #32](https://github.com/ryonakayama234/morphoacoustics-studio/issues/32) の WG2 2件、`05e8d69a-5e9b-4d5f-bb7d-3961d9674022` と `9801d385-9085-498f-87ff-9d2f3980b598` は、実物 receipt がない歴史的 provenance / M0・M1 対応が**恒久 UNKNOWN**。旧 Take の再同定・再生成は禁止。
- **書込み、ファイル作成、コピー、移動、削除、Core の起動や物理再実行、サーバー変更、UI、S1以降は行わない。** stdout は JSON、stderr は人間可読サマリ。manifest に含まれる絶対パス・ID の公開前検査は Owner が行う。

## Owner PC 実行例（WSL2/bash / Node 22）

サーバーを停止し、Studio root で実施。下記 `AUDIT_DIR` は Owner が指定する**対象 root・Studio repo の外**の監査ファイル保存先。mkdir と shell の出力リダイレクトのみが監査用ファイルを作成する。スクリプト自体はファイルを書かない。

~~~bash
node --version
node --test scripts/chr1-s0-inventory.test.mjs

# AUDIT_DIR は Owner が自分で実パスを指定する
mkdir -p -- "$AUDIT_DIR"
node --experimental-permission --allow-fs-read='*' \
  scripts/chr1-s0-inventory.mjs \
  > "$AUDIT_DIR/chr1-s0-inventory.json" \
  2> "$AUDIT_DIR/chr1-s0-summary.txt"
~~~

Node permission policy は**ファイルシステム書込み権限を与えない**追加検証として使う。stdout リダイレクト先を対象データ root 配下に置かないこと。まず JSON の `roots[*].path` が実ディスクと一致するか検査する。実データがなければ `UNKNOWN` をそのまま記録する。

## Muse 独立照合・S0 ゲート

スクリプトの SHA を同じスクリプトで再計算するだけでは独立照合にならない。Muse は manifest 中の実ファイルを別の手段で読み、サイズと SHA を独立照合する（例: WSL2 の `stat` / `sha256sum`）。照合対象・一致/不一致・UNKNOWN の扱いを別記録する。

~~~bash
# 下記は例。Owner 実パス・実ファイル名に置き換える
sha256sum -- "$DATA_ROOT/takes/EXACT_FILENAME.json"
stat -c '%s' -- "$DATA_ROOT/takes/EXACT_FILENAME.json"
~~~

バックアップは **Owner が別工程で**、Studio repo 外の指定フォルダへ既存データを複製し、原本・複製の全ファイル SHA/サイズを独立照合する。バックアップされないデータがある状態で S1 の writer 切替に進むのは STOP。旧 v0/v1 の不一致拒否・起動後の旧 Take 再読込確認も受入検証項目にする。

必要な回帰確認: `npm test`、`npm run test:bridge`、`npm run build`、`node --test server/cc-a2-server.policy.mjs`。依存する実 Core がある環境では個別 physical/legacy/CC-B1 smoke も元の pin のまま監督者が確認する。UI 品質・声質の GO とは独立。

## Owner/Muse が後で記入する S0 実行記録（すべて現時点では PENDING）

| 項目 | 記録 |
| --- | --- |
| 実行日時、Studio exact HEAD、Node / OS | PENDING |
| 対象全 root 実パス、ファイル数・サイズ、UNKNOWN と理由 | PENDING |
| JSON manifest SHA-256、サマリ、schema/pin 一覧 | PENDING |
| Muse 独立 SHA/サイズ照合（対象・一致・不一致） | PENDING |
| Owner が指定したバックアップ保存先と複製後の全件 SHA 照合 | PENDING |
| 旧 v0/v1 拒否、再起動再読込、既存テスト一式 | PENDING |
| Muse 受入判定、Owner S0 最終決定 | PENDING |

この PR を作っただけでは **S0 完了／バックアップ完了／Muse PASS** と宣言しない。S1–S5 は各々別の Owner GO を要する。
