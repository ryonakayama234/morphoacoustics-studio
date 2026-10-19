import { useEffect, useState } from 'react';
import type { StudioDraft } from '../studio/model';

const PRESETS = [
  { id: 'v3b-axial-M0', revision: 1, length: '16.0 cm', label: '身体 A / 基準声道' },
  { id: 'v3b-axial-M1', revision: 1, length: '17.6 cm', label: '身体 B / 声道長 +10%' },
] as const;

type Artifact = { kind: string; ref: string; media_type?: string; segment_id?: string };
type Result = {
  take_id: string; job_status: string; realization_outcome?: string;
  embodiment?: { status: string; preset_id?: string; preset_revision?: number;
    backend_id?: string; preparation_digest?: string };
  diagnostics?: { code: string; message: string }[];
  provenance?: { backend: string; backend_version: string; input_digest: string };
  artifacts: Artifact[];
};
type Take = {
  request: { request_id: string; embodiment: { preset_id: string; preset_revision: number } };
  result: Result; created_at: string;
};
type Answer = Partial<Take> & { code?: string; message?: string };

export function makeCCRequest(draft: StudioDraft, presetId: string, requestId: string) {
  return {
    schema_version: 'performance-contract/v1',
    request_id: requestId,
    character: {
      schema_version: 'performance-contract/v0',
      character_id: draft.characterId, revision: draft.characterRevision,
      name: draft.characterName, description: draft.characterDescription,
      default_controls: { energy: draft.defaultEnergy, pace: draft.defaultPace },
    },
    script: {
      schema_version: 'performance-contract/v0',
      script_id: draft.scriptId, revision: draft.scriptRevision,
      segments: [{ segment_id: 's1', speaker_character_id: draft.characterId, text: 'あい' }],
    },
    direction: {
      schema_version: 'performance-contract/v0',
      direction_id: draft.directionId, revision: draft.directionRevision,
      controls: {}, segment_overrides: [],
    },
    seed: 0,
    requested_capabilities: ['audio', 'timeline', 'diagnostics', 'physical_trace'],
    embodiment: { preset_id: presetId, preset_revision: 1 },
  };
}

function artifactOf(take: Take, kind: string): Artifact | undefined {
  return take.result.artifacts.find((a) => a.kind === kind);
}

function TakePanel({ label, take }: { label: string; take: Take | undefined }) {
  if (!take) return <div className="compare-card empty-state">Take {label}を選択してください。</div>;
  const audio = artifactOf(take, 'audio');
  const trace = artifactOf(take, 'dynamic-trace');
  const receipt = artifactOf(take, 'physical-receipt');
  const physical = take.result.embodiment;
  return (
    <article className="compare-card">
      <h3>{label} — {physical?.preset_id || '未解決'}</h3>
      <p>{physical?.preset_id === PRESETS[0].id ? '16.0 cm' : physical?.preset_id === PRESETS[1].id ? '17.6 cm' : '未対応身体'} / revision {physical?.preset_revision ?? '—'}</p>
      <p><strong>{take.result.job_status} / {take.result.realization_outcome ?? '—'}</strong></p>
      {audio ? (
        <div>
          <audio controls preload="metadata" src={audio.ref} aria-label={'Take ' + label + ' の物理音声'} />
          <p><a href={audio.ref} download>音声WAVを保存</a></p>
        </div>
      ) : <p>物理実行が成立しないため音声はありません。</p>}
      <p>{trace && <a href={trace.ref} download>Gesture・身体traceを確認</a>}</p>
      <p>{receipt && <a href={receipt.ref} target="_blank" rel="noreferrer">音響・身体の計算記録</a>}</p>
      <details>
        <summary>厳密な身体・データ由来</summary>
        <pre>{JSON.stringify({ selected: take.request.embodiment,
          resolved: physical, provenance: take.result.provenance,
          diagnostics: take.result.diagnostics, artifacts: take.result.artifacts }, null, 2)}</pre>
      </details>
    </article>
  );
}

