import { useEffect, useMemo, useState } from 'react';
import { MockBackend } from './backend/MockBackend';
import type { TakeRecord } from './performance/TakeStore';
import { performTake } from './performance/TakeStore';
import { validatePerformanceRequest, validatePerformanceResult } from './contract/validation';
import {
  buildPerformanceRequest,
  createDemoDraft,
  moveSegment,
  removeSegment,
  type SegmentDirectionDraft,
  type StudioDraft,
} from './studio/model';

const STORAGE_KEY = 'morphoacoustics-studio-v0';

type PersistedState = {
  draft: StudioDraft;
  takes: TakeRecord[];
};

type AnyRecord = Record<string, unknown>;

function record(value: unknown): AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as AnyRecord
    : {};
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { draft: createDemoDraft(), takes: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const draft = parsed.draft ?? createDemoDraft();
    const takes = Array.isArray(parsed.takes)
      ? parsed.takes.filter((take) => {
          const candidate = record(take);
          const request = candidate.request;
          const result = candidate.result;
          return validatePerformanceRequest(request).ok
            && validatePerformanceResult(result, request).ok;
        }) as TakeRecord[]
      : [];
    return { draft, takes };
  } catch {
    return { draft: createDemoDraft(), takes: [] };
  }
}

function takeDuration(take: TakeRecord): number | null {
  const timeline = Array.isArray(take.result.timeline) ? take.result.timeline : [];
  const ends = timeline
    .map((interval) => record(interval).end_seconds)
    .filter((value): value is number => typeof value === 'number');
  return ends.length ? Math.max(...ends) : null;
}

function provenance(take: TakeRecord): AnyRecord {
  return record(take.result.provenance);
}

function directionNote(take: TakeRecord): string {
  return String(record(take.request.direction).note ?? '');
}

function TakeJson({ take }: { take: TakeRecord }) {
  return (
    <div className="json-stack">
      <details>
        <summary>Request snapshot</summary>
        <pre>{JSON.stringify(take.request, null, 2)}</pre>
      </details>
      <details>
        <summary>Result / timeline / diagnostics</summary>
        <pre>{JSON.stringify(take.result, null, 2)}</pre>
      </details>
    </div>
  );
}

