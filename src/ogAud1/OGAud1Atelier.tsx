import { useEffect, useState } from 'react';

type Graph = { preparation_digest: string; blueprint_digest: string };
type PortDiagnostics = { relative_energy_imbalance: number; max_junction_flow_residual_m3s: number; omitted_echo_pressure_upper_bound_pa: number };
type BranchRecord = {
  body: 'small_C'|'large_C'; c_area_m2: number;
  graph_snapshot: Graph; diagnostic: PortDiagnostics;
  source_ref: string; raw_pressure_ref: string; all_ports_ref: string;
  audio_ref: string;
};
type Pair = {
  schema: string; pair_id: string; created_at: string; status: string;
  physical_claim: string; core_commit: string; source_sha256: string;
  shared_playback_gain_inverse_pa: number;
  relative_raw_pressure_rms_difference: number;
  manifest_ref: string;
  records: BranchRecord[];
};
function GraphView({large}: {large: boolean}) {
  return <div style={{border:'1px solid #bbb',borderRadius:12,padding:14,marginTop:8}}>
    <p><strong>{large?'身体 B：C = 6.0 cm²':'身体 A：C = 1.5 cm²'}</strong></p>
    <svg viewBox="0 0 390 145" role="img" aria-label="A.out→J→B.in及びC.inの型付き音響分岐" style={{width:'100%',maxWidth:430}}>
      <rect x="5" y="50" width="90" height="46" rx="10" fill="#f1eee8" stroke="#4f5959"/>
      <text x="50" y="68" textAnchor="middle" fontSize="14">A · 8 cm</text>
      <text x="50" y="84" textAnchor="middle" fontSize="10">3 cm² · p/U</text>
      <path d="M95 73 L165 73 L235 35 L288 35 M165 73 L235 115 L288 115" fill="none" stroke="#46575b" strokeWidth="2"/>
      <circle cx="165" cy="73" r="13" fill="#f3ce81" stroke="#46575b"/>
      <text x="165" y="77" textAnchor="middle" fontSize="12">J</text>
      <rect x="288" y="13" width="98" height="44" rx="10" fill="#f1eee8" stroke="#4f5959"/>
      <text x="337" y="31" textAnchor="middle" fontSize="13">B · 9 cm</text>
      <text x="337" y="46" textAnchor="middle" fontSize="10">3 cm² · matched</text>
      <rect x="288" y="94" width="98" height="44" rx="10" fill={large?'#cce3e4':'#e5d7ed'} stroke="#4f5959"/>
      <text x="337" y="112" textAnchor="middle" fontSize="13">C · 6 cm</text>
      <text x="337" y="127" textAnchor="middle" fontSize="10">{large?'6.0':'1.5'} cm² · matched</text>
    </svg>
    <small>実際の接続法則：Jで圧力連続、符号付き体積流量を保存。A.inの内部音圧を観測。</small>
  </div>;
}
function BodyAudio({record,label}: {record?:BranchRecord;label:string}) {
  if(!record) return <article className="compare-card">未実行：{label}</article>;
  return <article className="compare-card" style={{minWidth:0}}>
    <h3>{label} — {record.c_area_m2*10000} cm²</h3>
    <audio controls preload="metadata" src={record.audio_ref} aria-label={'OG-AUD1 '+label+' 音圧モニター'} style={{width:'100%'}}/>
    <p><a href={record.audio_ref} download>モニターWAVを保存</a></p>
    <p><a href={record.raw_pressure_ref} download>生音圧 [Pa]</a> · <a href={record.all_ports_ref} download>全6Portのp/U [SI]</a></p>
    <details><summary>身体同一性・物理診断</summary>
      <pre style={{maxWidth:'100%',overflow:'auto'}}>{JSON.stringify({
        body:record.body,area_m2:record.c_area_m2,
        blueprint:record.graph_snapshot.blueprint_digest,
        preparation:record.graph_snapshot.preparation_digest,
        physics:record.diagnostic,
      },null,2)}</pre>
    </details>
  </article>;
}
export function OGAud1Atelier({characterId}: {characterId:string}) {
  const [takes,setTakes]=useState<Pair[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [selected,setSelected]=useState('');
  useEffect(()=>{
    let current=true;
    fetch('/og-aud1/takes',{cache:'no-store'}).then(async res=>{
      if(!res.ok) throw new Error('OG-AUD1物理サービスを確認してください（WSL2: localhost:8767）');
      return res.json() as Promise<Pair[]>;
    }).then(rows=>{
      if(current) {
        setTakes(rows);
        setSelected(rows.at(-1)?.pair_id||'');
      }
    }).catch(e=>{if(current)setError(e instanceof Error?e.message:String(e))})
      .finally(()=>{if(current)setLoaded(true)});
    return ()=>{current=false};
  },[]);
  async function perform() {
    if(busy)return;
    setBusy(true);setError('');
    try{
      const res=await fetch('/og-aud1/perform',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({schema:'og-aud1.preview.request.v0',character_id:characterId}),
      });
      const pair=await res.json() as Pair & {message?:string};
      if(!res.ok||pair.schema!=='og-aud1.preview.take-pair.v0'||pair.records?.length!==2)
        throw new Error(pair.message||'新規Core物理計算を検証できません');
      setTakes(previous=>[...previous,pair]);setSelected(pair.pair_id);
    }catch(e){setError(e instanceof Error?e.message:String(e))}
    finally{setBusy(false)}
  }
  const pair=takes.find(x=>x.pair_id===selected);
  return <section className="cc-a2-workshop" aria-labelledby="og-aud1-heading">
    <div className="panel-heading">
      <div><p className="step-label">OG-AUD1 · 3器官の分岐 · 研究プレビュー</p>
        <h2 id="og-aud1-heading">身体の分岐が音に与える影響を聴く</h2></div>
      <span className="status-chip">PREVIEW · 未採用</span>
    </div>
    <p>同じ体積流量の入力U(t)を使い、<strong>器官Cの断面積だけ</strong>が異なる2つの身体をCoreでその場で物理計算します。両者は同一再生倍率。音は<strong>内部A.in Portの音圧モニター</strong>で、発話・口の放射・聴取点SPLではありません。Character名はTakeの索引であり、台本・Directionはこの試験入力には影響しません。</p>
    <div className="comparison-grid"><GraphView large={false}/><GraphView large={true}/></div>
    <p>入力: 48 kHz / 1秒 · 3器官・受動分岐J · 検証済み2身体以外は実行しません。</p>
    <button type="button" className="primary" disabled={busy||!loaded} onClick={perform}>
      {busy?'Coreで2身体を新規計算・検証中…':'2身体の物理Takeを新規Perform'}
    </button>
    {error && <p role="alert" className="errors">{error}</p>}
    <label>保存済みの不可変Takeペア（再読み込み・再起動で復元）
      <select value={selected} onChange={e=>setSelected(e.target.value)}>
        <option value="">新規Perform後に選択できます</option>
        {takes.map(x=><option key={x.pair_id} value={x.pair_id}>{x.created_at} · {x.pair_id.slice(0,8)}</option>)}
      </select>
    </label>
    <div className="comparison-grid">
      <BodyAudio label="A · C 小" record={pair?.records[0]}/>
      <BodyAudio label="B · C 大" record={pair?.records[1]}/>
    </div>
    {pair&&<details><summary>源の同一性・A/B物理差分・コア実行来歴</summary>
      <pre style={{overflow:'auto'}}>{JSON.stringify({
        pair_id:pair.pair_id,created_at:pair.created_at,core_commit:pair.core_commit,
        source_sha256:pair.source_sha256,
        relative_raw_pressure_rms_difference:pair.relative_raw_pressure_rms_difference,
        shared_playback_gain_inverse_pa:pair.shared_playback_gain_inverse_pa,
        manifest:pair.manifest_ref,
        graph_digests:pair.records.map(x=>x.graph_snapshot.preparation_digest),
        claim:pair.physical_claim,status:pair.status,
      },null,2)}</pre>
    </details>}
    <p className="footer-note">聴感上の区別と創作上の有用性は、この画面でユーザーが確認するGate Dです。PythonとWolframの数理検証やブラウザ自動試験だけでは完了しません。</p>
  </section>;
}
