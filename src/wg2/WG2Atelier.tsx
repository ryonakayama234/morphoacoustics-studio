import { useEffect, useState } from 'react';
import type { StudioDraft } from '../studio/model';

const PRESETS = [
  { id: 'v3b-axial-M0', label: '身体 A / 声道 16.0cm', clock: '68.6 kHz' },
  { id: 'v3b-axial-M1', label: '身体 B / 声道 17.6cm', clock: '62.36 kHz' },
] as const;
export type WG2Request = {
  character_id: string; preset_id: string; revision: number; duration_s: number;
};
export type WG2Take = {
  id: string; created_at: string; core_commit: string; request: WG2Request;
  body: { preset_id: string; revision: number; preparation_digest: string; length_m: number };
  source: { id: string; duration_s: number; sha256_f64: string };
  observer: { physics_clock_hz: number; max_abs_energy_residual_j: number;
    physical_pressure_sha256: string; wav_sha256: string; filter_group_latency_s: number;
    observation_point: string; playback_full_scale_pa: number };
  artifacts: Record<string, { sha256: string; bytes: number }>;
  audio_ref: string;
};

export function makeWG2Request(characterId: string, presetId: string, duration: number): WG2Request {
  return { character_id: characterId, preset_id: presetId, revision: 1, duration_s: duration };
}

function Voice({ label, take }: { label: string; take?: WG2Take }) {
  if (!take) return <article className="compare-card empty-state">Take {label} は未選択です。</article>;
  return <article className="compare-card">
    <h3>{label} — {take.body.preset_id}</h3>
    <p>声道長 {(take.body.length_m * 100).toFixed(1)}cm / 物理クロック {(take.observer.physics_clock_hz / 1000).toFixed(3)} kHz</p>
    <audio controls preload="metadata" src={take.audio_ref} aria-label={'WG2 Take ' + label + ' 物理波動試聴'} />
    <p><a download href={take.audio_ref}>48kHz 物理モニターWAVを保存</a></p>
    <details>
      <summary>保存した身体・音源・音響計算の証拠</summary>
      <pre>{JSON.stringify({ body: take.body, source: take.source,
        physical_waveguide: take.observer, core_commit: take.core_commit,
        artifact_digests: take.artifacts }, null, 2)}</pre>
    </details>
  </article>;
}

export function WG2Atelier({ draft }: { draft: StudioDraft }) {
  const [preset, setPreset] = useState<string>(PRESETS[0].id);
  const [duration, setDuration] = useState<0.25 | 0.50>(0.25);
  const [takes, setTakes] = useState<WG2Take[]>([]);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    async function restore() {
      const health = await fetch('/wg2/health', { cache: 'no-store' });
      if (!health.ok) throw new Error('WG2ローカルサービスが起動していません');
      const info = await health.json() as { status: string };
      if (info.status !== 'ready') throw new Error('Core物理発声の準備ができていません');
      const response = await fetch('/wg2/takes', { cache: 'no-store' });
      if (!response.ok) throw new Error('既存WG2 Takeの検証に失敗しました');
      const history = await response.json() as WG2Take[];
      if (!Array.isArray(history)) throw new Error('保存データの構造が不正です');
      if (live) {
        setTakes(history);
        setA([...history].reverse().find(x => x.body.preset_id === PRESETS[0].id)?.id ?? null);
        setB([...history].reverse().find(x => x.body.preset_id === PRESETS[1].id)?.id ?? null);
        setReady(true);
      }
    }
    restore().catch(e => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, []);

  async function perform() {
    if (busy || !ready) return;
    setBusy(true);
    setError('');
    try {
      const request = makeWG2Request(draft.characterId, preset, duration);
      const response = await fetch('/wg2/perform', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request), cache: 'no-store',
      });
      const item = await response.json() as WG2Take & { message?: string };
      if (!response.ok || !item.id) throw new Error(item.message || 'WG2 Coreでの発声に失敗しました');
      if (item.body.preset_id !== preset || item.body.revision !== 1 ||
        item.request.character_id !== request.character_id) {
        throw new Error('依頼と異なる身体またはキャラクターが返されました');
      }
      setTakes(list => [...list, item]);
      if (preset === PRESETS[0].id) setA(item.id);
      else setB(item.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }

  const takeA = takes.find(x => x.id === a);
  const takeB = takes.find(x => x.id === b);
  return <section className="cc-a2-workshop" aria-labelledby="wg2-heading">
    <div className="panel-heading">
      <div>
        <p className="step-label">WG2 · opt-in physical acoustic preview</p>
        <h2 id="wg2-heading">身体の波動計算から、新しい声を生成する</h2>
      </div>
      <span>16区間の声道 / 100Hz prescribed LF / 固定した発声源</span>
    </div>
    <p>キャラクター「{draft.characterName}」に身体M0/M1を割り当て、静的な「あ」系の持続発声をCoreで新しく計算します。
      以前のCC-A2「あい」と異なる静的声道の実験です。試聴用WAVは口元の圧力を変換したモニターで、
      校正済みマイク音や自然な日本語音声ではありません。</p>
    <label>声道の身体と正確なrevision
      <select value={preset} onChange={e => setPreset(e.target.value)}>
        {PRESETS.map(p => <option value={p.id} key={p.id}>{p.label} · rev 1 · {p.clock}</option>)}
      </select>
    </label>
    <label>実験発声の持続時間
      <select value={duration} onChange={e => setDuration(Number(e.target.value) as 0.25 | 0.50)}>
        <option value={0.25}>0.25秒</option>
        <option value={0.50}>0.50秒</option>
      </select>
    </label>
    <button type="button" className="primary" disabled={!ready || busy} onClick={perform}>
      {busy ? '本物のCore物理計算中…' : 'この身体で新規物理Takeを生成'}
    </button>
    {error && <p className="errors" role="alert">{error}（WG2 localhost・厳密なCore SHA・WSL2環境を確認）</p>}
    <p>WAVの再生スケールは固定 8 Pa/full-scale。身体ごとのピーク正規化は行いません。
      音量・自然さ・声の好みは物理エネルギー検証とは別に聴き取って判断してください。</p>
    <div className="take-list">
      {[...takes].reverse().map(take => <article className="take-card" key={take.id}>
        <strong>{take.body.preset_id} @ {take.body.revision}</strong>
        <p>新規WG2発声 / {take.source.duration_s}秒 / {take.id}</p>
        <div className="take-actions">
          <button type="button" aria-pressed={a === take.id}
            onClick={() => { setA(take.id); if (b === take.id) setB(null); }}>比較 A</button>
          <button type="button" aria-pressed={b === take.id}
            onClick={() => { setB(take.id); if (a === take.id) setA(null); }}>比較 B</button>
        </div>
      </article>)}
    </div>
    <div className="comparison-grid">
      <Voice label="A" take={takeA} />
      <Voice label="B" take={takeB} />
    </div>
    <p className="footer-note">履歴とWAVはローカルの不変Takeとして保存し、再読み込みでも物理成果物をSHAで再検証します。
      X2a、CC-A2、CC-B1とは別のオプション機能です。</p>
  </section>;
}