export default function App() {
  const initial = useMemo(loadState, []);
  const backend = useMemo(() => new MockBackend(), []);
  const [draft, setDraft] = useState<StudioDraft>(initial.draft);
  const [takes, setTakes] = useState<readonly TakeRecord[]>(initial.takes);
  const [selectedSegmentId, setSelectedSegmentId] = useState(
    initial.draft.script.segments[0]?.segmentId ?? '',
  );
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(
    initial.takes.at(-1)?.result.take_id ?? null,
  );
  const [compareIds, setCompareIds] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, takes }));
  }, [draft, takes]);

  const selectedSegment = draft.script.segments.find(
    (segment) => segment.segmentId === selectedSegmentId,
  ) ?? draft.script.segments[0];
  const selectedOverride = selectedSegment
    ? draft.direction.overrides[selectedSegment.segmentId] ?? { note: '', energy: null, pace: null }
    : { note: '', energy: null, pace: null };
  const selectedTake = takes.find((take) => take.result.take_id === selectedTakeId) ?? null;
  const compared = compareIds
    .map((id) => takes.find((take) => take.result.take_id === id))
    .filter((take): take is TakeRecord => Boolean(take));

  function patchDraft(patch: Partial<StudioDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function patchOverride(patch: Partial<SegmentDirectionDraft>) {
    if (!selectedSegment) return;
    setDraft((current) => ({
      ...current,
      direction: {
        ...current.direction,
        overrides: {
          ...current.direction.overrides,
          [selectedSegment.segmentId]: {
            note: '',
            energy: null,
            pace: null,
            ...current.direction.overrides[selectedSegment.segmentId],
            ...patch,
          },
        },
      },
    }));
  }

  function addSegment() {
    const segmentId = `s_${crypto.randomUUID().slice(0, 8)}`;
    setDraft((current) => ({
      ...current,
      script: {
        ...current.script,
        segments: [...current.script.segments, { segmentId, text: '' }],
      },
    }));
    setSelectedSegmentId(segmentId);
  }

  function deleteSegment(segmentId: string) {
    if (draft.script.segments.length <= 1) return;
    setDraft((current) => removeSegment(current, segmentId));
    const fallback = draft.script.segments.find((segment) => segment.segmentId !== segmentId);
    setSelectedSegmentId(fallback?.segmentId ?? '');
  }

  async function perform() {
    setBusy(true);
    setError(null);
    try {
      const request = buildPerformanceRequest(draft, `request_${crypto.randomUUID()}`);
      const take = await performTake(backend, request);
      setTakes((current) => {
        const next = [...current, take];
        const lastTwo = next.slice(-2).map((item) => item.result.take_id);
        setCompareIds(lastTwo);
        return next;
      });
      setSelectedTakeId(take.result.take_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function toggleCompare(takeId: string) {
    setCompareIds((current) => {
      if (current.includes(takeId)) return current.filter((id) => id !== takeId);
      return current.length < 2 ? [...current, takeId] : [current[1], takeId];
    });
  }

  function deleteTake(takeId: string) {
    if (!window.confirm('この過去Takeを削除しますか？ この操作は取り消せません。')) return;
    setTakes((current) => current.filter((take) => take.result.take_id !== takeId));
    setCompareIds((current) => current.filter((id) => id !== takeId));
    if (selectedTakeId === takeId) setSelectedTakeId(null);
  }

  function resetDemo() {
    if (takes.length > 0 && !window.confirm('草稿とTake履歴をデモ初期状態へ戻しますか？')) return;
    const demo = createDemoDraft();
    setDraft(demo);
    setTakes([]);
    setCompareIds([]);
    setSelectedTakeId(null);
    setSelectedSegmentId(demo.script.segments[0]?.segmentId ?? '');
    setError(null);
  }

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <p className="eyebrow">Morphoacoustics Performance Studio · Mock v0</p>
          <h1>演じて、比べる。</h1>
          <p>創作入力だけを編集し、Performごとに不変のTakeを残します。物理solverの値はここでは触りません。</p>
        </div>
        <div className="header-actions">
          <span className="badge mock">MOCK · AUDIOLESS</span>
          <button className="secondary" type="button" onClick={resetDemo}>Reset demo data</button>
        </div>
      </header>

      <section className="studio-grid">
        <aside className="panel character-panel" aria-labelledby="character-heading">
          <div className="panel-heading">
            <span>01</span><h2 id="character-heading">Character</h2>
          </div>
          <label>名前
            <input
              value={draft.character.name}
              onChange={(event) => patchDraft({
                character: { ...draft.character, name: event.target.value },
              })}
            />
          </label>
          <label>人物像
            <textarea
              rows={5}
              value={draft.character.description}
              onChange={(event) => patchDraft({
                character: { ...draft.character, description: event.target.value },
              })}
            />
          </label>
          <div className="field-pair">
            <label>Default energy
              <input type="number" min="0" max="1" step="0.05" value={draft.character.defaultEnergy}
                onChange={(event) => patchDraft({ character: { ...draft.character, defaultEnergy: Number(event.target.value) } })} />
            </label>
            <label>Default pace
              <input type="number" min="0.1" max="4" step="0.05" value={draft.character.defaultPace}
                onChange={(event) => patchDraft({ character: { ...draft.character, defaultPace: Number(event.target.value) } })} />
            </label>
          </div>
          <p className="technical-note">ID <code>{draft.character.characterId}</code> · rev {draft.character.revision}</p>
        </aside>

        <section className="panel script-panel" aria-labelledby="script-heading">
          <div className="panel-heading row-heading">
            <div><span>02</span><h2 id="script-heading">Script & Direction</h2></div>
            <button className="secondary small" type="button" onClick={addSegment}>+ 区間</button>
          </div>

          <div className="segments" aria-label="台本区間">
            {draft.script.segments.map((segment, index) => (
              <article className={`segment ${selectedSegment?.segmentId === segment.segmentId ? 'selected' : ''}`} key={segment.segmentId}>
                <button className="segment-selector" type="button" onClick={() => setSelectedSegmentId(segment.segmentId)}>
                  <span className="segment-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="segment-id">{segment.segmentId}</span>
                </button>
                <textarea
                  aria-label={`台本区間 ${index + 1}`}
                  rows={2}
                  value={segment.text}
                  onFocus={() => setSelectedSegmentId(segment.segmentId)}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    script: {
                      ...current.script,
                      segments: current.script.segments.map((item) => item.segmentId === segment.segmentId ? { ...item, text: event.target.value } : item),
                    },
                  }))}
                />
                <div className="segment-actions">
                  <button type="button" className="icon-button" disabled={index === 0} onClick={() => setDraft((current) => moveSegment(current, segment.segmentId, -1))}>↑</button>
                  <button type="button" className="icon-button" disabled={index === draft.script.segments.length - 1} onClick={() => setDraft((current) => moveSegment(current, segment.segmentId, 1))}>↓</button>
                  <button type="button" className="icon-button danger" disabled={draft.script.segments.length <= 1} onClick={() => deleteSegment(segment.segmentId)}>削除</button>
                </div>
              </article>
            ))}
          </div>

          <div className="direction-block">
            <h3>全体演出</h3>
            <label>演出メモ
              <textarea rows={3} value={draft.direction.note} onChange={(event) => setDraft((current) => ({ ...current, direction: { ...current.direction, note: event.target.value } }))} />
            </label>
            <div className="field-grid">
              <label>Energy<input type="number" min="0" max="1" step="0.05" value={draft.direction.energy} onChange={(event) => setDraft((current) => ({ ...current, direction: { ...current.direction, energy: Number(event.target.value) } }))} /></label>
              <label>Pace<input type="number" min="0.1" max="4" step="0.05" value={draft.direction.pace} onChange={(event) => setDraft((current) => ({ ...current, direction: { ...current.direction, pace: Number(event.target.value) } }))} /></label>
              <label>Emotion label<input value={draft.direction.emotionLabel} onChange={(event) => setDraft((current) => ({ ...current, direction: { ...current.direction, emotionLabel: event.target.value } }))} /></label>
              <label>Intensity<input type="number" min="0" max="1" step="0.05" value={draft.direction.emotionIntensity} onChange={(event) => setDraft((current) => ({ ...current, direction: { ...current.direction, emotionIntensity: Number(event.target.value) } }))} /></label>
            </div>
          </div>

          {selectedSegment && (
            <div className="direction-block segment-direction">
              <h3>区間演出 <code>{selectedSegment.segmentId}</code></h3>
              <label>区間メモ<textarea rows={2} value={selectedOverride.note} onChange={(event) => patchOverride({ note: event.target.value })} /></label>
              <div className="field-pair">
                <label>Energy override<input type="number" min="0" max="1" step="0.05" placeholder="inherit" value={selectedOverride.energy ?? ''} onChange={(event) => patchOverride({ energy: event.target.value === '' ? null : Number(event.target.value) })} /></label>
                <label>Pace override<input type="number" min="0.1" max="4" step="0.05" placeholder="inherit" value={selectedOverride.pace ?? ''} onChange={(event) => patchOverride({ pace: event.target.value === '' ? null : Number(event.target.value) })} /></label>
              </div>
            </div>
          )}

          <div className="perform-row">
            <label className="seed-field">Seed
              <input type="number" min="0" step="1" value={draft.seed} onChange={(event) => patchDraft({ seed: Math.max(0, Math.trunc(Number(event.target.value))) })} />
            </label>
            <button className="perform" type="button" onClick={perform} disabled={busy}>{busy ? 'Performing…' : 'Perform'}</button>
          </div>
          {error && <pre className="errors" role="alert">{error}</pre>}
        </section>

        <aside className="panel takes-panel" aria-labelledby="takes-heading">
          <div className="panel-heading">
            <span>03</span><h2 id="takes-heading">Takes</h2>
          </div>
          {takes.length === 0 ? (
            <div className="empty-state"><strong>まだTakeはありません。</strong><p>Performすると、現在の草稿がsnapshot化されます。</p></div>
          ) : (
            <div className="take-list">
              {[...takes].reverse().map((take, reverseIndex) => {
                const index = takes.length - reverseIndex;
                const duration = takeDuration(take);
                const prov = provenance(take);
                const checked = compareIds.includes(take.result.take_id);
                return (
                  <article className={`take-card ${selectedTakeId === take.result.take_id ? 'active' : ''}`} key={take.result.take_id}>
                    <button className="take-main" type="button" onClick={() => setSelectedTakeId(take.result.take_id)}>
                      <span className="take-number">TAKE {String(index).padStart(2, '0')}</span>
                      <strong>{directionNote(take) || '演出メモなし'}</strong>
                      <span>{duration === null ? 'timelineなし' : `${duration.toFixed(2)} s`} · {String(prov.backend ?? 'backend?')}</span>
                    </button>
                    <div className="status-row">
                      <span className="status">job: {take.result.job_status}</span>
                      <span className="status">outcome: {String(take.result.realization_outcome ?? '—')}</span>
                    </div>
                    <div className="take-actions">
                      <label><input type="checkbox" checked={checked} onChange={() => toggleCompare(take.result.take_id)} />比較</label>
                      <button type="button" className="text-button danger" onClick={() => deleteTake(take.result.take_id)}>削除</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {selectedTake && (
            <section className="inspector">
              <h3>Inspector</h3>
              <dl className="mini-grid">
                <div><dt>backend</dt><dd>{String(provenance(selectedTake).backend ?? '—')}</dd></div>
                <div><dt>version</dt><dd>{String(provenance(selectedTake).backend_version ?? '—')}</dd></div>
                <div><dt>seed</dt><dd>{String(provenance(selectedTake).seed ?? '—')}</dd></div>
                <div><dt>diagnostics</dt><dd>{Array.isArray(selectedTake.result.diagnostics) ? selectedTake.result.diagnostics.length : 0}</dd></div>
              </dl>
              <TakeJson take={selectedTake} />
            </section>
          )}
        </aside>
      </section>

      <section className="compare-panel" aria-labelledby="compare-heading">
        <div className="compare-heading">
          <div><p className="eyebrow">Immutable history</p><h2 id="compare-heading">Take comparison</h2></div>
          <p>{compared.length === 2 ? '2つのsnapshotを並べて確認しています。' : 'Takesから比較対象を2つ選択してください。'}</p>
        </div>
        {compared.length === 2 && (
          <div className="comparison-grid">
            {compared.map((take) => (
              <article className="comparison-card" key={take.result.take_id}>
                <div className="comparison-meta">
                  <strong>{take.result.take_id}</strong>
                  <span>job {take.result.job_status}</span>
                  <span>outcome {String(take.result.realization_outcome ?? '—')}</span>
                  <span>{takeDuration(take)?.toFixed(2) ?? '—'} s</span>
                </div>
                <p className="compare-note">{directionNote(take)}</p>
                <TakeJson take={take} />
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        <span>Performance Contract v0</span>
        <span>Character / Script / Direction are creative inputs — no solver-specific controls exposed.</span>
      </footer>
    </main>
  );
}
