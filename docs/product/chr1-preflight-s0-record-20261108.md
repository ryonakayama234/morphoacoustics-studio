# CHR-1 S0 — 棚卸し・バックアップ受入記録（2026-11-08）

**状態: S0 受入完了（ゲート合格）。** 根拠: [Issue #41](https://github.com/ryonakayama234/morphoacoustics-studio/issues/41)、採用済み [CHR-R-20261106-02](character-v0-implementation-plan-20261106.md) の S0、棚卸しツールは [PR #42](https://github.com/ryonakayama234/morphoacoustics-studio/pull/42)（merge `2f48a8e`）で main に導入。本記録は S1 以降の GO ではない。

## 実施内容

Owner PC（WSL、Node v24.13.1）で 2026-11-08 に読み取り専用棚卸しを2回実行した。1回目は新規 clone 直後の空のチェックアウトを対象とし、全 root が不在だった。ホーム全体の検索で既存チェックアウト `~/x2a-acceptance/morphoacoustics-studio/` が見つかり、2回目はその `.morpho-live-data` を `--live-data` で指定して実行した（manifest schema `chr1-s0-read-only-inventory/v1`）。

## 結果

| root | 状態 | 内容 |
| --- | --- | --- |
| cc-a2 (`.morpho-cc-a2-data`) | 不在 (ENOENT) | PC 全体を検索しても存在しない |
| browser (`.morpho-browser-data`) | 不在 (ENOENT) | 同上 |
| cc-b1 (`.morpho-cc-b1-data`) | 不在 (ENOENT) | 同上 |
| live-x2a (`.morpho-live-data`) | PARTIAL | 16ファイル / Take記録2件 / 成果物4件 / 746,533 bytes / 不一致0 |

- 実データは live-x2a のみ。Take 記録2件（`take_live_0481c753…`、`take_live_232dc2dc…`）はいずれも同一の成果物4点（WAV / NPY / CSV / マニフェストJSON、内容アドレス付き）を参照し、全参照が SHA-256・実在とも一致（MATCH）。各 run の複製が `runs/<uuid>/` にも存在する。
- PARTIAL の理由（UNKNOWN 2件）は欠損や破損ではない。両 Take が宣言する `body-binding://v3c-M_plus/v1?core=a75418770ed28cbd301d554171a6b60ee5a05ee9` はファイルではなく身体への論理参照であり、照合対象外として正直に未解決表示されたもの。
- サーバーの Core pin は実測どおり（cc-a2 `b569f044…`、cc-b1 `ef23738e…`、live `a7541877…`）。
- ブラウザ `localStorage` は Node から棚卸しできないため対象外であり、空であるとは主張しない。[Issue #32](https://github.com/ryonakayama234/morphoacoustics-studio/issues/32) の WG2 2件は従来どおり provenance 恒久 UNKNOWN のまま不変。

## バックアップ

2026-11-07 の Owner 決定どおり、保存先は Owner PC 内・リポジトリ外の専用フォルダ `~/MorphoacousticsBackup/`。`.morpho-live-data` を `~/MorphoacousticsBackup/morpho-live-data-x2a-acceptance` へ複製し、元と複製の全ファイル SHA-256 一覧の diff が完全一致（COPY-OK）した。manifest 本体とハッシュ一覧も同フォルダに保管する（manifest ファイルの SHA-256: `8c214108807ec2d506f61e147bf76c07c2e3f5c536948c02e80241f6c12fadc9`）。実データ（WAV/NPY 等）は GitHub に置かない。棚卸しは元のデータを変更・移動・削除していない。

## 監督者の独立照合

監督者（Muse）は manifest の全16ファイルについて、棚卸しスクリプトとは別の道具（GNU sha256sum）による Owner 側のハッシュ一覧と突き合わせ、**16/16 一致**、合計バイト数 746,533 の一致、サーバー pin のソース実読値との一致を確認した。

## 結論

S0 のゲート条件（棚卸しの実施・不在範囲の正直な記録・バックアップと複製後照合・監督者の独立照合）はすべて満たされた。**S0 は完了。** 次段 S1 は別途 Owner GO が必要。
