# REVERSE-S1-PREREG-20261114-01 v1 — 段1：OD-2 閉カタログの合成逆問題

**日付:** 2026-11-14 JST
**起草:** Research Lead（ChatGPT）／ **検証:** Muse ／ **凍結決定:** Owner
**状態:** DRAFT / MUSE_REVIEW_PENDING / OWNER_FREEZE_PENDING
**追跡:** [Issue #63](https://github.com/ryonakayama234/morphoacoustics-studio/issues/63)

本書は docs-only の事前登録ドラフト。実装・実験・段0実施・ツール製作のGOを含まない。科学的な逆推定の評価は未実施。今回行った既存M0の単発費用測定だけを§10・付録Bに開示する。

## 0. 根拠と採否提案

正本は Studio 7183ca697f60e7e2ccf6c02fa4adf386788658e5 の [採用済み回答 REVERSE-R-20261114-01](https://github.com/ryonakayama234/morphoacoustics-studio/blob/7183ca697f60e7e2ccf6c02fa4adf386788658e5/docs/product/reverse-route-response-20261114.md) §3.2–3.7・§6.1、[Muse審査](https://github.com/ryonakayama234/morphoacoustics-studio/pull/64#issuecomment-6871330908)、[Owner採用記録](https://github.com/ryonakayama234/morphoacoustics-studio/pull/64#issuecomment-6871419476)、[今回の起草依頼](https://github.com/ryonakayama234/morphoacoustics-studio/issues/63#issuecomment-6871439753)。回答冒頭の採用待ち表記は当時の状態であり、後続の採用記録を優先する。

**提案は T＋T-M を採用すること。** T-Mの最終採否はOwnerが本書を凍結する時に決定する。§10の実測・回数表を判断材料とし、成績を見て採否を変更しない。

| 対象 | 今回の登録提案 |
| --- | --- |
| 主試験T | OD-2の5物理身体＋null alias同一性対照2件。T-HとT-Wを別条件で全件報告 |
| 限定追加T-M | 既存OD-3の3身体・G1転移。推奨採用、Owner凍結待ち |
| L試験 | **登録外**。受動損失の同定は別試験・別判断。Tの前提にしない |
| その他の除外 | 連続r、16断面自由探索、M1編集、形状×LRF、source生理パラメータ、実録音フィット、未知発話、Character発行、製品配線 |

## 1. 問い・競合結果・評価単位（FZ1）

**問い:** 固定source・演技・端子・観測器の下で、OD-2の5身体を、内部複素HUまたは出力STFT magnitudeから区別・回収し、選択に使わない条件の観測を所定の残差内で予測できるか。

競合する結果は、唯一の正解身体の受容、複数身体の受容、受容候補なし、計算・検証未成立の4つ。T-H成功をT-W成功に、観測の一致を幾何の一意回収に読み替えない。nullの中心cは物理状態に存在しない編集履歴なので回収対象外。

評価単位は**5物理状態の有限全数**。独立無作為標本ではない。alias、snapshot、17/12/47 STFT窓、137周波数、4雑音seedを独立身体数に足さず、信頼区間・power・人間一般への成功率を作らない。T-Mはその部分集合の3身体であり、G0/G1を6つの独立身体と数えない。

## 2. ピンと身体の固定台帳（FZ2・FZ3・FZ13）

| 欄 | 登録値 |
| --- | --- |
| Studio設計正本 | 7183ca697f60e7e2ccf6c02fa4adf386788658e5 |
| **研究実施Coreピン** | **b2ec608fb19135ea2343c0416c790828e3820ba2**。mainへの追従禁止 |
| **正式B1製品ピン（別欄）** | **b5dc95ddbf00efe423635e8ff73f2b550239cd2b**。[Owner決定](https://github.com/ryonakayama234/morphoacoustics-studio/issues/54#issuecomment-6767339003)。本書は製品ピン移行・P2完了を意味しない |
| source同一性証跡 | 付録Aの50 path/blob。両ピンのGit treeはtruncated=false、全50件が同pathで一致。計測用に取得した47件はローカルbytesのGit blobも全件一致 |
| 調査基準との関係 | 採用回答が参照したCore commitと研究ピンは同じ。既存OD-1/OD-2/CC-A2/Exp009/Exp027/OD-3のpin拘束を変更しない |
| 新実装 | 比較器・観測演算・封印器・driver等のexact SHAとdependency closureは実施前addendum。現時点で実装済みとはしない |

Git blobは内容同一性であり署名ではない。実施時は全source SHA-256と依存inventoryも保存する。未取得・不一致はSOURCE_DRIFTでSTOP。新しい科学依存が必要なら列挙して実装受入を受け、source checksを迂回しない。

family=tract1d.local-log-area-5.v1、parent=v3b-axial-M0@1、parent preparation digest=sha256:a98d484f8740bf40a419ac117a2deb41ab659dea095577874455aec0713258de。以下は [Core catalog](https://github.com/ryonakayama234/morphoacoustics/blob/b2ec608fb19135ea2343c0416c790828e3820ba2/contracts/body/od2-b1/catalog-v1.json) の値。

| 固定順 | 身体 | Core revision_id | preparation digest（sha256:の後） |
| --- | --- | --- | --- |
| 0 | M0 | v3b-axial-M0@1 | a98d484f8740bf40a419ac117a2deb41ab659dea095577874455aec0713258de |
| 1 | c4 r0.90 | od2-bfb4199f5d3a38ded992d42cbd7858ad5b4ebc34b297c9f1a8411dde88bdbf0b | 129bf045594b5581e67a079807c0c9c76e79e8e0b68b95709d548162d33d8713 |
| 2 | c4 r1.10 | od2-7c2663189d907111665544c67def56c885576f5394e4220ec12251e0ca5ebf67 | f2778205243970d43ca3ea0151b91286fd9c46fb85b8867a8efbb7b811e6da0a |
| 3 | c8 r0.90 | od2-d722dfb9595672f0d19c46a8780c610c9d41fc3a8935b93d3d01a5d68aab4084 | 4b4300f05d0ea98d2edc3e6c17d8075fd29a51c8de91af599a94fa663b602375 |
| 4 | c8 r1.10 | od2-b04351e9865aef8af2953ed8b585eefa7bf40ec0887214daf4c0e32590478716 | 649c0b17a5d62c4cdb272acd3e1b7efeb06609d6321d26dcd7e650548283018b |

alias対照A4=(4,"1.00")、A8=(8,"1.00")はM0のrevision/digestへ正規化する。基準M0とは別processで各1回生成し別来歴を保存するが、新クラスを発行しない。

幾何はCore receiptからreadbackする。声門→唇の16区間、各長さ0.010m、正の面積。A_i=A_i(M0) exp(log(r) w_i(c))、wは中心1・隣接0.5・2隣接0.25・他0。rは文字列"0.90"/"1.00"/"1.10"のみ。rest_areas_hex、lengths_hex、親、backend、digest、receipt SHAを照合する。研究側でBodyRevisionの第二正本を作らない。

## 3. 順方向の固定条件（FZ4）

| 要因 | 登録値 |
| --- | --- |
| source | prescribed lf_fixed、F0=100Hz、Rd=1.0、既存Exp013の係数・生成器。身体としてfitしない。seed=0 |
| 出力 | 0.5秒、48,000Hz、24,000 samples、mono raw pressure float64 Pa |
| G0 task0 | OPEN、location .3424849103873983、degree .5921764128805103 |
| G0 task1 | CONSTRICT、location .7167402543883221、degree .9235962908995712 |
| G0 task2 | CONSTRICT、location 1.0、degree .04495226070116771 |
| G0時間 | 全3task onset .15s / offset .35s。既存Exp027のrealizer/activation |
| 実行刻み | control .005s、renderer hop256、frame1024、preroll_edge。STFT観測窓とは別 |
| loaded transfer | Exp009 HU=Uout/Uin、ρ=1.21kg/m³、c=343m/s、**一様α=0.4Np/m** |
| 端子・observer | R=.05ρc/Aout、outlet volume velocityから距離.20mのmonopole pressure proxy |
| T-M G1 | task index1のみonset .17s / offset .37s。他はG0と同じ |

旧研究WAV経路の条件を、Fidelity0本体の理想pressure-release Zin・無損失と混ぜない。**LRFはT/T-Mに一切加えない。** source/task SHAは実際の実行から取得する。再生成sourceのSHAを過去Takeのactual-run evidenceに昇格させず、実行内同一性と既存quantized M0 regressionを別検査する。

## 4. 観測権限と全ケース（FZ5・FZ8）

| 経路 | fit入力 | 選択後の検証 |
| --- | --- | --- |
| T-H | rest複素HU、100–3500Hz/25Hzの137点 | G0 t=.20,.35,.50sのHU、同137点。各時点で両閾値合格 |
| T-W raw primary | raw Paから§5のmagnitude、[0,.20s) | [.35,.50s)、g=1 |
| T-W gain unknown secondary | clean raw、fitでスカラーgのみ計算 | g/s_ref/ε固定 |
| T-W preview secondary | §4.1のPCM16 decode、fitでg計算 | 同上、rawとは別表 |
| T-W ±6dB secondary | rawに各10^(±6/20)を乗じた目標、無加工候補、fitでg計算 | 同上 |
| T-W noise secondary | §4.2の40dB SNR、seed0〜3、候補は無雑音raw、g=1 | s_ref/ε固定、雑音付きhold-out |

各条件で全5target×全5candidateを評価する。T-Hのfit表は5×5。T-Wはraw1＋gain unknown1＋preview1＋gain2＋noise4の**9条件×5×5=225 fit距離**。hold-outも全5×5の別表を保存し、C_fit候補を全件検証する。alias2件は別のidentity/control表。secondaryをprimaryへ合算しない。noise×gain、noise×previewの直積は行わない。

推定器に許す入力は、当該targetのfit観測、規定候補辞書、固定nuisance契約のみ。**T-Wへ目標HU/Zin/source配列/body trace/truth receipt/幾何/実名path/生成順を渡さない。** candidate辞書のCore IDは選択肢として許すがtarget truthとは別。sourceで割ってHUを復元することは禁止。T-HとT-Wの順位を相互利用しない。

### 4.1 preview・量子化

OD-1 wav_bytes規則。無雑音G0の5 unique raw（6要求でも同じ物理集合）の共通最大絶対sampleをPとし、gain=.90/P。PCM=rint(raw*gain*32767)、little-endian signed16、mono48k WAV、decode=signed16/32767。zero/nonfinite/clippingは停止。candidate/targetは同規則、gain metadataは推定器に渡さない。alias追加でPが変わらないことを検査する。

**留保:** 既存preview正規化は全0.5秒peakを使うため、previewの時区間hold-outには全体正規化の依存がある。厳密に未参照な時系列検証やPa絶対振幅回収とは呼ばない。raw primaryはpreview gainを使わない。T-Mはraw/HUのみで、G1を使ったpreview正規化をG0選択へ戻さない。PCM16を将来の48k/24bit実録音と同精度としない。

### 4.2 雑音・gain

各身体のclean raw xに、Generator(PCG64(seed)).standard_normal(24000)のfloat64列zを加える。身体ごとに生成器をリセットし同seedのzを共有するpaired診断で、独立反復数を増やさない。

I=[0,9600)として a=RMS(x[I])/(100*RMS(z[I]))、y=x+a*z。fit波形RMS比で40dB SNR、同じaをhold-outへ適用する。RMS0/非有限はUNKNOWN。物理sourceへの介入ではない。seed再抽選・良いseedの選択は禁止。

乱数実装・seed→byte・z/yのSHA・実測SNRはaddendum/実行記録に残す。±6dBは別条件とし、clipや整数化を足さない。

## 5. 観測演算・閾値・候補集合（FZ6・FZ7）

**採用済み回答§3.3の値をそのまま登録する。知覚閾値ではない。結果・雑音成績・実装都合を見て緩めない。** 変更が必要なら当該登録を停止し、既知結果と理由を示した別版を審査する。

### 5.1 複素HU

f_k=100+25k Hz、k=0..136。

- e_k=|HU_b(f_k)−HU_target(f_k)|/max(1,|HU_target(f_k)|)
- D_H=sqrt(mean_k(e_k²))
- 順位はD_H、受容は **D_H≤1e-4 かつ max(e_k)≤1e-3**。

全周波数残差を保存する。snapshotは各時点に同演算・閾値を適用し全時点合格を要求する。Zin/Hp/振幅のみへ交換しない。

### 5.2 出力magnitude

48kHz、1920-sample **periodic Hann**（40ms）、hop480（10ms）、NFFT1920、demeanなし、pre-emphasisなし、paddingなし。w[n]=.5−.5cos(2πn/1920)。

S[m,k]=|Σ_(n=0..1919) x[n+480m] w[n] exp(−j2πkn/1920)|/Σw。

片側振幅、**2倍化なし**。100–3500Hzの25Hz bins（k=4..140、137点）を等重みで比較する。窓全体が半開区間内に入るものだけを採る。

| 区間 | sample範囲 | m（窓開始=480m） | 窓数 |
| --- | --- | --- | --- |
| fit | [0,9600) | 0..16 | 17 |
| unused gap | [.20,.35s) | 選択・検証に使わない | — |
| hold-out | [16800,24000) | 35..46 | 12 |
| T-M G1検証専用 | [0,24000) | 0..46 | 47 |

窓中心だけで分割しない。G0 hold-outは同じ「あい」の未使用後半であり新発話ではない。

当該target fitの s_ref=max S_target、ε=1e-6*s_ref を両側共通使用し、r[m,k]=20log10((g S_b+ε)/(S_target+ε))。順位はRMS(r)。受容は **RMS(r)≤0.25dB かつ max|r|≤1dB**（全窓×全137bins）。

raw primary/noiseは **g=1**。gain unknown/preview/±6dBだけは、fitの未floor振幅で候補ごとに g=clip(Σ S_b S_target/Σ S_b²,.1,10)。境界はGAIN_BOUND_HIT。分母0/非有限、s_ref=0、適格窓なしはUNKNOWN。

hold-outは**fitで決めたg/s_ref/εを保持し再fitしない**。窓別・周波数別gain、EQ、pitch shift、time stretch、phase alignment探索は禁止。raw波形相対L2は補助記録で、順位/合否を上書きしない。

### 5.3 正解・集合・非一意

全5候補を§2の固定順で列挙する。optimizer/学習器/初期値はN/A。工学受入では逆順列挙でも候補別距離と集合が一致することを確認する。代表はfit距離最小、浮動小数値が完全同値の時だけ固定順でtie-breakする。代表に解剖学的意味を与えない。

C_fit(y)={b∈B:fitの両受容閾値を満たす}。最良値との差だけで受容しない。空=NO_ACCEPTABLE_CATALOG_MEMBER、複数=AMBIGUOUS_IN_OBSERVATION、計算/検証未成立=UNRESOLVED。失敗候補を黙って除いてsingletonにしない。

truth開封後だけCore ID一致、E_A=sqrt(mean_i(log(Ahat_i/Atrue_i)²))、E_L=sqrt(mean_i(log(Lhat_i/Ltrue_i)²))、各最大絶対log誤差を全候補に記録する。正解回収の十分条件は **C_fitがtruthのsingleton、かつ登録hold-out合格**。argmin正答、truth包含、観測合格、幾何回収は別欄。aliasのc誤差はN/A。

曖昧な候補は全て検証し、C_fitを保持してC_fit∩C_holdoutを派生欄に示す。これで絞った場合は「fit＋検証」と明示し、同じ検証を以後の未使用final testに再利用しない。全5身体のsingleton truthとhold-out合格が揃った条件のみ「5身体全回収」。部分成功はn/5と例外を示し、secondary不成立でprimary結果を消さない。

## 6. T-M仕様（FZ2・FZ9）

**推奨採用、Owner凍結待ち。** B_M={M0,c4r1.10,c8r0.90}。G0はTの原本を再利用し、T-M用に選び直さない。既存OD-3のG0 schedule経路とinherited G0の相対L2≤1e-12を確認する。内部の追加renderも§10へ算入する。

G0のC_fit・代表・nuisanceを固定してから、G1の全47窓を§5.2の同じ0.25dB/1dBで検査する。raw g=1、s_ref/εは当該targetの **G0 fit** から保持する。HUはOD-3既存probe時刻 {0,.20,.27,.35,.40,.50}sの同137点に§5.1を適用し全時点合格を要求する。.27sを含め遅延の影響する遷移も調べる。G1によるbody/gain/source/taskの再fitなし。G1の雑音/previewは今回追加しない。

**候補の能力範囲:** G0のC_fitは元の5身体のまま保持する。B_M外の候補が残れば捨てず、そのG1をNOT_TESTABLE_WITH_CURRENT_CAPABILITY、集合全体をCOVERAGE_INCOMPLETEとする。実行可能な全受容候補は検証するが、未対応を「G1で棄却」としない。3身体全てでG0 singleton truthとG1合格が揃った時のみ「3身体の限定転移成立」。T-HとT-Wは別判定。

Ownerが不採用を決めた場合、G1生成/封印/開封/判定を行わず本節をNOT_REGISTERED、費用をT-only列へ固定する。採否未記入のまま実施しない。

## 7. hold-outの封印・開封順（FZ9）

**正式pack・blind対応表・hold-outは現在未生成。** 下記の担当・保存先・SHAをaddendumに固定する。提案担当は封印管理=Muse、推定出力=Lead、GO決定=Owner。兼任時は単一processのラベル分けを独立盲検と呼ばず、権限と読取りログを明示する。

1. Owner科学条件凍結→別実装GO→工学受入。M0計測・既存公開結果を既知情報として記録する。正式5×5距離/G1成績を先取りしない。
2. 実装/比較器/依存SHA、乱数byte、全case、negative、予算をaddendumで固定しOwner実験GOを記録する。
3. 管理者が固定5身体＋alias、採用時はG1を生成し、source/body/task/oracle/replayを管理者側で照合。opaque target IDを付け、truth対応、G0後半、G1全量を別封印領域へ置く。全波形・trace・元名は推定器から参照不可。少なくともACL/別processとreadログを実証し、暗号化時は鍵を別管理する。
4. 封印bytesのSHA-256/size、配列shape/dtype、case inventory、封印時刻を先に公表。管理者が作ったrest HU/fit magnitude投影だけを推定側へ渡す。candidate辞書は規定の選択肢として別管理する。
5. **全条件の**fit距離・C_fit・代表・g/s_ref/ε・coverage・失敗・実装/入力SHAをprediction bundleに保存しSHAを提出して変更不可にする。T-H/T-W/全secondaryを、いずれのhold-out開封よりも前に一括固定する。
6. 先にTのG0 hold-outを開き、全候補残差とC_fit候補の検証結果を保存・封印。G1のbodyを選び直さない。
7. T-M採用時のみ、次にG1を開き、凍結候補の予測を検証・結果封印する。
8. 最後にtruth対応を開きCore ID/幾何誤差を採点。開封時刻・担当・前後SHA、失敗/未知も全件保存する。

決定論的forward/身体集合は既公開なので、未知の自然発話や秘密の生物学的正解に対する盲検とは呼ばない。独立性は**選択と評価の情報経路の手続き的分離**。管理者側の全量integrity照合を推定器への開封と混同しない。不正read、prediction更新、窓重複、hash不一致はSTOPし、見たものを未見に戻さない。

## 8. oracle・replay・工学受入（FZ10）

| 検査 | 登録責務・許容差 |
| --- | --- |
| Core identity | §2の親/receipt/hex幾何をexact照合、aliasは同じM0 ID/digest |
| 形状oracle | OD-1独立式、最大log法則残差≤1e-12、正/有限/長さ不変。snapshotのlog-area合成残差≤1e-10 |
| transfer oracle | 直接行列積/逆向き負荷再帰/Core loaded HU/proxy。137格子＋既存35倍音で max ∣x−y∣/max(∣y∣,1e-12)≤1e-9。位相残差も保存。対象はrest、Tの3snapshot、採用時T-Mの6probe |
| fresh replay | trusted Core receipt/source/taskから別実行native Paを作り全波形相対L2≤1e-12。全T/T-M/aliasが対象。saved PASSやraw/WAV/manifest間hashだけで通さない |
| source evidence | 実行時lf_fixed再生成との実行内SHA一致。sourceとtask実行refを保存。recomputed-sourceと過去actual evidenceは別kind |
| M0 regression | 既存1e-9Pa量子化signature dc14c78bcc6d4a19c11fe2a01ba84b1394802b66626f4dfa27cc582c741e714e 一致。exact float64 SHA差は環境証跡として記録 |
| 観測器fixture | 零/定数/既知bin正弦、HU同一/閾値境界、短区間、NaN/Inf、窓端、PCM、gain保持を解析値・別の直接DFT計算と照合。有限量toleranceはabsolute/relative各1e-12、≤境界/UNKNOWN分岐はexact。満たせなければ工学HOLD |

静的oracleはOD-1 check_transfer相当で、同方程式の実装独立性を確認するもの。生体の独立モデル検証ではない。T-HはExp009の通常peak scanより低い帯域端100Hzを含むので、同α/同負荷の一様管解析chain matrix fixtureで確認する。targetと辞書を同コードで作る自明なlookup一致を検証の代用にしない。

新実装は観測/照合/orchestrationに限り科学forwardを変えない。既存pin拘束、投影能力、数式適合のどれかが成立しなければSTOP。fixtureのexact SHA/入力/期待値/結果/独立検算者はaddendum。G0の7 feature methodはDEFINED_NOT_VALIDATEDのまま、合否に流用・昇格しない。

## 9. 必須negative/control（FZ11）

原証跡・mutation・期待分岐・実際の拒否理由・call数を保存する。科学primaryを読む前に全件受入を要する。事後の手動裁定で検知できたことにしない。

| ID | mutation/対照 | 期待分岐 |
| --- | --- | --- |
| N01 | nullを別Core ID/別身体扱い、c4/c8を正解分類 | IDENTITY_MISMATCH。正しいaliasは同一M0として合格 |
| N02 | label/receipt交換、opaque対応だけ書換え | hash/receipt/truth mappingで拒否。対応も保存した単なるopaque名変更は結果不変 |
| N03 | target truth/trace/source/HUをT-Wへ混入 | OBSERVATION_PRIVILEGE_LEAK、allowlist外拒否 |
| N04 | source再生成SHAを過去actual-run evidenceに昇格 | SOURCE_EVIDENCE_KIND_MISMATCH |
| N05 | α=.4とLRFの混在/交換 | FORWARD_CONTRACT_MISMATCH |
| N06 | Zin/HU/Hp、参照面、複素/振幅のみを交換 | OBSERVATION_CONTRACT_MISMATCH |
| N07 | 窓重複、中心で分割、padding追加 | WINDOW_CONTRACT_MISMATCH、17/12窓とsample集合で拒否 |
| N08 | hold-outでg/s_ref/ε再fit、EQ等 | FIT_STATE_CHANGED、prediction bundle不一致 |
| N09 | 同長の別rawへ置換しWAV/manifest/hashも協調捏造 | fresh body-driven replayでPHYSICAL_REPLAY_MISMATCH |
| N10 | NaN/Inf/空/全零/長さ違い/窓なし | INVALID/UNKNOWN。成功距離や非同定の確定判断へ変換しない |
| N11 | r=.95、非canonical値、c範囲外、未対応source | UNSUPPORTED。clipや代替で救済しない |
| N12 | cap、途中ファイル、候補1件欠落 | CAP_REACHED/INCOMPLETE/UNRESOLVED。成功やsingletonへ変換しない |
| N13 | 候補逆順、正当なmetadata-only改名 | 候補別距離/受容集合不変、tieのみ固定順 |
| N14 | T-M未対応候補を黙って除く | COVERAGE_INCOMPLETE、転移成功を拒否 |
| N15 | source blob/封印hash/prediction変更 | SOURCE_DRIFT/SEAL_MISMATCH、STOP |
| C01 | 同一観測自己比較、閾値境界/直外 | zero残差と≤境界受容、直外拒否。truthは推定入力にしない |

N09に最大1回の追加fresh M0 replayを割り当てる。他は保存済み工学fixture/固定配列/契約mutationとし、新しい全身体suiteを回さない。追加計算が必要なら全capへ算入して超過前STOP。必須分岐は本書で固定し、exact fixtureはaddendumへ残す。

## 10. 実測予算・採否提案・cap（FZ12）

### 10.1 既存コードの単発計測

実行順は tools/od2_body_cli.py::_load_context() → exp.EXP26.EXP13.build_sources() → exp.evaluate_condition(parent.prepared,source,label="reverse-budget-M0-G0-only")を**1回** → OD-1 check_transfer(exp,parent.rest)を**1回**。time.perf_counter()で各工程を囲んだ。Core変更なし。逆推定器・全距離表・摂動器・G1を実装/実行していない。元の工学rawを正式targetへ流用しない。

| 項目 | 実測 |
| --- | --- |
| context/pin検査 | 0.138715484秒 |
| source build | 0.042272389秒 |
| **1 M0/G0 render** | **0.354927387秒、102 acoustic calls** |
| **静的oracle 1unit** | **0.004489088秒**。137格子＋35倍音のdirect/recurrence/Core HU/proxy一式 |
| raw payload | 24,000 float64 = 192,000 bytes（npyヘッダー別） |
| 環境 | Python3.12.14、NumPy2.4.6、Linux6.18.57 x86_64/glibc2.41、Xeon Platinum8573C、logical CPU9 |
| 工学検査 | M0 quantized regression一致、oracle最大残差5.346064193e-15 |
| 科学評価 | 逆推定0、G1 render0、受容集合未計算 |

単発M0による外挿で、全case最大時間やOwner PC速度の実測ではない。実施環境の再確認でrenderを行う場合も下表へ計上し、隠れた追加枠にしない。

### 10.2 全物理呼出しを数える

1 render相当=24,000 samplesのfresh full physical calculation（102 transfer calls）。wrapper/保存ファイル数ではなく**内部の二重実行も数える**。

| 作業 | T only | T＋T-M（推奨） |
| --- | ---: | ---: |
| 今回の既知工学M0 | 1 | 1 |
| Tの5 unique G0＋別process alias2 | 7 | 7 |
| OD-3 G0内蔵inherited regression追加分 | 0 | 3 |
| T fresh replay（上記追加分も含む） | 7 | 10 |
| G1 3身体＋各fresh replay | 0 | 6 |
| N09の追加fresh replay | 1 | 1 |
| **総render数・cap** | **16** | **28** |
| **静的oracle unit cap** | **48** | **84** |

T-M採用時、TのM0/c4r1.10/c8r0.90原本を既存OD-3 _render(...,"G0")から得る。同関数は返却rawの1回に加えinherited referenceを内部で1回作るので追加3回。これをT辞書へ再利用し、**OD-3 suiteを別に重ねない**。replayも同構成。G1は内部G0回帰なしで各1回。science分26＋今回工学1＋N09の1=28で、自由な追加再試行枠はない。

oracle単位は§10.1の全束。Tは5身体×(rest+3snapshot)+alias2rest=22、原本/replayで44。T-Mは3身体×6probe×原本/replay=36追加。工学1＋negative用最大3を加えて48/84。失敗呼出し・再計算も数える。T-Mのcandidate G1 cacheは全3身体だけとし、複数targetから同じ候補を参照しても再renderしない。B_M外を新規生成して埋めない。

### 10.3 外挿とT-M採用推奨

1回ごとにcontext/sourceを再準備する保守的外挿式：

N_render×(0.138715484+0.042272389+0.354927387)+N_oracle×0.004489088。

| 条件 | 計算外挿 | 暫定wall（20倍＋比較/保存等300秒） |
| --- | ---: | ---: |
| T only（16/48） | 8.790120秒 | 475.802408秒（約7.93分） |
| T＋T-M（28/84） | 15.382711秒 | 607.654213秒（約10.13分） |
| T-M追加 | 6.592590秒 | 131.851806秒（約2.20分） |

20倍/300秒は実測でなく予算余裕の設計値。未実装の比較器/IO/封印速度を保証しない。全28rawでも5,376,000 bytes（約5.13MiB）＋WAV/観測/trace/log。通常payloadの計画枠64MiBも未実装の見積りであり保証値ではない。

**T-M採用を推奨する理由:** 隠れたG0回帰を含めても総28render。暫定wallはcapの約8.44%、追加は約2.20分。既存能力のまま限定運動転移を調べられる費用と判断する。科学的成功の予測ではない。Ownerがこの数字で採否を凍結し、実施環境の確認がcapに入らなければscience run前にHOLDする。

### 10.4 固定capと停止

- T-M採用：render28/oracle84。T-only：16/48。今回消費済みの1render/1oracleを含む総計。開始時に残枠を明示する。
- 実験GO後のdriver起動から終了/検証/保存まで **wall7,200秒（2時間）**。休止時間を差し引かない。今回の工学計時は別時刻記録。依存取得等の準備時間も別記録する。
- run領域のinputsコピー/raw/WAV/観測/cache/truth/seals/log/一時出力全量 **2GiB=2,147,483,648 bytes**。領域外退避で回避しない。インストール環境は別inventory。
- **有料計算0円**。追加課金サービスなし。
- 開始前に全必要数/保存見積りが残枠に入ることを確認し、実行中は物理call数/monotonic clock/保存量を監視。cap前に新規処理停止、到達時は中断・部分保存。強制終了も成功に変換しない。
- source/identity不一致、oracle/replay/negative失敗、非有限、封印破損、依存不足もSTOP。capや工学失敗を生理的非同定と断定しない。自動追加試行なし。

## 11. 成果物と報告（FZ12・FZ13）

| 成果物 | 必須内容 |
| --- | --- |
| manifest/inventory | 登録/採否/GO refs、Core/実装/依存SHA、全file size/byte SHA-256、配列dtype/shape/order、担当/時刻/環境、cap実績 |
| 候補readback | 5bodyのreceipt/親/digest/hex幾何、alias、source/G0/G1/load/observer refs |
| 検証証跡 | oracle全残差、fresh replay、source evidence kind、工学fixture/negative、全call数 |
| fit/prediction | opaque ID、全距離/残差、g/s_ref/ε、C_fit/代表/coverage/失敗、凍結SHA、経路別 |
| hold-out/採点 | snapshot/窓全残差、C_holdout/joint集合、Core ID/幾何誤差、truth mapping、開封順、UNKNOWN/拒否/停止全件 |
| module台帳 | S3有限回収/曖昧/未解決、S1/S2可変身体自由度0、S4/C1固定or限定G1、S5未モデル、S6登録外、S7固定、E1/E2固定proxy |
| 結果本文 | 完了/成功/能力採用を分離、工学既知出力・cache再利用・同方程式oracle・preview依存の留保 |

研究候補記録にINFERRED / IN_MODEL_SYNTHETIC、来歴、制限、全受容集合を付す。truthはSYNTHETIC_TRUTH別票。bodyとperformance/source/observer/gainは別オブジェクト。無い生理パラメータへ値を入れずCharacter/Take/BodyRevisionを発行しない。

全登録case/対照が揃いMuseが検算できれば、回収不能/曖昧も研究完了になり得る。欠測はPARTIAL/UNRESOLVED。成績の良い経路だけで全体PASSとしない。

## 12. 主張文案と段2gate（FZ1・FZ14）

採用済み回答§6.1を継承し、採否/実際の件数/例外を埋める。

**回収時:** 「固定LF100・固定G0・指定された端子/proxy/研究レンダラーと、既存OD-2閉カタログの範囲で、指定の観測から生成身体のCore IDを回収し、未使用時区間/指定運動条件での観測を所定の残差内で再現した。」T-H/T-W raw/各secondary/T-Mを分ける。T-M不採用なら指定運動条件の達成を含めない。

**曖昧時:** 「指定の観測分解能と許容差で複数の身体候補が受容された。音響的な再現性と幾何学的な回収を区別し、この候補集合の中から編集可能な代表を選べるが、元の身体を一意に得たとは主張しない。」

**不成立時:** 「この登録条件では受容可能なカタログ候補を得られなかった」または「計算/検証が完了せず未解決」と理由を記す。有限集合の不成立から任意身体の不存在・生体の非同定を主張しない。

**非主張:** 実在出演者の声道形状、声帯寸法/質量/剛性、肺/気流、解剖、実在演技の同定、知覚の核/自然音質/可愛さ/話者性/自由編集/未知発話の達成、一般16断面の一意同定、LRF/組織物性の回収。T-Mは3身体×既知20ms遅延への転移まで。

**段2はHOLD継続。** T-Wに成功範囲があり段0に対応観測域がある場合のみ新設計票の材料にする。source未知/録音伝達/複数発話でのbody-motion分離/真の発話hold-out/必要capabilityを別登録しMuse審査・Owner個別GOを要する。T-H成功、candidate完成、T-M合格、段1完了を自動GOにしない。

## 13. FZ対応と実施前addendum

| FZ | 今回の科学的登録箇所 |
| --- | --- |
| FZ1 module/主張/競合結果 | §1・§11–12 |
| FZ2 T/T-M/L・全case/alias | §0・§2・§4・§6 |
| FZ3 receipt/親/幾何/可変集合 | §2・付録A |
| FZ4 source/task/α/端子/proxy | §3 |
| FZ5 観測権限 | §4・§7 |
| FZ6 帯域/窓/FFT/分割/gain/floor | §5 |
| FZ7 距離/受容/二空間/候補集合 | §5–6 |
| FZ8 noise/量子化/seed | §4.1–4.2 |
| FZ9 封印/開封/再利用 | §6–7 |
| FZ10 oracle/replay/許容差 | §8 |
| FZ11 negative/control | §9 |
| FZ12 cap/停止/欠測/報告 | §10–11 |
| FZ13 pack/identity/source evidence | §2–3・§11 |
| FZ14 段2gate | §12 |

**実施前addendum（未記入のまま実施禁止）:**

1. 実装後に存在する候補投影/比較器/STFT/独立DFT/封印開封/driver/negative fixtureのexact commit/blob/file SHA-256、全dependency closureとlock。
2. OS/CPU/runtime/NumPy/BLAS/thread設定、実装受入fixtureと独立検算原証跡、source pin/M0 regression、実際のcall accounting。
3. PCG64 seed→arrayのbyte仕様（little-endian float64/C-order、24,000点）と全z配列hash。file/decoded arrayのhash scope、全case inventory、opaque対応の封印hash。
4. 保存先、権限境界、封印/推定/検証担当、開封ログ、prediction bundle immutable化。
5. **OwnerのT-M採否・科学条件凍結記録**、実施環境での費用確認と残枠、別実装GO/工学受入/別実験GO refs。

addendumは閾値・権限・case数・候補集合・開封順・capを結果後に変える欄ではない。現状は**起草完了・Muse検証待ち・Owner凍結未決**。

## 付録A. source blob同一性証跡

[研究ピンのtree](https://github.com/ryonakayama234/morphoacoustics/tree/b2ec608fb19135ea2343c0416c790828e3820ba2) と正式B1ピンのtreeを読み、下記50件を照合した。計測用に取得した47件のbytesも一致。catalog/catalog tool/OD-1 freeze文書の3件は参照証跡で、今回の計時関数から実行していない。製品の全機能互換性を認定する表ではない。

| Core path | Git blob SHA-1 | B1 b5dc95d同path |
| --- | --- | --- |
| contracts/performance/v1/semantic_validation.py | `c1c18f8a43fa0566478faeadd09b757fcbc1a7ea` | 一致 |
| experiments/008_event_trajectory/run.py | `98b35f067b1ce168896dd9ada2070fc4c3546375` | 一致 |
| experiments/009_fixed_tract_waveform/run.py | `2cb870d6bcca28be8e9db8b32ae83a5b550c82c8` | 一致 |
| experiments/011_gesture_coordination_overlap/run.py | `f437116c420d6af477da5fc4f96e8dc31c2706d2` | 一致 |
| experiments/012_source_renderer_artifacts/run.py | `9390d1adc3b067bbbaab22a7640e013911f5b03e` | 一致 |
| experiments/013_parametric_source_prosody/run.py | `a30cd3b190a5a83f870be1357737667911999ca2` | 一致 |
| experiments/023_static_vowel_calibration/run.py | `68dd075a8aba8b5f5c9e17abf9cf3e5a8ab1cd21` | 一致 |
| experiments/026_moving_vowel_transition/run.py | `8815c70449ea307a3d439ac24eb1476d5952a247` | 一致 |
| experiments/027_task_field_vowel_transition/run.py | `134ccd3607f68c97ccaa9a10b1ec42eb35240110` | 一致 |
| experiments/027_task_field_vowel_transition/wolfram/v3a_oracle.json | `5d52cfc1c5df395d92e207a645e2229f1f68d0ed` | 一致 |
| experiments/027_task_field_vowel_transition/wolfram/v3a_oracle.wl | `075cfa0a5655966c4debf69f2694bcb76a66f263` | 一致 |
| experiments/028_task_field_morphology_transfer/frozen_reference.json | `7810dfbb72cb6c41af007db6e9d51c58cad9a522` | 一致 |
| experiments/028_task_field_morphology_transfer/run.py | `a5bb9a70a58f5ec0f61c3c5f4df1e4dd9bc3e686` | 一致 |
| experiments/028_task_field_morphology_transfer/wolfram/v3b_oracle.json | `0b6bb759cc634d6853963c39ad437b28ad451624` | 一致 |
| experiments/028_task_field_morphology_transfer/wolfram/v3b_oracle.wl | `0223693712a69248ccb07fb365fa9d38b8de7514` | 一致 |
| experiments/029_task_field_embodied_infeasibility/run.py | `8d911d6a9d7f2dce556b1fd57439e74b3ff07269` | 一致 |
| experiments/029_task_field_embodied_infeasibility/wolfram/v3c_oracle.json | `91e8041568bf61c8f828a32176b72f720e4bd646` | 一致 |
| experiments/029_task_field_embodied_infeasibility/wolfram/v3c_oracle.wl | `eaa6ab82805db55a84a6141fd3b39f5539cbc4b1` | 一致 |
| experiments/od1_local_shape/oracle.py | `19152cf9a6a9a70b0cf251325ddacdcec1853317` | 一致 |
| experiments/od1_local_shape/run.py | `5ef1c4605a5a0e5c2490aa3e8ec79a7c23a0aaea` | 一致 |
| experiments/od3_body_performance/run.py | `8cf5016e35ebc3fc2e5c261c0a69a04141d08f72` | 一致 |
| src/morphoacoustics/__init__.py | `be995aa23576776986a42aafc8dafeb1eac195a1` | 一致 |
| src/morphoacoustics/acoustics/__init__.py | `8a4f37d163767f40bedbcbb52310775c6c1d3467` | 一致 |
| src/morphoacoustics/acoustics/backend.py | `92768d16c9f13274f2fdf37eeb0884d35882adaa` | 一致 |
| src/morphoacoustics/acoustics/protocol.py | `9812980b517ae4398dda15bfda179fd89a620182` | 一致 |
| src/morphoacoustics/acoustics/segmented_tube.py | `e51957e292b7f46a7ecb29b500ae054fbae7c1ed` | 一致 |
| src/morphoacoustics/acoustics/uniform_tube.py | `8bceaf1426c2aec56eea91e2148cd402998516f2` | 一致 |
| src/morphoacoustics/domain/__init__.py | `0d8803276fdf28c08db84f03c376d497f9f8fa49` | 一致 |
| src/morphoacoustics/domain/creature.py | `94afb311ef59d04369f43b4b45c184770ca0ddf6` | 一致 |
| src/morphoacoustics/domain/gesture.py | `782d3bdde829d0a3506beed490a78cc82dc13d0d` | 一致 |
| src/morphoacoustics/domain/result.py | `3408f6f0ff2a745511e8705360e28204fc6e5ba1` | 一致 |
| src/morphoacoustics/integration/__init__.py | `2de45bcad613f6c643906d7b8336863fd8e37b4e` | 一致 |
| src/morphoacoustics/integration/body_presets.py | `1402393208fa4b1b154d6b18a20f9ca8dbddc1cd` | 一致 |
| src/morphoacoustics/integration/limited_live.py | `aa729fb644043b80056a000f9ed5d302fe39125a` | 一致 |
| src/morphoacoustics/integration/shared_timeline.py | `a1ed908352fd7f9ed8f67bb251399b73f955a2f7` | 一致 |
| src/morphoacoustics/physical/__init__.py | `7eb2eb01dab33256dd6b289c42a4545f6ba4a496` | 一致 |
| src/morphoacoustics/physical/tract1d.py | `62f3ddf6d3cbf2e43072f9d8b2be6ee84f4c3ca7` | 一致 |
| src/morphoacoustics/preparation/__init__.py | `26e992bba685d989861361120be6f64d38accb3e` | 一致 |
| src/morphoacoustics/preparation/protocol.py | `72a6a536e5dd1800aac1328c3b84026bacad896e` | 一致 |
| src/morphoacoustics/preparation/tract1d.py | `90860b19a6b181ba88ff3d4a01379c10ab23e226` | 一致 |
| src/morphoacoustics/realization/__init__.py | `469760748767b788f051a50dc152d513cb704c58` | 一致 |
| src/morphoacoustics/realization/protocol.py | `63f999fbda3ba0197ee585897e2253007731665a` | 一致 |
| src/morphoacoustics/realization/tract1d.py | `87adb91ebe3ca2a3e2b36931f9d12d94c2ee7e0b` | 一致 |
| src/morphoacoustics/simulation/__init__.py | `6d65e6e2eb2d4a02275073a607608c0736b77b92` | 一致 |
| src/morphoacoustics/simulation/snapshot.py | `8c3da24a1fd40a82c95bbd2b38d9e3aa6a65f2a9` | 一致 |
| tools/cc_a2_live.py | `dd90ab5e83082c0da1b2f527288f7154bdd38aae` | 一致 |
| tools/od2_body_cli.py | `f95984c88999bf6963bc0031a56a1423795cca8f` | 一致 |
| tools/od2_b1_catalog.py | `6b8e12faf9a00e6a6999ef0fb9aa7941474ccc25` | 一致 |
| contracts/body/od2-b1/catalog-v1.json | `16332235c2023f2c3f37a90b03528553ffdb07a8` | 一致 |
| docs/research/od1-organ-shape-assembly-20261101/A0_A3_FREEZE_20261101.md | `b7ee5bb03cfbaffd29ffeff3fe73a8e20d4972bd` | 一致 |

## 付録B. 単発費用測定の原記録

計測JSONからsource inventory（付録A）だけを除いた原数値。raw/sourceのexact SHAはこの工程・環境の証拠で、過去actual-runや正式targetに読み替えない。時刻は計測hostのUTC記録。

~~~json
{
  "kind": "ENGINEERING_BUDGET_ONLY",
  "core_commit": "b2ec608fb19135ea2343c0416c790828e3820ba2",
  "utc": "2026-11-14T04:11:29.640472+00:00",
  "python": "3.12.14",
  "numpy": "2.4.6",
  "platform": "Linux-6.18.57-x86_64-with-glibc2.41",
  "cpu": "INTEL(R) XEON(R) PLATINUM 8573C",
  "logical_cpu_count": 9,
  "context_s": 0.13871548399993117,
  "source_build_s": 0.04227238900011798,
  "one_M0_G0_render_s": 0.35492738700031623,
  "render_acoustic_calls": 102,
  "one_static_oracle_unit_s": 0.004489088000354968,
  "oracle_unit": "OD1 check_transfer(M0 rest), grid137 + harmonics35; direct+recursive+actual+proxy",
  "oracle_checks": {
    "grid_relative_complex_error": 5.346064192806551e-15,
    "grid_phase_error_rad": 5.048199598000937e-15,
    "harmonics_relative_complex_error": 2.8420906819779065e-15,
    "harmonics_phase_error_rad": 2.5153633513145666e-15
  },
  "raw_shape": [
    24000
  ],
  "raw_bytes": 192000,
  "source_sha256_le_f64": "724412c20feddd9e00112cc362bac56bd8aa428670c5dcb789461df858b512fc",
  "task_plan_sha256": "17148dea27e59abfb626b149beebcc7893d4ff9ba04ce4cf3af9ad408ce8a7bf",
  "raw_sha256_le_f64": "86661ece1cd7a5f451b8185bad5b9578ad5ec0ccbc6da1ef5296137be79adcda",
  "quantized_regression_matches": true,
  "scientific_inverse_trials": 0,
  "G1_renders": 0,
  "holdout_opened_for_inference": false
}
~~~
