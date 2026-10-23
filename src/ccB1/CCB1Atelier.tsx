import { useEffect, useState } from 'react';

export type BodyPair = {
  schema_version: string;
  id: string; ratio: '0.90' | '1.10'; created_at: string; core_commit: string;
  body_revision_id: string; body_revision_sha256: string;
  parent: { preset_id: string; revision: number; preparation_digest: string };
  body_revision: { edit: { section_index: number; previous_area_m2: number; new_area_m2: number };
    revision_id: string; preparation_digest: string };
  source: { id: string; sha256_le_f64: string };
  task_plan_sha256: string; relative_raw_pa_l2: number;
  sample_rate_hz: number; acoustic_calls_per_body: number;
  audio: { baseline: string; edited: string };
};

export function restAreaLabel(pair: BodyPair): string {
  const edit = pair.body_revision.edit;
  return `第${edit.section_index + 1}区間: ${(edit.previous_area_m2 * 1e4).toFixed(4)} → ${(edit.new_area_m2 * 1e4).toFixed(4)} cm²`;
}

function Sound({ label, audio, subtitle }: {label: string; audio: string; subtitle: string}) {
  return <article className="compare-card">
    <h3>{label}</h3>
    <p>{subtitle}</p>
    <audio controls preload="metadata" src={audio} aria-label={label + ' のCore物理発声'} />
    <p><a href={audio} download>検証済みWAVを保存</a></p>
  </article>;
}

export function CCB1Atelier() {
  const [ratio, setRatio] = useState<'0.90' | '1.10'>('0.90');
  const [takes, setTakes] = useState<BodyPair[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let live = true;
    async function load() {
      const health = await fetch('/cc-b1/health', { cache: 'no-store' });
      if (!health.ok) throw new Error('CC-B1ローカルサーバーが起動していません');
      const status = await health.json() as {status: string};
      if (status.status !== 'ready') throw new Error('Coreの準備ができていません');
      const response = await fetch('/cc-b1/takes', { cache: 'no-store' });
      if (!response.ok) throw new Error('保存した身体・音声の再検証に失敗しました');
      const saved = await response.json() as BodyPair[];
      if (!Array.isArray(saved)) throw new Error('履歴の形式が正しくありません');
      if (live) {
        setTakes(saved);
        setChosen(saved.at(-1)?.id ?? null);
        setReady(true);
      }
    }
    load().catch((error: unknown) => {
      if (live) setMessage(error instanceof Error ? error.message : String(error));
    });
    return () => { live = false; };
  }, []);

  async function perform() {
    if (busy || !ready) return;
    setBusy(true); setMessage('');
    try {
      const result = await fetch('/cc-b1/perform', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rest_area_ratio: ratio }), cache: 'no-store',
      });
      const value = await result.json() as BodyPair & { message?: string };
      if (!result.ok || value.schema_version !== 'cc-b1-studio-local-pair/v0') {
        throw new Error(value.message || 'Coreが変更要求を拒否しました');
      }
      setTakes(list => [...list, value]);
      setChosen(value.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }

  const selected = takes.find(t => t.id === chosen);
  return <section className="cc-b1-workshop" aria-labelledby="cc-b1-heading">
    <div className="panel-heading">
      <div>
        <p className="step-label">CC-B1 · Private Body Atelier / 実験版</p>
        <h2 id="cc-b1-heading">身体を少し変え、声の差を聴く</h2>
      </div>
      <span>実際のCore 1D声道・固定LF 100Hz・同じ3-task</span>
    </div>
    <p>基準身体M0の第9区間（index 8）の静止断面積だけを変更します。
      発声器官の物理計算を基準身体と変更身体でそれぞれ行います。台本は固定の実験発声「あい」だけです。</p>
    <div className="cc-b1-segments" aria-label="声道16区間の簡略配置図">
      {Array.from({ length: 16 }, (_, i) =>
        <span key={i} className={i === 8 ? 'cc-b1-segment-active' : ''}
          title={i === 8 ? '第9区間: 断面積の編集箇所' : `第${i + 1}区間: 今回は変更不可`}>
          {i + 1}
        </span>)}
    </div>
    <p className="footer-note">模式的な16区間の並びです。3D人体形状や各断面積の実寸図ではありません。</p>
    <label>
      第9区間の面積倍率（Coreで物理検証済みの二択）
      <select value={ratio} onChange={e => setRatio(e.target.value as '0.90' | '1.10')} disabled={busy}>
        <option value="0.90">0.90 × 元の面積（10%縮小）</option>
        <option value="1.10">1.10 × 元の面積（10%拡大）</option>
      </select>
    </label>
    <p>長さ、声帯F0、演技指示、音量ゲインは変更しません。</p>
    <button className="primary" type="button" disabled={!ready || busy} onClick={perform}>
      {busy ? 'Coreで基準声・変更声を物理発声中…' : 'この身体の声を新規生成'}
    </button>
    {message && <p className="errors" role="alert">{message}。WSL2で <code>npm run cc-b1:server</code> とCoreの固定SHAを確認してください。</p>}
    {takes.length > 0 && <div className="take-list" aria-label="保存済み身体編集と演技の履歴">
      {[...takes].reverse().map(t => <button type="button" className="secondary"
        key={t.id} aria-pressed={chosen === t.id} onClick={() => setChosen(t.id)}>
        第9区間 ×{t.ratio} · {t.created_at} · {t.body_revision_id.slice(0, 19)}…
      </button>)}
    </div>}
    {selected ? <>
      <h3>新しい身体を使用したA/B比較</h3>
      <p><strong>{restAreaLabel(selected)}</strong> / 圧力差の相対L2値 {selected.relative_raw_pa_l2.toExponential(4)}</p>
      <div className="comparison-grid">
        <Sound label="A — 基準身体 M0" audio={selected.audio.baseline}
          subtitle="編集前の身体を同じ固定3-taskとLF音源で新規物理発声" />
        <Sound label={'B — 第9区間 ×' + selected.ratio} audio={selected.audio.edited}
          subtitle="編集後の身体を独立に新規物理発声。WAVの再生ゲインはA/B共通" />
      </div>
      <details>
        <summary>身体・声の因果記録（計算証拠）</summary>
        <pre className="cc-b1-provenance">{JSON.stringify({
          core: selected.core_commit, parent: selected.parent,
          revision: selected.body_revision, body_revision_id: selected.body_revision_id,
          stored_digest: selected.body_revision_sha256, source: selected.source,
          task_plan_sha256: selected.task_plan_sha256,
          acoustic_calls_per_body: selected.acoustic_calls_per_body,
          sample_rate_hz: selected.sample_rate_hz,
        }, null, 2)}</pre>
      </details>
    </> : <p>保存した演技はまだありません。身体変更後に物理生成してください。</p>}
    <p className="footer-note">ローカル専用の未採用研究UIです。各ペアの実Pa/WAV/traceとBodyRevisionはCoreで検証し、
      画面の再読み込み時にも再検証します。再生WAVは共通ピークゲインで聴取用変換しています。
      音圧の絶対値や実在人体・自然な声・話者同一性を保証しません。</p>
  </section>;
}
