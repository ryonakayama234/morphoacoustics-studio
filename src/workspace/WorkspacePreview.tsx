import { useState } from 'react';
import mioRequest from '../../vendor/performance-contract/v0/examples/request.json';
import { draftFromRequest } from '../studio/model';
import './workspace-preview.css';

export type WorkspaceMode = 'character' | 'motion' | 'scene';
export const WORKSPACE_MODES: readonly WorkspaceMode[] = ['character', 'motion', 'scene'];
export const WORKSPACE_REGIONS = ['header', 'left', 'center', 'right', 'bottom', 'diagnostics'] as const;

// These ORGAN NODES are a diagrammatic placeholder. Never use them as solver inputs.
const ORGAN_CONCEPTS = [
  { id: 'breath', label: '呼吸器', description: 'Source', state: 'scaffold', x: 20, y: 72 },
  { id: 'larynx', label: '喉頭', description: 'Phonation', state: 'scaffold', x: 44, y: 53 },
  { id: 'tract', label: '声道', description: '1D · M0/M1', state: 'experimental', x: 71, y: 31 },
  { id: 'mouth', label: '口腔出口', description: 'Observation', state: 'experimental', x: 84, y: 58 },
  { id: 'tissue', label: '組織', description: 'Material', state: 'scaffold', x: 69, y: 79 },
] as const;
type OrganConceptId = (typeof ORGAN_CONCEPTS)[number]['id'];
const DRAFT = draftFromRequest(mioRequest);

