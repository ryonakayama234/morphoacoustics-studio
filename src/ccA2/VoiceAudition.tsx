import { useEffect, useState } from 'react';
import {
  beginAudition, finishAudition, freezePhysicalTake,
  type AuditionKind, type AuditionRecord, type AuditionTake,
  type AuditionTrial, type ArtifactJudgment, type DifferenceJudgment,
} from './audition';

const KEY = 'morphoacoustics-studio:voice-audition/v0';

function restore(): AuditionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is AuditionRecord =>
      !!v && typeof v === 'object' && v.schema_version === 'voice-audition-record/v0'
      && typeof v.trial_id === 'string'
      && typeof v.first?.audio_ref === 'string' && typeof v.second?.audio_ref === 'string'
      && typeof v.assessment?.difference === 'string');
  } catch { return []; }
}

const artifactNames: { value: ArtifactJudgment; label: string }[] = [
  { value: 'none', label: '目立つものなし' },
  { value: 'buzzy', label: 'ブザー・周期音' },
  { value: 'metallic', label: '金属的・人工的' },
  { value: 'breathy', label: '息・雑音' },
  { value: 'clicks', label: 'クリック・継ぎ目' },
  { value: 'other', label: 'その他' },
];

function ListeningSide({ label, ref }: { label: string; ref: string }) {
  return <article className="compare-card">
    <h3>{label}</h3>
    <audio controls preload="metadata" src={ref} aria-label={label + ' の未加工比較音声'} />
    <p>元の保存済みWAVをそのまま再生します。</p>
  </article>;
}

/**
 * An exploratory creator listening notebook, not a blinded clinical/scientific study.
 * Uses ONLY existing CC-A2 immutable physical Take audio refs; no audio processing.
 */
