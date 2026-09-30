import { useEffect, useMemo, useState } from 'react';
import mioRequest from '../vendor/performance-contract/v0/examples/request.json';
import upstream from '../vendor/performance-contract/UPSTREAM.json';
import { MockBackend } from './backend/MockBackend';
import type { PerformanceRequestV0, PerformanceResultV0 } from './contract/types';
import { performTake, type TakeRecord } from './performance/TakeStore';
import {
  buildPerformanceRequest,
  directionSummary,
  draftFromRequest,
  moveSegment,
  nextSegmentId,
  type StudioDraft,
} from './studio/model';

const STORAGE_KEY = 'morphoacoustics-studio:s2-workspace:v1';

type Workspace = {
  draft: StudioDraft;
  takes: TakeRecord[];
  serial: number;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {};
}

function text(value: unknown, fallback = '—'): string {
  return typeof value === 'string' ? value : fallback;
}

function initialWorkspace(): Workspace {
  return {
    draft: draftFromRequest(mioRequest),
    takes: [],
    serial: 1,
  };
}

function loadWorkspace(): Workspace {
  if (typeof window === 'undefined') return initialWorkspace();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialWorkspace();
    const parsed = JSON.parse(raw) as Partial<Workspace>;
    if (!parsed.draft || !Array.isArray(parsed.takes) || typeof parsed.serial !== 'number') {
      return initialWorkspace();
    }
    return parsed as Workspace;
  } catch {
    return initialWorkspace();
  }
}

function resultOutcome(result: PerformanceResultV0): string {
  return text(asRecord(result).realization_outcome);
}

function resultBackend(result: PerformanceResultV0): string {
  const provenance = asRecord(asRecord(result).provenance);
  return `${text(provenance.backend)} @ ${text(provenance.backend_version)}`;
}

function diagnostics(result: PerformanceResultV0): unknown[] {
  const value = asRecord(result).diagnostics;
  return Array.isArray(value) ? value : [];
}

function timeline(result: PerformanceResultV0): unknown[] {
  const value = asRecord(result).timeline;
  return Array.isArray(value) ? value : [];
}

function requestDirectionSummary(request: PerformanceRequestV0): string {
  return directionSummary(request);
}