export function CCAtelier({ draft }: { draft: StudioDraft }) {
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [takes, setTakes] = useState<Take[]>([]);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let valid = true;
    fetch('/cc-a2/takes', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('CC-A2サービスが起動していません'); return r.json(); })
      .then((items: unknown) => {
        if (valid && Array.isArray(items)) {
          const existing = items as Take[];
          setTakes(existing);
          setSelectedA([...existing].reverse().find((x) => x.request.embodiment.preset_id === PRESETS[0].id)?.result.take_id ?? null);
          setSelectedB([...existing].reverse().find((x) => x.request.embodiment.preset_id === PRESETS[1].id)?.result.take_id ?? null);
        }
      })
      .catch((e: unknown) => { if (valid) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (valid) setLoaded(true); });
    return () => { valid = false; };
  }, []);

  async function perform() {
    if (busy) return;
    setBusy(true);
    setError('');
    const input = makeCCRequest(draft, presetId, 'cc_a2_' + crypto.randomUUID().replaceAll('-', ''));
    try {
      const response = await fetch('/cc-a2/perform', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input), cache: 'no-store',
      });
      const data = await response.json() as Answer;
      if (!response.ok || !data.result?.take_id) throw new Error(data.message || 'CC-A2実行に失敗しました');
      const accepted = data as Take;
      setTakes((list) => [...list, accepted]);
      if (presetId === PRESETS[0].id) setSelectedA(accepted.result.take_id);
      if (presetId === PRESETS[1].id) setSelectedB(accepted.result.take_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  const a = takes.find((x) => x.result.take_id === selectedA);
  const b = takes.find((x) => x.result.take_id === selectedB);
  return (
    <section className="comparison-panel" aria-labelledby="cc-a2-heading">
      <div className="panel-heading">
        <div>
          <p className="step-label">CC-A2 · Character Creator Stage A (Draft)</p>
          <h2 id="cc-a2-heading">身体を交換して、声を聴き比べる</h2>
        </div>
        <span>同じ3-task Gesture / 同じ100 Hz音源 / 声道長のみ変更</span>
      </div>
      <p>同じキャラクター「{draft.characterName}」で基準身体と1.10倍の声道を選び、Coreが別々に新規計算します。対応台本は実験発声「あい」1件だけ。自然な日本語発音や人体の実証は未検証です。</p>
      <label>
        身体プリセット（厳密な版を固定）
        <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label} · {p.length} · rev {p.revision}</option>
          ))}
        </select>
      </label>
      <button type="button" className="primary" onClick={perform} disabled={busy || !loaded}>
        {busy ? '身体から音声を物理計算中…' : 'この身体で新規Perform'}
      </button>
      {error && <p role="alert" className="errors">{error}（WSL2でCC-A2サービス起動・Core revisionを確認）</p>}
      <p>比較する2つのTakeを選択してください。再生音量は各WAVで正規化されており、SPL比較はできません。</p>
      <div className="take-list">
        {[...takes].reverse().map((take) => (
          <article className="take-card" key={take.result.take_id}>
            <strong>{take.request.embodiment.preset_id} @ {take.request.embodiment.preset_revision}</strong>
            <p>{take.result.job_status} / {take.result.realization_outcome || '—'} · {take.result.take_id}</p>
            <div className="take-actions">
              <button type="button" aria-pressed={selectedA === take.result.take_id}
                onClick={() => { setSelectedA(take.result.take_id); if (selectedB === take.result.take_id) setSelectedB(null); }}>比較 A</button>
              <button type="button" aria-pressed={selectedB === take.result.take_id}
                onClick={() => { setSelectedB(take.result.take_id); if (selectedA === take.result.take_id) setSelectedA(null); }}>比較 B</button>
            </div>
          </article>
        ))}
      </div>
      <div className="comparison-grid">
        <TakePanel label="A" take={a} />
        <TakePanel label="B" take={b} />
      </div>
      <p className="footer-note">Takeはlocalhostに不変スナップショットとして保存されます。厳密な身体revisionと計算由来を確認できます。既存v0/X2aとは別のv1実験コレクションです。</p>
    </section>
  );
}