export function VoiceAudition({
  takeA, takeB, onMaskChange,
}: {
  takeA: AuditionTake | undefined;
  takeB: AuditionTake | undefined;
  onMaskChange: (masked: boolean) => void;
}) {
  const [trial, setTrial] = useState<AuditionTrial | null>(null);
  const [records, setRecords] = useState<AuditionRecord[]>(restore);
  const [difference, setDifference] = useState<DifferenceJudgment>('uncertain');
  const [voiceFirst, setVoiceFirst] = useState(1);
  const [voiceSecond, setVoiceSecond] = useState(1);
  const [artifactFirst, setArtifactFirst] = useState<ArtifactJudgment>('none');
  const [artifactSecond, setArtifactSecond] = useState<ArtifactJudgment>('none');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(records)); }
    catch { setError('ブラウザへの試聴記録保存に失敗しました。必要ならJSONをダウンロードしてください。'); }
  }, [records]);

  function start(kind: AuditionKind) {
    setError('');
    try {
      if (!takeA || !takeB) throw new Error('まず異なる身体の物理Takeを比較A/Bに選んでください');
      const a = freezePhysicalTake(takeA);
      const b = freezePhysicalTake(takeB);
      const bits = window.crypto.getRandomValues(new Uint32Array(1))[0];
      const next = beginAudition(a, b, kind, bits, window.crypto.randomUUID(), new Date().toISOString());
      setTrial(next);
      setDifference('uncertain'); setVoiceFirst(1); setVoiceSecond(1);
      setArtifactFirst('none'); setArtifactSecond('none'); setNotes('');
      onMaskChange(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function cancel() {
    setTrial(null);
    onMaskChange(false);
  }

  function save() {
    if (!trial) return;
    try {
      const record = finishAudition(
        trial, difference, voiceFirst, voiceSecond, artifactFirst, artifactSecond,
        notes, new Date().toISOString(),
      );
      setRecords(list => [...list, record]);
      cancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function exportJson() {
    const data = JSON.stringify({
      schema_version: 'voice-audition-export/v0',
      limitations: 'Creator label-masked exploratory observations; not independent blinded evidence or naturalness proof.',
      records,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'morphoacoustics-voice-audition-v0.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const falseAlarms = records.filter(r => r.kind === 'same-audio-control'
    && (r.assessment.difference === 'clear' || r.assessment.difference === 'subtle')).length;
  const controls = records.filter(r => r.kind === 'same-audio-control').length;

  return <section className="voice-audition" aria-labelledby="voice-audition-heading">
    <div className="panel-heading">
      <div>
        <p className="step-label">Voice Atlas · VA-L0 / creator research</p>
        <h3 id="voice-audition-heading">声の発見ノート — ラベルを伏せて試聴する</h3>
      </div>
      <span>{records.length} 件の記録</span>
    </div>
    <p>「身体差が聞き取れるか」と「どれくらい声らしいか」を別々に記録します。
      単なる数値的な差を声質向上とは呼びません。</p>
    {!trial ? <>
      <div className="take-actions">
        <button type="button" className="secondary" onClick={() => start('body-contrast')}
          disabled={!takeA || !takeB}>選択中の2身体をラベルなしで聴く</button>
        <button type="button" className="secondary" onClick={() => start('same-audio-control')}
          disabled={!takeA || !takeB}>同一WAV対照を聴く</button>
      </div>
      <p className="footer-note">まず上部のTake一覧で異なる身体をA/Bに選択してください。
        対照は同じWAVを2回再生し、聞こえるはずのない差を見積もるものです。
        身体差試行は左右を暗号学的乱数で割り付けます。</p>
    </> : <>
      <p role="status">試聴中：身体名と由来を一時的に非表示にしています。保存するまで割付は表示しません。</p>
      <div className="comparison-grid">
        <ListeningSide label="音 1" ref={trial.first.audio_ref} />
        <ListeningSide label="音 2" ref={trial.second.audio_ref} />
      </div>
      <label>音の違いの印象
        <select value={difference} onChange={e => setDifference(e.target.value as DifferenceJudgment)}>
          <option value="uncertain">判断できない</option>
          <option value="none">違いが聞き取れない</option>
          <option value="subtle">わずかに異なる</option>
          <option value="clear">明確に異なる</option>
        </select>
      </label>
      <div className="comparison-grid">
        <div>
          <label>音 1 の声らしさ（1=声に聞こえない、5=かなり声らしい）
            <select value={voiceFirst} onChange={e => setVoiceFirst(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>音 1 の目立つ人工音
            <select value={artifactFirst} onChange={e => setArtifactFirst(e.target.value as ArtifactJudgment)}>
              {artifactNames.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
        </div>
        <div>
          <label>音 2 の声らしさ（1–5）
            <select value={voiceSecond} onChange={e => setVoiceSecond(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>音 2 の目立つ人工音
            <select value={artifactSecond} onChange={e => setArtifactSecond(e.target.value as ArtifactJudgment)}>
              {artifactNames.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
        </div>
      </div>
      <label>創作メモ・声質の印象（任意）
        <textarea value={notes} maxLength={2000} rows={3} onChange={e => setNotes(e.target.value)}
          placeholder="例：違いは感じるが、どちらも人間の発声に聞こえない" />
      </label>
      <div className="take-actions">
        <button type="button" className="primary" onClick={save}>評価を記録して割付を見る</button>
        <button type="button" className="secondary" onClick={cancel}>記録せず中止</button>
      </div>
    </>}
    {error && <p role="alert" className="errors">{error}</p>}
    {records.length > 0 && <>
      <h3>保存済みの聴取記録</h3>
      <p>同一音対照の「差あり」回答：{falseAlarms}/{controls} 件（未実施なら評価不能）。
        少数の自己聴取から一般的な弁別率は推定できません。</p>
      <button type="button" className="secondary" onClick={exportJson}>試聴記録と物理Take由来をJSONで保存</button>
      <div className="audition-history">
        {[...records].reverse().slice(0, 8).map(r => <details key={r.trial_id}>
          <summary>{r.completed_at} · {r.kind === 'same-audio-control' ? '同一音対照' : '2身体'} · {r.assessment.difference}</summary>
          <p>音1：{r.first.preset_id}@{r.first.preset_revision} / 声らしさ {r.assessment.first_voice_likeness}。
            音2：{r.second.preset_id}@{r.second.preset_revision} / 声らしさ {r.assessment.second_voice_likeness}</p>
          <p>{r.assessment.notes || 'メモなし'}</p>
          <pre className="cc-b1-provenance">{JSON.stringify(r, null, 2)}</pre>
        </details>)}
      </div>
    </>}
    <p className="footer-note">ブラウザの自己評価ノート（未採用研究）。既存WAVを加工しません。
      同じページでTake情報を先に見ることができるため、厳密な盲検実験ではありません。
      再生音量・機器・聴取順・疲労を統制しておらず、自然さや話者識別性の証明ではありません。</p>
  </section>;
}