export default function App() {
  const initial = useMemo(loadWorkspace, []);
  const backend = useMemo(() => new MockBackend(), []);
  const [draft, setDraft] = useState<StudioDraft>(initial.draft);
  const [takes, setTakes] = useState<TakeRecord[]>(initial.takes);
  const [serial, setSerial] = useState(initial.serial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [compareA, setCompareA] = useState<string | null>(initial.takes[0]?.result.take_id ?? null);
  const [compareB, setCompareB] = useState<string | null>(initial.takes[1]?.result.take_id ?? null);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ draft, takes, serial } satisfies Workspace),
    );
  }, [draft, takes, serial]);

  const patchDraft = (patch: Partial<StudioDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const patchSegment = (
    index: number,
    patch: Partial<StudioDraft['segments'][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      segments: current.segments.map((segment, segmentIndex) => (
        segmentIndex === index ? { ...segment, ...patch } : segment
      )),
    }));
  };

  const addSegment = () => {
    setDraft((current) => ({
      ...current,
      segments: [
        ...current.segments,
        { segmentId: nextSegmentId(current.segments), text: '', overrideNote: '' },
      ],
    }));
  };

  const removeSegment = (index: number) => {
    setDraft((current) => {
      if (current.segments.length <= 1) return current;
      return {
        ...current,
        segments: current.segments.filter((_, segmentIndex) => segmentIndex !== index),
      };
    });
  };

  const reorderSegment = (index: number, delta: -1 | 1) => {
    setDraft((current) => ({
      ...current,
      segments: moveSegment(current.segments, index, delta),
    }));
  };

  const perform = async () => {
    setBusy(true);
    setError('');
    try {
      const request = buildPerformanceRequest(draft, serial);
      const take = await performTake(backend, request);
      setTakes((current) => [...current, take]);
      setSerial((current) => current + 1);
      if (!compareA) setCompareA(take.result.take_id);
      else if (!compareB && compareA !== take.result.take_id) setCompareB(take.result.take_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const deleteTake = (takeId: string) => {
    if (!window.confirm('このTakeを履歴から削除しますか？')) return;
    setTakes((current) => current.filter((take) => take.result.take_id !== takeId));
    if (compareA === takeId) setCompareA(null);
    if (compareB === takeId) setCompareB(null);
  };

  const resetDemo = () => {
    if (!window.confirm('草稿とTake履歴をミオのデモ初期状態へ戻しますか？')) return;
    const fresh = initialWorkspace();
    setDraft(fresh.draft);
    setTakes([]);
    setSerial(1);
    setCompareA(null);
    setCompareB(null);
    setError('');
  };

  const selectedA = takes.find((take) => take.result.take_id === compareA);
  const selectedB = takes.find((take) => take.result.take_id === compareB);

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <p className="eyebrow">Morphoacoustics Studio · S2</p>
          <h1>{draft.characterName || 'Untitled Character'}</h1>
          <p className="description">Character → Script → Direction → Perform → Take → Compare</p>
        </div>
        <div className="header-actions">
          <span className="mock-badge" title="No voice audio is synthesized in S2">MOCK BACKEND</span>
          <button className="secondary" type="button" onClick={resetDemo}>デモ初期化</button>
        </div>
      </header>

      <section className="workspace-grid">
        <div className="editor-stack">
          <section className="panel" aria-labelledby="character-heading">
            <div className="panel-heading">
              <div>
                <p className="step-label">01 · Character</p>
                <h2 id="character-heading">キャラクター</h2>
              </div>
              <code>{draft.characterId}</code>
            </div>
            <label>
              名前
              <input
                value={draft.characterName}
                onChange={(event) => patchDraft({ characterName: event.target.value })}
              />
            </label>
            <label>
              説明
              <textarea
                rows={3}
                value={draft.characterDescription}
                onChange={(event) => patchDraft({ characterDescription: event.target.value })}
              />
            </label>
            <div className="control-grid">
              <label>
                Default energy
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={draft.defaultEnergy}
                  onChange={(event) => patchDraft({ defaultEnergy: Number(event.target.value) })}
                />
              </label>
              <label>
                Default pace
                <input
                  type="number"
                  min="0.1"
                  max="2"
                  step="0.05"
                  value={draft.defaultPace}
                  onChange={(event) => patchDraft({ defaultPace: Number(event.target.value) })}
                />
              </label>
            </div>
          </section>

          <section className="panel" aria-labelledby="script-heading">
            <div className="panel-heading">
              <div>
                <p className="step-label">02 · Script</p>
                <h2 id="script-heading">台本</h2>
              </div>
              <button className="secondary" type="button" onClick={addSegment}>区間を追加</button>
            </div>
            <div className="segment-list">
              {draft.segments.map((segment, index) => (
                <article className="segment-card" key={segment.segmentId}>
                  <div className="segment-toolbar">
                    <strong>{segment.segmentId}</strong>
                    <div>
                      <button
                        aria-label={`${segment.segmentId}を上へ`}
                        type="button"
                        className="icon-button"
                        disabled={index === 0}
                        onClick={() => reorderSegment(index, -1)}
                      >↑</button>
                      <button
                        aria-label={`${segment.segmentId}を下へ`}
                        type="button"
                        className="icon-button"
                        disabled={index === draft.segments.length - 1}
                        onClick={() => reorderSegment(index, 1)}
                      >↓</button>
                      <button
                        aria-label={`${segment.segmentId}を削除`}
                        type="button"
                        className="icon-button danger"
                        disabled={draft.segments.length <= 1}
                        onClick={() => removeSegment(index)}
                      >×</button>
                    </div>
                  </div>
                  <label>
                    台詞
                    <textarea
                      rows={2}
                      value={segment.text}
                      onChange={(event) => patchSegment(index, { text: event.target.value })}
                    />
                  </label>
                  <label>
                    この区間だけの演出メモ
                    <input
                      value={segment.overrideNote}
                      placeholder="例：語尾で少し笑う"
                      onChange={(event) => patchSegment(index, { overrideNote: event.target.value })}
                    />
                  </label>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" aria-labelledby="direction-heading">
            <div className="panel-heading">
              <div>
                <p className="step-label">03 · Direction</p>
                <h2 id="direction-heading">演出</h2>
              </div>
            </div>
            <label>
              演出メモ
              <textarea
                rows={3}
                value={draft.directionNote}
                onChange={(event) => patchDraft({ directionNote: event.target.value })}
              />
            </label>
            <div className="control-grid">
              <label>
                Energy
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={draft.energy}
                  onChange={(event) => patchDraft({ energy: Number(event.target.value) })}
                />
              </label>
              <label>
                Pace
                <input
                  type="number"
                  min="0.1"
                  max="2"
                  step="0.05"
                  value={draft.pace}
                  onChange={(event) => patchDraft({ pace: Number(event.target.value) })}
                />
              </label>
              <label>
                Seed
                <input
                  type="number"
                  step="1"
                  value={draft.seed}
                  onChange={(event) => patchDraft({ seed: Number(event.target.value) })}
                />
              </label>
            </div>
          </section>

          <section className="perform-panel" aria-labelledby="perform-heading">
            <div>
              <p className="step-label">04 · Perform</p>
              <h2 id="perform-heading">Takeを作る</h2>
              <p>
                S2では決定的MockBackendを使用します。timeline・診断は生成しますが、音声は生成しません。
              </p>
            </div>
            <button type="button" className="primary" disabled={busy || draft.segments.length === 0} onClick={perform}>
              {busy ? 'Performing…' : 'Perform'}
            </button>
          </section>
          {error && <pre className="errors" role="alert">{error}</pre>}
        </div>

        <aside className="takes-panel" aria-labelledby="takes-heading">
          <div className="panel-heading">
            <div>
              <p className="step-label">05 · Takes</p>
              <h2 id="takes-heading">Take履歴</h2>
            </div>
            <span>{takes.length}</span>
          </div>
          {takes.length === 0 ? (
            <p className="empty-state">演出を決めて最初のTakeを作成してください。</p>
          ) : (
            <div className="take-list">
              {[...takes].reverse().map((take) => (
                <article className="take-card" key={take.result.take_id}>
                  <div className="take-title-row">
                    <strong>{take.result.take_id}</strong>
                    <span className="status-chip">{take.result.job_status}</span>
                  </div>
                  <p>{requestDirectionSummary(take.request)}</p>
                  <dl className="take-meta">
                    <div><dt>Realization</dt><dd>{resultOutcome(take.result)}</dd></div>
                    <div><dt>Backend</dt><dd>{resultBackend(take.result)}</dd></div>
                    <div><dt>Segments</dt><dd>{timeline(take.result).length}</dd></div>
                    <div><dt>Diagnostics</dt><dd>{diagnostics(take.result).length}</dd></div>
                  </dl>
                  <div className="take-actions">
                    <button type="button" className={compareA === take.result.take_id ? 'selected' : ''} onClick={() => setCompareA(take.result.take_id)}>A</button>
                    <button type="button" className={compareB === take.result.take_id ? 'selected' : ''} onClick={() => setCompareB(take.result.take_id)}>B</button>
                    <button type="button" className="danger-text" onClick={() => deleteTake(take.result.take_id)}>削除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="comparison-panel" aria-labelledby="compare-heading">
        <div className="panel-heading">
          <div>
            <p className="step-label">06 · Compare</p>
            <h2 id="compare-heading">Take A / B</h2>
          </div>
          <span>入力・timeline・結果・provenanceを別々に確認</span>
        </div>
        <div className="comparison-grid">
          <TakeComparison label="A" take={selectedA} />
          <TakeComparison label="B" take={selectedB} />
        </div>
      </section>

      <footer className="footer-note">
        Contract <code>{mioRequest.schema_version}</code> · upstream <code>{upstream.commit.slice(0, 12)}</code> ·
        草稿とTake履歴はこのブラウザに保存されます。物理solver固有の状態はStudio草稿へ保存しません。
      </footer>
    </main>
  );
}

function TakeComparison({ label, take }: { label: string; take?: TakeRecord }) {
  if (!take) {
    return <div className="compare-card empty-state">Take {label} を選択してください。</div>;
  }
  return (
    <article className="compare-card">
      <div className="take-title-row">
        <strong>Take {label}</strong>
        <code>{take.result.take_id}</code>
      </div>
      <h3>Input</h3>
      <p>{requestDirectionSummary(take.request)}</p>
      <h3>Result</h3>
      <p><strong>{take.result.job_status}</strong> / {resultOutcome(take.result)}</p>
      <h3>Timeline</h3>
      <pre>{JSON.stringify(timeline(take.result), null, 2)}</pre>
      <h3>Diagnostics</h3>
      <pre>{JSON.stringify(diagnostics(take.result), null, 2)}</pre>
      <h3>Provenance</h3>
      <pre>{JSON.stringify(asRecord(take.result).provenance ?? {}, null, 2)}</pre>
    </article>
  );
}
