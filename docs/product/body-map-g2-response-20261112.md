# BODYMAP-G2-R-20261112-01 — B2 受動損失の事前登録：設計回答

**回答日:** 2026-11-12 JST  
**回答者:** Research Lead（ChatGPT）／ **審査:** 監督者 Muse ／ **採否・各 GO:** Owner  
**対象:** [質問票 BODYMAP-G2-20261112-01](body-map-g2-questions-20261112.md)、[Draft PR #62](https://github.com/ryonakayama234/morphoacoustics-studio/pull/62)、[Issue #61](https://github.com/ryonakayama234/morphoacoustics-studio/issues/61)  
**入力固定:** Studio main `0505ce28d68b5a52f58a681bc083ca074bb93e86`、質問票 head `25f5427acd30ba543a76d8983efdff8cecc8c58e`。  
**状態:** **DESIGN_PROPOSAL / NOT_ADOPTED / NOT_IMPLEMENTED / NOT_RUN / NO_GO**。本文の提案値は観測結果ではない。事前登録の採用、実装 GO、実施 GO は別判断である。Core/Studio の実装・実験、B1 P2、OMA 語彙の昇格、凍結済み G0 の改変を含まない。

## 0. 結論、証拠の区分、凍結単位

**処方 [H]:** 剛壁円形断面の低 reduced-frequency（LRF）等価流体モデルを、Core の新しい研究用計算経路で検証する。粘性による**直列インピーダンス**と熱伝導による**並列アドミタンス**を組にして追加する。複素波数だけを変え、特性インピーダンスを無損失のまま残す方法は採らない。初回は **M0 の rest snapshot** と解析照合用の一様円管だけに限定し、M1・OD-2 形状介入・発話中の時変断面は後続の別事前登録とする。

- **[F] 確認事実:** 下記の正本・ソースの読取りで確認した限定事実。既存の数値結果を再実行した意味ではない。
- **[H] 設計処方:** 本文の数式選択、実験、許容差、関門。採用前は効力を持たない。
- **[U] 未検証:** 新モデルの数値実装、実際の損失効果量、実在声道への妥当性、知覚・音質。本文には新規シミュレーション結果はない。
- **【凍結候補 FZ-*】:** 事前登録として採用を提案する規範項目。それ以外の将来案・説明と区別する。全 FZ と MQ の裁定を含む**特定の文書改訂＋内容 SHA-256**を Owner が採用して初めて凍結となる。未決事項を残したまま実施 GO に進まない。

採用候補 ID は `BODYMAP-B2-PREREG/1`、損失則 ID は `b2.lrf.circular-rigid-isothermal/1`、検証手続 ID は `b2.direct-observables/1` とする（いずれも**提案 ID**）。後者は G0 の特徴量 method の改版・検証済み認定ではない。

### 0.1 確認された前提と、見落とせない既存減衰 [F]

1. G0 の採用権威は [成果物 E](bodymap-g0-E-adoption-record-20261111.md)。A–D の冒頭に残る PROPOSAL 等の旧見出しより E の採用記録を優先する。`take-metrology-pack/0` は凍結済みの**論理的 sidecar 契約**であり、runtime schema／validator の実装完了を意味しない。特徴量7件はすべて `DEFINED_NOT_VALIDATED`。
2. [Fidelity 0 契約](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/docs/fidelity-0.md) と [UniformTube](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/src/morphoacoustics/acoustics/uniform_tube.py) は静止・剛壁・無損失・source-free、既定端子は理想圧力開放。既存の有限抵抗端子付き波形経路とは別の条件である。
3. 一方、既存の [Exp009](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/experiments/009_fixed_tract_waveform/run.py) と [OD-1 oracle](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/experiments/od1_local_shape/oracle.py) には **`ATTENUATION=0.4 Np/m`、`k=ω/c−j*ATTENUATION`** がある。これは既存研究波形経路の一様な現象論的減衰であり、流体物性・管径から導いた粘性熱損失の実装でも、Fidelity 0 本体の損失能力でもない。「Core に粘性熱モデルがない」という前提とは区別する。
4. よって B2 の対照を過去 OD-2 波形そのものとはしない。新経路で一様減衰を **0** に固定した無損失対照と、新しい境界層損失条件を比較する。過去の `.4` を上書きせず、重ねて二重計上もしない。凍結済み D/C の過去記述を直す必要があれば別の追記訂正案件とする。

## QB2-1 — 損失モデル

### 1.1 選択と適用範囲 [H]

円管の no-slip・等温壁に対する粘性／熱拡散の断面平均応答から等価密度・圧縮率を作る LRF を採る。薄い境界層だけの漸近式より管径依存を明示でき、粘性と熱の寄与を別々に監査できる。[Tijdeman 1975](https://www.sciencedirect.com/science/article/pii/S0022460X75802069) は shear wave number と reduced frequency による適用域の区別を整理している。[NASA TP-2601, Appendix C](https://ntrs.nasa.gov/api/citations/19870004851/downloads/19870004851.pdf) は直列 Z／並列 Y と伝送行列の構成を与える。[COMSOL の LRF 説明](https://doc.comsol.com/6.4/doc/com.comsol.help.aco/aco_ug_pressure.05.186.html) も断面・境界層厚と波長の分離を要求する。これらは手法選択の根拠であり、下記の数値 envelope を実証済みにするものではない。

**【FZ-M1：モデル envelope】** 線形・小振幅、平均流なし、均質な単相流体、静止した剛壁、円形断面、直列のみ。断面内の圧力を一様と近似し、断面の半径を `a=sqrt(S/π)` とする。面積だけから未知の周長を推定した実解剖モデルとは呼ばない。初回の宣言域は `a=0.006…0.019 m`、各区間長 `L=0.010 m`（一様参照管は全長0.160 m）、`f=100…800 Hz`。全区間・全格子で次を満たすことを事前検査する。

- `k0*a ≤ 0.30`、`k0=2πf/c`。
- `k0*δv ≤ 0.01`、`k0*δt ≤ 0.01`。
- `max(δv,δt)/L ≤ 0.05`。
- `δv=sqrt(2μ/(ρω))`、`δt=sqrt(2κ/(ρ cp ω))`。

これは保守的に選んだ**設計上の制限**であり普遍的な精度保証閾値ではない。M0 の段差では p/U 連続の理想接合を使い、局所3D流れ・端部補正・段差散逸はモデル化しない。LRF が段差近傍の実流体を検証したとは言わない。DC、Nyquist、800 Hz超、閉塞、任意非円形、分岐、動く断面、乱流、非線形、bulk absorption は対象外。域外を同じモデルで黙って埋めない。

### 1.2 数式・符号・合成 — 【FZ-M2】

`exp(+jωt)`、`U` は inlet→outlet に正の**体積速度 [m³/s]**、ピーク複素振幅、状態 `[p,U]`。行列は outlet→inlet を写す。区間ごとに次を定義する。

```math
q_v=a\sqrt{-j\omega\rho/\mu},\qquad
q_t=a\sqrt{-j\omega\rho c_p/\kappa},\qquad
F(q)=\frac{2J_1(q)}{qJ_0(q)}.
```

```math
\rho_e=\frac{\rho}{1-F(q_v)},\quad
C_e=\frac{1+(\gamma-1)F(q_t)}{\rho c^2},\quad
z_1=j\omega\rho_e/S,\quad y_1=j\omega S C_e.
```

`z1` は単位長さ直列インピーダンス [Pa·s/m⁴]、`y1` は単位長さ並列アドミタンス [m²/(Pa·s)]。`Ce` は流体圧縮率 [Pa⁻¹] であり**壁コンプライアンスではない**。

連続な null 介入は μ や κ のゼロ除算で作らず、基準と完全モデルの受動な分布係数の補間とする。

```math
z_0=j\omega\rho/S,\quad y_0=j\omega S/(\rho c^2),
\quad z_\lambda=z_0+\lambda(z_1-z_0),
\quad y_\lambda=y_0+\lambda(y_1-y_0).
```

`0≤λ≤1`。`λ=0` は z0/y0 を**直接**使う。λ はモデル上の散逸・分散寄与の介入係数であり、ヒトの材質・温度・「損失の割合」を同定した値ではない。λ=1 だけがここで指定した完全 LRF 条件。λを変えても基本媒体、形状、端子、source は固定する。

```math
\Gamma=\sqrt{z_\lambda y_\lambda},\qquad
Z_c=z_\lambda/\Gamma,\qquad
T_i=\begin{bmatrix}
\cosh(\Gamma L)&Z_c\sinh(\Gamma L)\\
\sinh(\Gamma L)/Z_c&\cosh(\Gamma L)
\end{bmatrix}.
```

`Γ` は `Re Γ≥0`、無損失極限 `Γ=+jω/c` に連続な枝を選ぶ。`Zc` を独立に平方根して符号不整合を作らない。有限精度で枝が決まらなければ `NUMERICALLY_UNRESOLVED`。`T=T1…T16=[A B; C D]`。λ=0 は Fidelity 0 の cos/sin 形へ戻る（有限抵抗端子は別指定）。相反性の `det T≈1` だけで受動性を認定しない。

**端子は全条件で同一:** `R=0.05 ρc/S_last` [Pa·s/m³]、`p_out=R U_out`。S_last と物性がペア内で同じなので実効 R も同じ。理想圧力開放、放射インピーダンス、新しい end correction へ置換しない。

```math
H_U=U_{out}/U_{in}=1/(CR+D),\quad
Z_{in}=p_{in}/U_{in}=(AR+B)/(CR+D).
```

既存と同じ名目0.20 mの観測作用素を使う。

```math
H_p(f)=\frac{j\omega\rho}{4\pi r}\exp(-j\omega r/c)H_U(f),\quad r=0.20\ {\rm m}.
```

`Hp=p_proxy/Uin` [Pa·s/m³]。これは既存の **monopole pressure proxy** の継承であり、R の散逸電力と proxy の球面放射電力が等しいというモデルではない。受動性の系境界は管と抵抗端子までとし、proxy を負荷として再結合しない。

### 1.3 パラメータと出所 — 【FZ-P1】

| 項目 | 凍結候補の値・意味 | 出所／資格 |
| --- | --- | --- |
| ρ、c | `1.21 kg/m³`、`343 m/s` | 既存 Core/OD-1 と同じ。物理定数の普遍値・当日の実測値ではない |
| μ | `1.81e-5 Pa·s` | Lead が選ぶ丸めた空気相当の**数値検証 preset**。測定値や文献表の厳密転記と称さない |
| κ | `0.0257 W/(m·K)` | 同上。流体の熱伝導率であり壁材の熱伝導率ではない |
| cp、γ | `1005 J/(kg·K)`、`1.40` | 同上。`cv=cp/γ`、`Pr=μ cp/κ` は派生値として保存 |
| T_ref | `293.15 K` | preset の名目温度ラベル。温度掃引や温度からの物性再計算は行わない |
| K_s、p_ref | `K_s=ρc²`、`p_ref=ρc²/γ` | ρ,c,γから導出。別に101325 Paを重ねて不整合な独立指定をしない |
| 壁条件 | `rigid / no-slip / isothermal perturbation T'=0` | 機械的に剛、熱的に理想熱浴。有限の壁熱インピーダンスは対象外 |
| 一様減衰 | `0 Np/m` | B2 対照ペアのみ。既存 `.4` のコード・結果は保存 |
| λ | `0, 1e-6, 0.5, 1` | null、null近傍、途中、完全モデル。材料推定でない |

数値の**出所は本提案の nominal preset**であり、厳密な実在乾燥空気・湿った呼気・組織の物性を代表する資格は付けない。NIST の [Lemmon & Jacobsen 2004](https://www.nist.gov/publications/viscosity-and-thermal-conductivity-equations-nitrogen-oxygen-argon-and-air) は空気の輸送係数を物性式から評価する一次資料であるが、この表の数値を同論文で照合したとは主張しない。実測範囲の同定に進む場合は、温度・圧力・湿度・組成と評価式／表・版を別事前登録で固定し、preset を後付け置換しない。

[身体地図 S6](body-module-map-response-20261111.md) との対応は「S3 気柱に付随する**流体境界層の構成則**」。μ/κ を組織の粘弾性係数と呼ばない。`effect.wall_compliance`、`effect.wall_damping`、`effect.tissue_stress_strain` は引き続き UNMODELED。壁変位、弾性率、組織内散逸、筋運動・機械仕事の変数を追加しない。

### 1.4 受動性の保証と検査 — 【FZ-E1】

モデル構成上は no-slip／等温壁、正の輸送係数、`γ>1`、`R>0` を要求する。受動な z/y の凸補間は受動性を保つ。実装ではこれを信じるだけでなく全区間・全周波数・全λで `Re(zλ)≥0`、`Re(yλ)≥0` を検査する。下の数値許容差を越える負値は丸め・絶対値・clip で直さず拒否する。

微分式 `p'=-zλ U`、`U'=-yλ p` から、

```math
-\frac{d}{dx}\left[\tfrac12\Re(pU^*)\right]
=\tfrac12\Re(z_\lambda)|U|^2+\tfrac12\Re(y_\lambda)|p|^2\equiv d(x)\ge0.
```

各内部接合の p/U 連続と向きを保存し、`P_in=0.5 Re(pin Uin*)`、`P_out=0.5 R|Uout|²`、`D_int=Σ∫d(x)dx` を別々に保存する。`P_in-P_out-D_int` を独立積分と照合する。λ=0 は内部散逸ゼロでも **P_out は抵抗端子での消費**でありゼロではない。

加えて、実数正の参照インピーダンス `Rref=ρc/S_in`（両ポート共通）で power-normalized scattering matrix を作り、`σmax(S_scatter)≤1+tol` を全格子で検査する。入射／出射波は `p1=sqrt(Rref)(a1+b1)`、`U1=(a1−b1)/sqrt(Rref)`、`p2=sqrt(Rref)(a2+b2)`、`U2=(b2−a2)/sqrt(Rref)` とし、`[b1,b2]=S_scatter[a1,a2]`。outletのUの向きを入射方向へ取り違えない。ピーク振幅なので入射平均電力は `0.5(|a1|²+|a2|²)`。これで特定負荷だけの検査を補う。有限帯域での検査合格は全周波数の因果性・任意時変系の安定性の証明ではない。本設計は定常周波数領域に限定する。

## QB2-2 — 事前登録候補

### 2.1 仮説と身体／ケース — 【FZ-X1】

**H_math:** 指定 LRF の transfer とパワー収支を、独立計算で許容差内に再現できる。**H_null:** λ=0 で新経路が同じ負荷の無損失計算へ復帰し、λ→0 で連続に近づく。**H_effect:** M0 にて λ=1 と0に事前の数値床を越える帯域内複素応答・圧力差があり、正の内部散逸を伴う。反対仮説は、差なし、帰属不正、利得化、モデル式を再現しない結果である。

| 身体／参照 ID | 固定幾何 | λ、回数、役割 |
| --- | --- | --- |
| `M0_REST` | Core `v3b-axial-M0@1` rest、16×0.010m | 4水準を各1回＋0を独立プロセスで1回再計算。科学主対象 |
| `U6_REF` | 半径0.006m、全長0.160m一様円管 | 同上。単一区間解析参照と16等分の合成を照合 |
| `U19_REF` | 半径0.019m、全長0.160m一様円管 | 同上。半径域上端の参照 |

合計 **12 case evaluations＋3 repeated null＝15**、加えて負の検証 fixture。繰返しは数値再現性用で、生物標本数・統計検定の n ではない。M0 の preparation digest は `sha256:a98d484f8740bf40a419ac117a2deb41ab659dea095577874455aec0713258de`（[Core catalog](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/tools/od2_b1_catalog.py)）。inlet→outlet の直径 mm は `(12,12,26,16,12,14,20,26,30,34,38,34,34,30,28,32)`、`S_i=π(d_i/2000)²`。実装前の入力台帳で Core の rest と全16セルを照合し、差があれば STOP。研究用一様参照管を新しい製品 BodyRevision として発行しない。

**固定4因子:** SOURCE＝既存 `lf_fixed` 100 Hz prescribed source、TRACT＝各ペアの同じ rest、OBSERVER＝同じ0.20m proxyと下記帯域射影、MOTION＝rest保持・実行しない。BOUNDARY 内の唯一の介入はλ。rest-only は「既存あい運動が失敗したから省略」ではなく、本票で先に選ぶ実験条件。M1、OD-2 c4/c8編集、形状×損失の交互作用、時変断面、LF以外の音源、音源の物理変更・再調整は本登録から除外する。

### 2.2 主観測量、raw Pa の厳密な意味 — 【FZ-O1】

**周波数格子は** `100,102,…,800 Hz` の351点、全ケース共通。複素 `HU, Zin, Hp` の Re/Im を保存し、位相を捨てた絶対値だけで認定しない。上記格子を使用する全周波数パワーと内部状態も保存する。

raw の出力は **「100–800 Hz に限定した定常・周期モデル圧力 p_B[n] [Pa]」** と明記する。広帯域の過去 Studio raw Pa と同一の観測条件ではない。既存LF音源の物理・生成器は変えず、[Exp013 build_sources](https://github.com/ryonakayama234/morphoacoustics/blob/b5dc95ddbf00efe423635e8ff73f2b550239cd2b/experiments/013_parametric_source_prosody/run.py) の `lf_fixed` **全消費バッファ**を保存・ハッシュする（48 kHz、24000 samples、0.5 s、seed0）。全条件へ同一バッファを渡す。入力の F0 は観測 F0 と区別する。

DFT は `Q[k]=Σ_n q[n] exp(-j2πkn/N)`。`P_B[k]=Hp(f_k)Q[k]` を上記351点だけに設定し、他の正周波数 bin、DC、Nyquistは**観測帯域射影の定義として**0。Hermitian対称から `1/N` 正規化の逆DFTで実数p_Bを作る。モデル外周波数に損失ゼロの transfer を仮定したわけではない。端点切替え・過渡・有限時間の因果的発話シミュレーションは主張しない。入力と帯域射影、source spectrum、出力をすべて保存する。raw p_B はpreviewゲイン・ピーク正規化を一切含めない。

この射影は全ペアで同じ観測作用素。`observation_plane_ref` と `pressure_generation_method` に帯域・周期定常の定義を含め、既存全帯域 raw との比較は `NOT_COMPARABLE` とする。広帯域の「あい」音声を要求する場合は、本登録の結果を使い回さず適用域・時間領域モデルの別設計が必要。

主要な比較値は `||p_B,λ−p_B,0||₂/||p_B,0||₂` と独立oracleに対する全波形相対L2、複素 transfer の誤差、パワー収支。**G0の特徴量 method 7件は一切合否に使わない。** 共鳴ピーク位置・高さ・半値幅・Qの変化は、固定格子の参考図／探索的注記にとどめる。端のピーク、半値交点なし、多峰性は欠測理由を残す。ピーク低下・Q低下や各周波数の単調減衰は必須合格条件ではない。受動損失の追加でも共鳴の移動で局所振幅が増えることがある。

### 2.3 独立オラクル — 【FZ-V1】

候補計算の行列・Bessel関数・保存された verdict を読み直すだけの検証を禁止する。独立 reviewer 側の実装を別モジュールとして凍結し、以下を用意する。

1. **無損失解析:** 一様管の閉形式 cos/sin、M0 の独立な16区間合成と逆向き負荷再帰。候補の `UniformTube` 出力を oracle の答えとしてコピーしない。既存 Fidelity 0 は同負荷を明示した追加の互換照合相手とする。
2. **LRF別計算:** 候補側は double precision＋scaled Bessel／安定な比。oracle は任意精度の独立 power series `Jν(q)=Σ_m (-1)^m(q/2)^(2m+ν)/(m! Γ(m+ν+1))`（ν=0,1）、400桁と450桁の2評価。候補の special-function や section-matrix helper をimportしない。各級数は最大10000項、現在項の絶対値 `<1e-380` が連続10項で打切り。未収束は `ORACLE_UNRESOLVED`。400/450桁で各無次元化出力差≤1e-30を要求する。
3. **独立な合成:** 下流から `Zup=(A_i Zdown+B_i)/(C_i Zdown+D_i)`、`HU=Π 1/(C_i Zdown+D_i)` を任意精度で計算する。幾何は上記直径とCore正本の一致を検証してから使う。独立oracleの波形は FFT helper の再利用を避け、351点の複素振幅から直接正弦余弦和で復元する。
4. **仕事の照合:** 内部 p/U 場からのD_intを各区間16点Gauss–Legendreと32点で独立積分し、下表の収束条件と境界電力差を照合する。積分値を最初から `Pin-Pout` と置いて自己一致させない。

これは**同じ方程式に対する実装独立性**であって、独立の生体計測による妥当性検証ではない。oracle自身のsource、lock、SHAと数値収束証拠が不足なら候補合格にしない。

### 2.4 数値許容差と結果判定 — 【FZ-T1】

異なる単位をそのまま混ぜない。ケースごとの固定スケール `Z*=ρc/S_in`、`Hp*=ρ*2π*800/(4π*0.20)` を用い、比較量は `HU`、`Zin/Z*`、`Hp/Hp*`。行列は `diag(1,Z*) T diag(1,1/Z*)` で無次元化。以下は**本票で選ぶ検証許容差**であり、既存 OD-2 の閾値を実証なく移植したものではない。

| 検査 | 凍結候補の判定（すべて最大値／全該当点、平均で相殺しない） |
| --- | --- |
| 複素oracle照合 | 各無次元Xで `|Xcand−Xref| ≤ 1e-10 + 1e-8 |Xref|` |
| raw波形oracle照合 | 全24000 samples の相対L2 `≤1e-8`、分母ゼロならUNKNOWN。preview不使用 |
| λ=0 復帰 | 無損失独立oracle／明示R付きFidelity0との各無次元量誤差 `≤1e-12+1e-10|Xref|`、raw相対L2 `≤1e-10` |
| repeated null | 独立プロセス再計算のraw相対L2 `≤1e-12`、同runtime。hash同一性をクロス環境に強制しない |
| λ=1e-6 近傍null | λ=0に対する `max_f |Xλ−X0|/max(1,|X0|) ≤1e-4`、raw相対L2 `≤1e-4`。不成立を「極限だから通る」としない |
| 区間の受動係数 | `Re(zλ/Z*)≥−1e-12 m⁻¹`、`Re(yλ Z*)≥−1e-12 m⁻¹` |
| 全体受動性 | 全格子 `σmax(S_scatter)≤1+1e-9`、`Re(Zin/Z*)≥−1e-10` |
| 電力の基準 | 各周波数で正規化入力 `Uin=1` を使い、`P*=0.5 Z* |Uin|²`。数学的な単位入力で、実際の大振幅駆動の主張ではない |
| パワー収支・積分収束 | `|Pin−Pout−D32|/P*≤1e-8`、`|D32−D16|/P*≤1e-10`、`D32/P*≥−1e-10`、λ=0は `|D32|/P*≤1e-10` |
| 相反性／直列分割 | 無次元行列 `|detT−1|≤1e-8`。一様管1区間対16区間も上記複素oracle許容差内 |
| 数値例外 | NaN/Inf、非正幾何、不明なbranch、非有限source、ゼロraw分母はSTOP/UNKNOWN。分母 `|CR+D|<1e-12` も NUMERICALLY_UNRESOLVED、grid点を削除しない |

**効果判定も先に固定する。** M0のλ=1対0で、`max_f |Hp1−Hp0|/max(Hp*,|Hp0|)>1e-6` **かつ** raw相対L2 `>1e-6` **かつ**少なくとも1格子で `D_int/P*>1e-10` を `EFFECT_DETECTED_IN_BAND` の条件とする。すべての数値正当性・同一性・null・mutation検査合格が前提。λ=.5の結果は全保存するが、局所振幅や効果量の単調性を合否にしない。

判定は二軸で保存する。`IMPLEMENTATION_CONFORMANCE=PASS/FAIL/UNRESOLVED` と `EFFECT=DETECTED/NOT_DETECTED/UNKNOWN`。正しい実装で効果が床以下なら NOT_DETECTED を残し、モデルを誤りと即断しない。逆に差だけ大きくても物理・来歴検査不合格なら成功ではない。欠けた対照・一つでも未解決点・oracle不足がある場合、総合認定をPASSにしない。

### 2.5 null／mutation の拒否証拠 — 【FZ-N1】

| fixture | 変更内容 | 必須の検出先／期待拒否（提案コード） |
| --- | --- | --- |
| NEG-LAMBDA | λを−1または1超、NaN/Inf/boolへ | 入力validator：`INVALID_LOSS_PARAMETER`、正規run・audioを発行しない |
| ACTIVE-ZY | 正常λ=1のz/yの**実部だけ**負へ反転し虚部は保持。入力validatorを越えた故障注入 | 係数・S行列・パワー検証：`NONPASSIVE_MODEL`。負λを入口で弾く試験だけで代用しない |
| SWAP-COEFF | 実計算だけ μを2倍、κを半分、または熱項を除去し、宣言を元のまま保持 | trusted preregとの係数・law版照合と独立oracle：`MODEL_IDENTITY_MISMATCH`／`ORACLE_MISMATCH` |
| SWAP-LOAD | Rを2倍にした出力を元Rと称する | 端子・port照合と独立loaded oracle：`LOAD_MISMATCH`。更新SHAだけでは通らない |
| SWAP-GEOM-PORT | セル順反転、粒子速度をUと偽装、phasor符号・距離・観測帯域の交換 | 幾何と単位・参照面照合、複素位相oracle：`PHYSICAL_IDENTITY_MISMATCH` |
| RAW-FORGE | `p_fake=2*p0−p1`、L2を保ちSHA/manifestも再計算 | trusted source＋幾何＋lawからの独立全波形oracle：`WAVEFORM_ORACLE_MISMATCH` |
| LOSS-IGNORED | λ=1と称してλ=0出力を保存 | λ1の独立oracle、正散逸照合：`ORACLE_MISMATCH`。効果なしという科学結果へすり替えない |
| OLD-ATTENUATION | `.4 Np/m`を混入、または旧OD2 rawをB2 rawと称する | frozen設定・観測条件・独立oracle：`UNREGISTERED_ATTENUATION`／`NOT_COMPARABLE` |
| SHA-SOURCE | source／raw byteを改変、またはRECOMPUTED SHAをactual-run欄へ移植 | bytesと同時実行chain検証：`ARTIFACT_MISMATCH`／`SOURCE_NOT_ATTESTED` |

拒否コードは新経路用の提案で、既存APIに存在するとの主張ではない。全fixtureを必須とし、入力拒否、内部物理拒否、来歴拒否を別記録にする。負のfixtureは本物の身体条件や聴取用音声に混ぜない。各実行のstdout/typed result、拒否段、candidate/oracleのpin、変更したbyte、期待と実際の結果を保存する。

## QB2-3 — 実装経路と段の関門

### 3.1 責務・配置 [H]

**Core研究専用の新パス**を選び、既存 `UniformTube`／`SegmentedTube` のデフォルトやFidelity0 capability、旧Exp009/OD2の減衰を変更しない。候補配置は `experiments/bodymap_b2_passive_loss/` に model・run・independent_oracle・verify・prereg binding を分離する。これは配置の提案であり、このPRでディレクトリやコードを作らない。新パスは既存の immutable rest geometry と固定sourceを**入力として**受け、固有のresearch law/backend IDを出力する。既存backend ID `fidelity0.tract1d` を損失つき計算の実行資格として偽装しない。親restの来歴と新solverの来歴を別欄に記録する。

新経路からStudio Perform／製品adapterへ接続しない。既存固定ソースの読み込みは生成器・推移依存pinを保持し、新しい損失コードを旧frozen package inventoryに紛れ込ませない。既存packageのソース集合チェックを緩める必要が出たらSTOPして分離方法を再設計する。新しい mutable body registry・別のidentity authorityは不要。

**【FZ-G1：受入作業】** (a) frozen入力manifestとsource/geometry binding、(b) z/yモデルと安定な特殊関数、(c) loaded transfer・内部状態・S行列、(d)帯域rawとパワー、(e)独立oracle、(f)拒否fixture、(g)immutable pack writer/readback。candidateの実装受入には全 FZ の検証fixture、一様管解析照合、M0 null、受動性、mutationと既存関連回帰が必要。Fidelity0／CC-A2／OD2の既存テストとsource pinが変更なしで通る証拠を提出する。旧結果を新モデルに置換しない。

### 3.2 門の区切り — 【FZ-G2】

| 門 | 成果物・終了条件 | Owner が別に決めること |
| --- | --- | --- |
| **本ラウンド：事前登録採用** | この回答をもとにFZ全件・MQ裁定を含む登録版、content SHA、監督者設計審査。状態は REGISTERED_NOT_RUN | モデル・観測帯域・数値preset・閾値・対象範囲の採用。採用だけでは実装開始しない |
| **実装 GO** | Core作業計画、変更対象、候補／独立oracleの所有分離、依存lock、チェック計画、予算上限を具体化 | 新research pathの実装と**工学検証fixture実行**だけを許可する。15-caseの本実験実施とは分離 |
| **実装受入・実施準備審査** | actual PR head、実装・oracle・lockのSHA、上記工学検証証跡、pack見本／拒否見本、frozen入力との照合、明示したruntime | 監督者が受入可否を審査。CI greenやマージで実施GOにしない |
| **実験実施 GO** | 最終run manifest、exact clean Core head、oracle head、Python/NumPy/SciPy/mpmathとOS/arch・BLAS等のlock、source/geometry/plane/preset SHA、保存先・実行cap、署名・日時 | **このpinの15-case＋登録済みnegative**を実施する個別GO。上限値・環境未記入ならHOLD |
| **結果審査・限定採用判断** | 全case、失敗・中断を含む証跡、二軸判定、独立監督者再検算、capability amendment案 | research限定採用の是非。Studio統合、B1 P2、OMA昇格は別案件 |

実装検証でM0やλ1の出力を見たら、その結果も**既知の工学データ**として全件開示する。本実験を「初見の発見」や独立標本として扱わない。検証で閾値・式を修正するなら、元の失敗と理由を残した新しい事前登録改訂を監督者審査・Owner再採用し、改訂前データで成功を認定しない。実装GOは科学条件の自由変更を認めるものではない。

**凍結のタイミング:** 数式・物性・ケース・格子・射影・許容差・効果床・refusal規則・oracleアルゴリズムは**新しい候補計算の結果を見る前**に採用。実装後にしか確定しない実行／依存SHAは、条件を変えない実施manifestとして結果前に固定する。環境都合による許容差の緩和は同じ登録のまま行わない。

## QB2-4 — G0 pack、主張、capability

### 4.1 新規研究runの記録 — 【FZ-R1】

[A契約](bodymap-g0-A-measurement-contract-20261111.md) と [B辞書](bodymap-g0-B-pack-schema-proposal-20261111.md) に従う `take-metrology-pack/0` を各runへ付け、比較・判定レポートから両caseのpackを参照する。研究runは `origin_class=NEW_RUN`、実物の `evidence_id`、`take_id=null`（製品Takeでない）とする。拒否・中断にもpack/coverageを残す。新規sidecarを実装する作業は別の実装GO内で行い、凍結契約にruntime schemaが存在すると仮定しない。

| pack の既存位置 | B2で残す内容（提案、既存fieldの意味を変更しない） |
| --- | --- |
| `request_body` | trusted request/body ref＋SHA、親M0と16セル、rest/preparation digest、研究fixture ID、run_core_shaとverification_core_shaを別記、research solver/backend、登録版ref＋SHA |
| `medium_boundary_observer.loss_model` | `b2.lrf.circular-rigid-isothermal/1`、λ、数式・係数manifestのimmutable ref＋SHA。文字列参照として表現し、旧欄を必須の新object型へ変えない |
| `medium_boundary_observer` | ρ,c、剛壁・等温/no-slip、Rの式と実値、port向き・phasor、0.20m proxy、100–800Hz射影／周期定常のplaneとpressure_generation_method、UNCALIBRATED |
| 外部immutable係数manifest | μ,κ,cp,γ,T_ref、派生Pr/Ks/p_ref、λ定義、ゼロ一様減衰、全区間radius/length、nominal presetの出所・適用域・法則版、prereg content SHA。上のloss_modelとevidence_refsから参照 |
| `source_evidence` | 既存lf_fixedのgeneratorと推移依存pin、prescribed_f0=100Hz、入力q[n]とQ[k]のbyte定義／SHA、同一実行での消費証明と独立確認の有無 |
| `motion` | rest保持・no task execution、task参照はnull＋NOT_APPLICABLE理由。既存「あい」のtask SHAを流用しない |
| `raw_signal` | p_B native `<f8` mono 24000 samples、48k、array bytesとファイル全体のSHA scopeを区別、band/periodic method、finite、生成時間 |
| `complex_transfer[]` | HU無次元、Zin/Hpの単位、grid、Re/Im、R、source/outlet/proxyの参照面・符号、oracle method/pin |
| `physical_observables[]` | 内部p/U、区間z/y、Pin/Pout/Dint・残差、S特異値、null・raw L2とその定義／入力refs。band pressure levelを合否featuresへ紛れ込ませない |
| `outcome` | 数値正当性と効果検出の二軸、typed拒否、域外・unmodeled、全原証跡ref。追加の二軸詳細は既存evidence_refsが指す外部判定manifestにも保存可 |
| `derived_features[]` / `coverage[]` | G0 methodはDEFINED_NOT_VALIDATEDのまま、未算出はnull＋METHOD_UNFROZEN等の理由。必須slotは値またはfield-local coverage、0埋め禁止 |
| `preview` | 本登録では生成不要。null＋NOT_APPLICABLE/NO_PREVIEW_IN_PROTOCOL、p_Bからrawを復元する根拠に使わない |

既存のoptional物理観測配列・refで足りる設計とし、必須field・単位・意味・失敗処理の変更はしない。新しい参照の具体的serializationは実装審査でA/B互換を検証する。互換でなければv0を黙って改変せず別契約改版を提案する。

**sourceの二階建ては不変:** 同時実行でsolverに渡した正確なbuffer→DFT→出力のchainを独立確認した場合だけ、その**新run**の `ACTUAL_RUN_ATTESTED` を認め得る。生成し直しただけなら RECOMPUTED、確認が足りなければUNKNOWN。そこから `full_verified_source_state=VERIFIED` へ昇格しない（本登録ではUNKNOWN）。過去S3/S5/OD2のsource資格を遡って埋めない。入力同一性の証明が不足したペアは損失効果への帰属をUNKNOWNとする。

### 4.2 主張の上限 — 【FZ-C1】

全検査と効果判定が成功した場合の最大表現は、**「指定された静止剛壁・直列円管のLRF数値モデル、名目空気preset、固定抵抗端子、固定source、100–800 Hz、名目0.20m proxyのもとで、境界層損失介入による受動な複素応答と帯域モデル圧力の差を、独立な同方程式計算と照合した」**まで。

実在身体の組織損失・壁弾性・壁運動、熱境界の実在妥当性、自然な声・好み・聴取識別、全帯域／過渡／発話運動、source–tract feedback、自由な身体組合せ、校正SPL、製品利用可を主張しない。特徴量methodの妥当性を検証したとも言わない。

### 4.3 D capability matrix／UNKNOWN台帳 — 【FZ-C2】

**凍結済みA–E、Dのboundary行、Cの過去イベントはこのPRでは変更しない。** 本回答を新しい追記候補として、更新案を状態遷移で提案する。

| 時点 | boundary の追記案 | 維持する制限 |
| --- | --- | --- |
| この設計提出時 | `BLOCKED_BY_CAPABILITY in Studio` 維持。Core B2=`DESIGN_PROPOSAL` | 実装済み・実行可・測定済みにしない |
| 事前登録採用後 | Core B2=`REGISTERED_NOT_RUN`、implementation/execution GOは別記 | capability解除ではない |
| 実装受入＋実施GO後 | 特定pinのCore研究条件だけ `BOUNDED_CAN_RUN_RESEARCH` の追記候補 | Studioは引き続きBLOCKED、実験結果は未認定 |
| 結果審査＋Owner限定採用後 | exact law/pin/envelopeと結果refを持つ `MODELED_LIMITED_RESEARCH` の追記候補 | 壁コンプライアンス等、製品/OMAの予約効果資格は自動変更しない |

これらは本提案の説明用状態で、凍結語彙の実装enum追加ではない。実際の更新は独立のappend-only amendmentに旧Dのcontent SHA、新記録のSHA、根拠、適用pin、審査・Owner日時を付けて行う。五因子Dは本実験ではBOUNDARYをtargetとし、他4因子とモデル範囲を明示した**新しい記入例**として参照する。DのTRACT例を上書き・流用しない。

C台帳の過去UNKNOWNはOPENのまま。新実施の元bytes、時刻、method、source資格ごとに新eventを足す。旧evidence_id・古い観測時刻の修復にしない。`effect.viscothermal_loss` のOMA予約状態は本回答ではUNMODELEDのままで、Core研究結果の限定採用とOMA能力昇格も別審査とする。

## MQ — 監督者への裁定依頼（全て設計の採否、実施依頼ではない）

- **MQ1:** 初回をM0 rest＋一様参照管、100–800Hzの定常帯域圧力に限定し、既存LF生成器は固定、M1/OD2/時変あい/全帯域を後続へ分離する処方にAGREEか。この帯域rawを広帯域rawと混同しないplane記録を受入可能か。
- **MQ2:** μ/κ/cp/γは上記nominal検証presetを凍結し、実測空気物性の同定とは分ける処方にAGREEか。実測物性の出典付き数値表を今段階の必須にする場合は、その表の照合・再登録完了までHOLDとする。
- **MQ3:** 既存研究経路の`.4 Np/m`とFidelity0本線を区別し、B2は新経路で0固定、過去結果を維持する扱いにAGREEか。G0の過去記述への補足は別append-only訂正とする。
- **MQ4:** FZの許容差・二軸判定・独立oracle・内部故障注入、実装工学fixtureと本実施の区別、3つのOwner判断の区切りにAGREEか。採用時には全MQ裁定とFZ改訂を特定SHAへ固定する。

未決MQを暗黙のAGREEにしない。本文は回答文書の提出であり、上記の凍結・GOは一切代行しない。