export function WorkspacePreview() {
  const [mode, setMode] = useState<WorkspaceMode>('character');
  const [organ, setOrgan] = useState<OrganConceptId>('tract');
  const selected = ORGAN_CONCEPTS.find(item => item.id === organ)!;
  const centralTitle = mode === 'character' ? 'ミオ — Body Graph' :
    mode === 'motion' ? 'Script → Gestural Score' : 'Speaker / Listener';
  return <div className="wv-root">
    <header className="wv-header" data-region="header">
      <div className="wv-brand"><b className="wv-mark">m</b><span><strong>MORPHO <i>/ STUDIO</i></strong><small>EMBODIED VOICE WORKSPACE</small></span></div>
      <nav className="wv-modes" aria-label="制作タブ" role="tablist">
        {WORKSPACE_MODES.map(next => <button type="button" role="tab" key={next}
          aria-selected={mode === next} onClick={() => setMode(next)}>{next[0].toUpperCase()+next.slice(1)}</button>)}
      </nav><span className="wv-version">LAYOUT PREVIEW · v0.1</span>
    </header>
    <div className="wv-projectbar">
      <div><small>PROJECT / {mode.toUpperCase()} / {DRAFT.characterName}</small>
        <h1>{mode === 'character' ? '器官をつくる' : mode === 'motion' ? '動作をつくる' : '場をつくる'}</h1></div>
      <span className="wv-cap">{mode === 'character' ? 'グラフ編集：未実装' : mode === 'motion' ? '動作実行：未接続' : '空間物理：未接続'}</span>
    </div>
    <div className="wv-work">
      <aside className="wv-library" data-region="left" aria-label="プロジェクト素材">
        <div className="wv-side-heading">PROJECT</div>
        <div className="wv-asset wv-current">◈ &nbsp; {DRAFT.characterName}<span>01</span></div>
        <div className="wv-asset">◇ &nbsp; ボディ M0<span>rev 1</span></div>
        <div className="wv-asset">◇ &nbsp; ボディ M1<span>rev 1</span></div>
        <div className="wv-side-heading wv-side-gap">ASSETS</div>
        <div className="wv-asset">≡ &nbsp; 台本<span>{DRAFT.segments.length.toString().padStart(2,'0')}</span></div>
        <div className="wv-asset">◫ &nbsp; Takes<span>—</span></div>
        <div className="wv-asset">▦ &nbsp; シーン<span>—</span></div>
        <div className="wv-library-note">既存データを利用。器官グラフと空間は設計枠です。</div>
      </aside>
      <main className="wv-canvas" data-region="center">
        <div className="wv-depth-grid" aria-hidden="true"/>
        <div className="wv-canvas-head"><small>{mode.toUpperCase()} / {mode==='character'?'ORGAN NETWORK': mode==='motion'?'SCRIPT & GESTURES':'STAGE'}</small>
          <h2>{centralTitle}</h2></div><span className="wv-canvas-badge">{mode==='character'?'CONCEPT GRAPH':mode==='motion'?'EDITOR SHELL':'SCENE SHELL'}</span>
        {mode === 'character' ? <div className="wv-graph" role="group" aria-label="器官ノードの概念図">
          <svg viewBox="0 0 660 370" className="wv-edges" aria-hidden="true">
            <path d="M135 275 C205 275 230 210 275 202 M310 198 C375 198 395 115 475 114 M505 118 C540 128 563 172 574 190 M330 230 C385 295 410 291 465 300" stroke="#b8bab5" strokeWidth="1.6" strokeDasharray="none" fill="none"/>
            <circle cx="207" cy="241" r="3.6" fill="#ddd"/><circle cx="397" cy="160" r="3.6" fill="#ddd"/>
          </svg>
          {ORGAN_CONCEPTS.map(item => <button type="button" key={item.id}
            className={'wv-node'+(organ === item.id?' wv-node-current':'')}
            style={{left:item.x+'%',top:item.y+'%'}} aria-pressed={organ===item.id}
            onClick={() => setOrgan(item.id)}><b>{item.label}</b><small>{item.description} · {item.state==='scaffold'?'予定':'研究'}</small></button>)}
        </div> : mode === 'motion' ? <div className="wv-paper"><small>SCRIPT / {DRAFT.characterName}</small>
          {DRAFT.segments.map((line,i)=><div className="wv-scriptrow" key={line.segmentId}><b>{String(i+1).padStart(2,'0')}</b><span>{line.text}</span></div>)}
          <div className="wv-gestures">GESTURE SCORE &nbsp; — &nbsp; 接続予定（SMC）</div>
        </div> : <div className="wv-stage-scaffold"><div className="wv-floor"/><div className="wv-actor wv-speaker"><i/>Speaker</div>
          <div className="wv-actor wv-listener"><i/>Listener</div><div className="wv-future">2D / 3D ・接触物理 — 予定</div></div>}
        <div className="wv-canvas-bottom">{mode==='character'?'ノード＝器官 / エッジ＝接続 · 概念図':mode==='motion'?'台本は既存 / 身体動作の実行は未接続':'身体の配置と接触は未実装'}</div>
      </main>
      <aside className="wv-inspector" data-region="right" aria-label="選択対象の設定">
        <div className="wv-inspector-kicker">INSPECTOR</div>
        <h2>{mode==='character'?selected.label:mode==='motion'?'台本・演技':'空間・接触'}</h2>
        <p>{mode==='character'?selected.description:mode==='motion'?'Script / Direction':'Speaker / Listener'}</p>
        <div className="wv-inspector-divider"/>
        <div className="wv-keyvalue"><span>状態</span><b>{mode==='character'?(selected.state==='experimental'?'研究モデルあり':'設計枠'):'設計枠'}</b></div>
        <div className="wv-keyvalue"><span>所有</span><b>{mode==='character'?'Character':mode==='motion'?'Performance':'Scene'}</b></div>
        {mode==='character'&&organ==='tract'?<><div className="wv-inspector-divider"/><label>BODY REVISION<select aria-label="身体revision" defaultValue="M0"><option value="M0">M0 · 16.0 cm</option><option value="M1">M1 · 17.6 cm</option></select></label><label>断面積編集<input disabled value="第9区間 · CC-B1限定" readOnly/></label></>:null}
        <div className="wv-note">{mode==='character'?'ノード選択のみ可能。物理計算に接続する器官グラフの編集は未実装です。':mode==='motion'?'台本草稿は利用可能。連続動作の編集・実行は将来の接続です。':'空間配置・接触の物理は設計枠です。'}</div>
      </aside>
    </div>
    <footer className="wv-dock" data-region="bottom"><span className="wv-play">▶</span><div><strong>TAKE DOCK</strong><small>選択されたTakeはありません</small></div>
      <div className="wv-wave" aria-hidden="true">{Array.from({length:66},(_,i)=><i key={i} style={{height:(5+Math.abs(Math.sin(i*.9)*Math.sin(i*.18))*17)+'px'}} />)}</div><button type="button" disabled>比較 A/B</button><button type="button" disabled>書き出し</button>
    </footer>
  </div>;
}