/** CHR-1 S4: frozen-slot creator workspace. The existing App remains the unchanged legacy harness. */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { characterApi, StudioApiError, type CharacterVersion, type SelectedBodyRef } from './studio/characterApi';
import { adaptV0Take, compareV0Takes, type V0TakeRead, type V0TakeView } from './performance/V0TakeAdapter';
import {
  BASELINE_TAKES, IMPORT_RECEIPT_KEY, LEGACY_STORAGE_KEY, TAKE_INDEX_KEY,
  addTakeReference, checkImportCollision, fingerprint, makeImportNotes,
  parseImportAnchor, parseImportReceipts, parseTakeIndex, readLegacyCandidate, selectedBody,
  type ImportReceipt, type LegacyImport,
} from './workspace/chr1S4';
import './workspace-v0.css';

type Mode = 'Character' | 'Motion' | 'Scene';
const MODES: readonly Mode[] = ['Character', 'Motion', 'Scene'];
type Editor = { name: string; description: string; body: '' | SelectedBodyRef['preset_id'] };
const emptyEditor = (): Editor => ({ name: '', description: '', body: '' });
type LoadedTake = { read: V0TakeRead; view: V0TakeView };
type ArchiveState = { state: string; can_export: boolean; issues?: string[] };
const readableError = (e: unknown) => e instanceof StudioApiError
  ? 'HTTP ' + e.status + ' / ' + e.code + ': ' + e.message
  : e instanceof Error ? e.message : String(e);
const editorOf = (item: CharacterVersion): Editor => ({
  name: item.snapshot.name, description: item.snapshot.description,
  body: item.snapshot.active_body_ref?.preset_id ?? '',
});
const dirtyAgainst = (editor: Editor, item: CharacterVersion | null) => item
  ? editor.name !== item.snapshot.name || editor.description !== item.snapshot.description ||
    editor.body !== (item.snapshot.active_body_ref?.preset_id ?? '')
  : Boolean(editor.name || editor.description || editor.body);
const safeStore = (key: string, value: string) => window.localStorage.setItem(key, value);
const selectedRef = (value: Editor['body']) => value ? selectedBody(value) : null;
const short = (id: string) => id.length > 22 ? id.slice(0, 12) + '…' + id.slice(-8) : id;

export default function WorkspaceV0() {
  const [mode, setMode] = useState<Mode>('Character');
  const [characters, setCharacters] = useState<CharacterVersion[]>([]);
  const [current, setCurrent] = useState<CharacterVersion | null>(null);
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [takeQuery, setTakeQuery] = useState('');
  const [takeIds, setTakeIds] = useState<string[]>([]);
  const [takes, setTakes] = useState<Record<string, LoadedTake>>({});
  const [takeId, setTakeId] = useState<string | null>(null);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(() => window.innerWidth >= 720);
  const [legacy, setLegacy] = useState<LegacyImport | null>(null);
  const [importReceipt, setImportReceipt] = useState<ImportReceipt | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement | null>(null);
  const drawerTrigger = useRef<HTMLButtonElement | null>(null);
  const compactAudio = useRef<HTMLAudioElement | null>(null);
  const sharedGain = useRef(1);
  const [compactPlaying, setCompactPlaying] = useState(false);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const lock = useRef(false);
  const dirty = dirtyAgainst(editor, current);
  const active = takeId ? takes[takeId] : undefined;
  const left = a ? takes[a] : undefined;
  const right = b ? takes[b] : undefined;
  const comparison = left && right ? compareV0Takes(left.view, right.view) : null;
  useEffect(() => {
    compactAudio.current?.pause();
    setCompactPlaying(false);
  }, [takeId]);
  function syncGain(element: HTMLAudioElement) {
    sharedGain.current = element.volume;
    document.querySelectorAll<HTMLAudioElement>('.chr-s4 audio').forEach(player => {
      if (player !== element && player.volume !== sharedGain.current) player.volume = sharedGain.current;
    });
  }
  function pauseOtherPlayers(element: HTMLAudioElement) {
    document.querySelectorAll<HTMLAudioElement>('.chr-s4 audio').forEach(player => {
      if (player !== element) player.pause();
    });
  }
  async function toggleCompactPlayback() {
    const player = compactAudio.current;
    if (!player) return;
    try {
      if (!player.paused) { player.pause(); return; }
      player.volume = sharedGain.current;
      await player.play();
    } catch (cause) { setError('音声を再生できません: ' + readableError(cause)); }
  }

  async function refreshCharacters() {
    const list = await characterApi.list();
    setCharacters(list);
    return list;
  }
  useEffect(() => {
    let cancelled = false;
    try { setTakeIds(parseTakeIndex(window.localStorage.getItem(TAKE_INDEX_KEY))); }
    catch (cause) { setError(readableError(cause) + ' 索引を書き換えず、既知 ID の手入力のみ利用してください。'); }
    void characterApi.list().then(items => { if (!cancelled) setCharacters(items); })
      .catch(cause => { if (!cancelled) setError('Character の取得に失敗: ' + readableError(cause)); });
    return () => { cancelled = true; };
  }, []);

  function goMode(next: Mode) {
    setMode(next);
    setError('');
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % MODES.length;
    else if (event.key === 'ArrowLeft') next = (index + MODES.length - 1) % MODES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = MODES.length - 1;
    else return;
    event.preventDefault();
    goMode(MODES[next]);
    tabs.current[next]?.focus();
  }
  async function selectCharacter(id: string) {
    if (lock.current || dirty && !window.confirm('未保存の編集を破棄して別の Character を開きますか？')) return;
    setError(''); setMessage('');
    try {
      const head = await characterApi.get(id);
      const version = await characterApi.revision(id, head.head.current_revision);
      if (head.head.snapshot_sha256 !== version.snapshot_sha256 ||
          version.snapshot.revision !== head.head.current_revision)
        throw new Error('Character readback の revision / SHA が一致しません。');
      setCurrent(version); setEditor(editorOf(version)); setMode('Character');
    } catch (cause) { setError('Character の読込不可: ' + readableError(cause)); }
  }
  function newCharacter() {
    if (lock.current || dirty && !window.confirm('未保存の編集を破棄して新規作成を開始しますか？')) return;
    setCurrent(null); setEditor(emptyEditor()); setMode('Character'); setError(''); setMessage('');
  }
  async function readbackCharacter(id: string, expectedSha?: string) {
    const head = await characterApi.get(id);
    const exact = await characterApi.revision(id, head.head.current_revision);
    if (!exact.snapshot_sha256 || exact.snapshot_sha256 !== head.head.snapshot_sha256 ||
        expectedSha && exact.snapshot_sha256 !== expectedSha)
      throw new Error('Character readback で snapshot SHA が一致しません。自動再試行しません。');
    setCurrent(exact); setEditor(editorOf(exact));
    await refreshCharacters();
    return exact;
  }
  async function saveCharacter() {
    if (lock.current) return;
    if (!editor.name.trim()) { setError('名前が必要です。'); return; }
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (!current) {
        const made = await characterApi.create({
          name: editor.name, description: editor.description, active_body_ref: selectedRef(editor.body),
        });
        await readbackCharacter(made.snapshot.character_id, made.head.snapshot_sha256);
        setMessage('サーバに revision 1 を保存しました。Motion へは「固定演技へ進む」で移動します。');
      } else {
        if (!dirty) { setMessage('変更はありません。'); return; }
        const changes: { name?: string; description?: string; active_body_ref?: SelectedBodyRef | null } = {};
        if (current.snapshot.name !== editor.name) changes.name = editor.name;
        if (current.snapshot.description !== editor.description) changes.description = editor.description;
        if ((current.snapshot.active_body_ref?.preset_id ?? '') !== editor.body)
          changes.active_body_ref = selectedRef(editor.body);
        const made = await characterApi.patch(current.snapshot.character_id, current.head.current_revision, changes);
        await readbackCharacter(made.snapshot.character_id, made.head.snapshot_sha256);
        setMessage('CAS 保存・revision readback 完了。新規物理実行はまだ行っていません。');
      }
    } catch (cause) {
      setError('保存失敗（自動 merge / retry なし）: ' + readableError(cause));
    } finally { setBusy(false); lock.current = false; }
  }
  async function loadTake(id: string) {
    const read = await characterApi.take<V0TakeRead>(id);
    const view = adaptV0Take(read);
    if (view.takeId !== id || read.read_only !== true) throw new Error('不正な immutable Take 参照です。');
    setTakes(old => ({ ...old, [id]: { read, view } }));
    setTakeId(id);
    try {
      const updated = addTakeReference(parseTakeIndex(window.localStorage.getItem(TAKE_INDEX_KEY)), id);
      safeStore(TAKE_INDEX_KEY, JSON.stringify(updated));
      setTakeIds(updated);
    } catch (cause) {
      setError('Take は取得しましたがブラウザ参照索引を保存できません: ' + readableError(cause));
    }
    return { read, view };
  }
  async function lookupTake(id: string) {
    if (lock.current) return;
    setError(''); setMessage('');
    try { await loadTake(id.trim()); setMessage('既知 Take ID のサーバ照合が完了しました。'); }
    catch (cause) { setError('Take の参照に失敗（原本の消失とは限りません）: ' + readableError(cause)); }
  }
  async function perform() {
    if (lock.current) return;
    if (!current || dirty || !current.snapshot.active_body_ref) {
      setError('保存済みで M0/M1 が選択された Character revision が必要です。未保存編集は実行できません。');
      return;
    }
    lock.current = true; setBusy(true); setError(''); setMessage('');
    const submissionId = crypto.randomUUID(); // exactly one per explicit user attempt
    try {
      const latest = await characterApi.get(current.snapshot.character_id);
      const exact = await characterApi.revision(current.snapshot.character_id, current.snapshot.revision);
      if (!exact.snapshot_sha256 || latest.head.current_revision !== current.snapshot.revision ||
          latest.head.snapshot_sha256 !== current.snapshot_sha256 ||
          exact.snapshot_sha256 !== current.snapshot_sha256 ||
          exact.snapshot.active_body_ref?.preset_id !== current.snapshot.active_body_ref.preset_id)
        throw new Error('保存済み Character head が変更されています。再読込してから新規意思で実行してください。');
      const result = await characterApi.perform<V0TakeRead>({
        submission_id: submissionId, character_id: exact.snapshot.character_id,
        character_revision: exact.snapshot.revision, character_snapshot_sha256: exact.snapshot_sha256,
        body_preset_id: exact.snapshot.active_body_ref.preset_id, text: 'あい', direction: {}, seed: 0,
      });
      if (!result.envelope?.take_id) throw new Error('返却された Take ID がありません。');
      await loadTake(result.envelope.take_id);
      setExpanded(true);
      setMessage('固定演技の immutable Take を取得しました。source 実ラン検証は UNKNOWN のままです。');
    } catch (cause) {
      setError('Perform 停止（submission ' + submissionId + ' は再送しません）: ' + readableError(cause));
    } finally { setBusy(false); lock.current = false; }
  }
  function assign(slot: 'A' | 'B', id: string) {
    const candidate = takes[id];
    if (!candidate?.view.canCompare) { setError('この Take は再生・A/B に使えません。'); return; }
    if (slot === 'A') { setA(old => old === id ? null : id); if (b === id) setB(null); }
    else { setB(old => old === id ? null : id); if (a === id) setA(null); }
  }
  async function exportTake(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const { read } = await loadTake(id);
      const stateResponse = await fetch('/cc-a2/takes/' + encodeURIComponent(id), { cache: 'no-store' });
      if (!stateResponse.ok) throw new Error('Archive 状態の取得 HTTP ' + stateResponse.status);
      const state = await stateResponse.json() as ArchiveState;
      if (read.can_export !== true || state.can_export !== true ||
          state.state !== read.integrity_state)
        throw new Error('Archive の利用可能性・状態が一致しません。再生可能性とは別に書出しを停止します。');
      const response = await fetch('/cc-a2/takes/' + encodeURIComponent(id) + '/archive', { cache: 'no-store' });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/zip'))
        throw new Error('ZIP 応答が正常ではありません（HTTP ' + response.status + '）。');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b ||
          bytes[2] !== 0x03 || bytes[3] !== 0x04 ||
          !bytes.slice(Math.max(0, bytes.length - 65557)).some((v, i, arr) =>
            v === 0x50 && arr[i+1] === 0x4b && arr[i+2] === 0x05 && arr[i+3] === 0x06))
        throw new Error('ZIP の構造が不完全です。ダウンロードしません。');
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'take-' + id + '.bag.zip';
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage('BagIt ZIP をダウンロードしました。外部保存・manifest の独立照合は別途必要です。');
    } catch (cause) { setError('ZIP 書出し不可: ' + readableError(cause)); }
    finally { lock.current = false; setBusy(false); }
  }

  async function previewLegacy() {
    setLegacy(null); setImportReceipt(null); setError(''); setMessage('');
    try {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw === null) throw new Error('旧ブラウザ下書きが存在しません。');
      const candidate = readLegacyCandidate(raw, await fingerprint(raw));
      // Do not silently import, nor claim imported Takes or physical settings.
      setLegacy(candidate);
      const prior = parseImportReceipts(window.localStorage.getItem(IMPORT_RECEIPT_KEY))
        .find(r => r.legacyId === candidate.id);
      if (prior) setImportReceipt(prior);
      setMessage('旧下書きのプレビューのみ。取り込み操作はまだ実行していません。');
    } catch (cause) { setError('旧下書きの確認不可: ' + readableError(cause)); }
  }
  async function importLegacy() {
    if (lock.current || !legacy) return;
    if (!window.confirm('旧 Character の名前・説明だけを、新規サーバ Character として作成します。旧 Script・Direction・Take は移さず、原子的 exactly-once 保証はありません。実行しますか？')) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    let pending: ImportReceipt | null = null;
    try {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw === null) throw new Error('旧下書きが消失しました。');
      const candidate = readLegacyCandidate(raw, await fingerprint(raw));
      if (candidate.id !== legacy.id || candidate.sourceSha256 !== legacy.sourceSha256)
        throw new Error('プレビュー以後に下書きが変更されました。再確認してください。');
      const receipts = parseImportReceipts(window.localStorage.getItem(IMPORT_RECEIPT_KEY));
      if (receipts.some(r => r.legacyId === candidate.id))
        throw new Error('同一 source の import receipt が既にあります。重複作成せず、状態を照合してください。');
      const records = await characterApi.list();
      const collisions = checkImportCollision(records, candidate);
      if (collisions.length) throw new Error('サーバに同一 source の import anchor が ' + collisions.length + ' 件存在します。再作成を停止します。');
      const intent = crypto.randomUUID();
      const notes = makeImportNotes(candidate, intent, new Date().toISOString());
      pending = { status: 'pending', legacyId: candidate.id,
        sourceSha256: candidate.sourceSha256, importIntentId: intent };
      safeStore(IMPORT_RECEIPT_KEY, JSON.stringify([...receipts, pending]));
      // No idempotency key at POST /characters. Any unknown outcome stays pending (fail-closed).
      const made = await characterApi.create({
        name: candidate.name, description: candidate.description, active_body_ref: null,
        metadata: { notes },
      });
      if (made.snapshot.revision !== 1 || made.snapshot.metadata.notes !== notes)
        throw new Error('revision 1 の import anchor が確認できません。');
      const exact = await characterApi.revision(made.snapshot.character_id, 1);
      if (exact.snapshot_sha256 !== made.head.snapshot_sha256 ||
          exact.snapshot.metadata.notes !== notes ||
          exact.snapshot.character_id !== made.snapshot.character_id)
        throw new Error('revision 1 readback の ID・SHA・notes が一致しません。');
      const latest = await characterApi.list();
      if (checkImportCollision(latest, candidate).length !== 1)
        throw new Error('import 後のアンカーが不明瞭です。自動再 POST しません。');
      const confirmed: ImportReceipt = { ...pending, status: 'confirmed',
        serverCharacterId: exact.snapshot.character_id, serverRevision: 1,
        serverSnapshotSha256: exact.snapshot_sha256 };
      safeStore(IMPORT_RECEIPT_KEY, JSON.stringify([...receipts, confirmed]));
      setImportReceipt(confirmed);
      setCharacters(latest); setCurrent(exact); setEditor(editorOf(exact)); setMode('Character');
      setMessage('新規 revision 1 に対応表 anchor を保存・照合しました。旧下書きは残ります。M0/M1 は別途選択・保存してください。');
    } catch (cause) {
      setError('Import 停止・再 POST 禁止: ' + readableError(cause) +
        (pending ? ' pending receipt を保持しました。再試行せずサーバの metadata.notes と照合してください。' : ''));
    } finally { lock.current = false; setBusy(false); }
  }
  /** Resolve an uncertain POST by readback only. Never send a second POST. */
  async function reconcilePendingImport() {
    if (!legacy || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const receipts = parseImportReceipts(window.localStorage.getItem(IMPORT_RECEIPT_KEY));
      const pending = receipts.filter(r => r.legacyId === legacy.id && r.status === 'pending');
      if (pending.length !== 1) throw new Error('照合可能な pending receipt は一意ではありません。');
      const intent = pending[0];
      const records = await characterApi.list();
      const matches = records.filter(v => {
        const anchor = parseImportAnchor(v.snapshot.metadata.notes);
        return anchor?.import_intent_id === intent.importIntentId &&
          anchor.source_sha256 === intent.sourceSha256 &&
          anchor.legacy_character_id === intent.legacyId;
      });
      if (matches.length !== 1) throw new Error('サーバ上の対応 anchor が ' + matches.length +
        ' 件です。0 件は失敗の証明ではありません。追加 POST は行いません。');
      const exact = await characterApi.revision(matches[0].snapshot.character_id, 1);
      const anchor = parseImportAnchor(exact.snapshot.metadata.notes);
      if (!exact.snapshot_sha256 || anchor?.import_intent_id !== intent.importIntentId ||
          exact.snapshot.revision !== 1 || exact.snapshot.character_id !== matches[0].snapshot.character_id)
        throw new Error('revision 1 の source / intent / SHA を確認できません。');
      const confirmed: ImportReceipt = { ...intent, status: 'confirmed',
        serverCharacterId: exact.snapshot.character_id, serverRevision: 1,
        serverSnapshotSha256: exact.snapshot_sha256 };
      safeStore(IMPORT_RECEIPT_KEY, JSON.stringify(receipts.map(r =>
        r.importIntentId === intent.importIntentId ? confirmed : r)));
      setImportReceipt(confirmed); setCharacters(records);
      setCurrent(exact); setEditor(editorOf(exact)); setMode('Character');
      setMessage('既存の revision 1 と対応表を readback で照合しました。再 POST していません。');
    } catch (cause) {
      setError('照合停止・新規 POST なし: ' + readableError(cause));
    } finally { setBusy(false); lock.current = false; }
  }
  function openDrawer() {
    setDrawerOpen(true);
    drawerRef.current?.showModal();
  }
  function closeDrawer() {
    drawerRef.current?.close();
  }

  return <div className="chr-s4">
    <header className="chr-s4-header" data-slot="global.header">
      <div><div className="chr-s4-kicker">MORPHO / STUDIO · CHR-1</div><h1>Creation workspace</h1>
        <p>固定 v0 · M0/M1 · Source 実ラン UNKNOWN</p></div>
      <nav className="chr-s4-tabs" role="tablist" aria-label="Workspace mode">
        {MODES.map((item, index) => <button key={item} type="button" role="tab"
          id={'chr-s4-tab-' + item} aria-selected={mode === item} aria-controls="chr-s4-canvas"
          tabIndex={mode === item ? 0 : -1}
          ref={el => { tabs.current[index] = el; }} onKeyDown={event => tabKey(event, index)}
          onClick={() => goMode(item)}>{item}</button>)}
      </nav>
      <button ref={drawerTrigger} type="button" className="chr-s4-outline"
        aria-haspopup="dialog" onClick={openDrawer}>研究・証拠</button>
    </header>
    <div className="chr-s4-grid">
      <aside className="chr-s4-library chr-s4-surface" aria-label="Project library" data-slot="project.library">
        <details className="chr-s4-library-details" open>
        <summary>Library · Character / Body / Take references</summary>
        <div className="chr-s4-heading"><h2>Characters</h2><button type="button" onClick={newCharacter}>＋ 新規</button></div>
        <p className="chr-s4-hint">サーバ Character 正本</p>
        <button type="button" className="chr-s4-outline" onClick={() => void refreshCharacters()
          .catch(cause => setError('一覧を再取得できません: ' + readableError(cause)))}>再読込</button>
        <div className="chr-s4-library-list">
          {characters.length === 0 && <p>Character がない、またはサーバ未接続です。</p>}
          {characters.map(v => <button key={v.snapshot.character_id} type="button"
            aria-current={current?.snapshot.character_id === v.snapshot.character_id ? 'true' : undefined}
            onClick={() => void selectCharacter(v.snapshot.character_id)}>
            <strong>{v.snapshot.name}</strong><small>rev {v.head.current_revision} · {v.snapshot.active_body_ref?.preset_id ?? 'Body 未選択'}</small>
          </button>)}
        </div>
        <div className="chr-s4-separator" />
        <h3>Body references</h3>
        <p className="chr-s4-hint">v3b-axial-M0 / v3b-axial-M1。実体ではなく参照です。選択は Inspector で行います。</p>
        <h3>Take 参照</h3><p className="chr-s4-hint">ブラウザに記録した既知 ID のみ。サーバ全件一覧ではありません。</p>
        {takeIds.map(id => <button className="chr-s4-ref" key={id} type="button" title={id}
          onClick={() => void lookupTake(id)}>{short(id)}</button>)}
        <form onSubmit={event => { event.preventDefault(); void lookupTake(takeQuery); }}>
          <label htmlFor="chr-s4-take-id">既知 Take ID を手入力</label>
          <input id="chr-s4-take-id" value={takeQuery} onChange={event => setTakeQuery(event.target.value)}
            placeholder="take_studio_v0_…" />
          <button type="submit">ID で取得</button>
        </form>
        <details><summary>S5 限定ベースラインの既知 ID</summary>
          <p className="chr-s4-hint">Owner PC の記録のみ。別ストアでの存在や品質は保証しません。</p>
          {BASELINE_TAKES.map(t => <button className="chr-s4-ref" key={t.id} type="button"
            onClick={() => void lookupTake(t.id)}>{t.label}</button>)}
        </details>
        </details>
      </aside>
      <main className="chr-s4-canvas chr-s4-surface" role="tabpanel" id="chr-s4-canvas"
        aria-labelledby={'chr-s4-tab-' + mode} data-slot={mode.toLowerCase() + '.canvas'}>
        {mode === 'Character' && <>
          <div className="chr-s4-heading"><div><span className="chr-s4-kicker">01 / CHARACTER</span>
            <h2>{current ? '選択中の Character' : '新規 Character'}</h2></div>
            <span className="chr-s4-state">{dirty ? '未保存の編集' : current ? '保存済み revision' : '未作成'}</span></div>
          <div className="chr-s4-character-visual" aria-hidden="true"><div className="chr-s4-body-mark">M</div>
            <div><strong>{editor.name || 'Untitled'}</strong><small>{editor.body || 'M0 / M1 未選択'}</small>
              <span>Axial preset の参照表示のみ。器官編集は v0 対象外。</span></div></div>
          <dl className="chr-s4-identity">
            <div><dt>Character ID</dt><dd>{current?.snapshot.character_id ?? '未作成（保存時に発行）'}</dd></div>
            <div><dt>Revision</dt><dd>{current?.snapshot.revision ?? '—'}</dd></div>
            <div><dt>Snapshot SHA</dt><dd>{current?.snapshot_sha256 ?? '—'}</dd></div>
            <div><dt>Binding</dt><dd>{current?.snapshot.active_body_ref?.binding_state ?? '未選択'}</dd></div>
          </dl>
          <div className="chr-s4-actions">
            <button type="button" className="chr-s4-primary" disabled={busy || !dirty || !editor.name.trim()}
              onClick={() => void saveCharacter()}>{current ? 'revision を保存' : 'Character を新規保存'}</button>
            <button type="button" disabled={!current || dirty || busy || !current.snapshot.active_body_ref}
              onClick={() => goMode('Motion')}>固定演技へ進む</button>
          </div>
          <details className="chr-s4-import">
            <summary>ブラウザ下書きから明示的に取り込む</summary>
            <p>旧 browser draft は server Character と別物です。Script、Direction、Take、backend は移しません。</p>
            <button type="button" disabled={busy} onClick={() => void previewLegacy()}>旧下書きを確認</button>
            {legacy && <div className="chr-s4-import-review">
              <p>旧 ID: <code>{legacy.id}</code> / 名前: {legacy.name}</p>
              <p>転送範囲: 名前・説明のみ。Source SHA-256: <code>{legacy.sourceSha256}</code></p>
              <button type="button" disabled={busy} onClick={() => void importLegacy()}>新規 Character として取り込む（統合しない）</button>
            </div>}
            {importReceipt?.status === 'pending' && <div className="chr-s4-import-review">
              <p>前回の import 結果が未確定です。重複送信は禁止。既存 revision 1 の readback のみ実施します。</p>
              <button type="button" disabled={busy} onClick={() => void reconcilePendingImport()}>pending receipt を照合</button>
            </div>}
            {importReceipt?.status === 'confirmed' && <p>対応表: <code>{importReceipt.legacyId}</code> → <code>{importReceipt.serverCharacterId}</code>
              （rev {importReceipt.serverRevision}、SHA <code>{importReceipt.serverSnapshotSha256}</code>）</p>}
            <p className="chr-s4-hint">UX レベルの重複防止のみ。原子的 exactly-once は保証しません。失敗や曖昧な場合は fail-closed。</p>
          </details>
        </>}
        {mode === 'Motion' && <>
          <span className="chr-s4-kicker">02 / MOTION</span><h2>固定演技</h2>
          <div className="chr-s4-script">あい</div>
          <p>一つの固定区間 · 3 task · seed 0 · Direction 空 · LF fixed 100 Hz</p>
          <p className="chr-s4-hint">自由 Script、演出パラメータ、速度、source 変更は v0 非対応です。</p>
          <dl className="chr-s4-identity">
            <div><dt>Source</dt><dd>lf_fixed / 100Hz（read-only）</dd></div>
            <div><dt>Character</dt><dd>{current?.snapshot.name ?? '未選択'}</dd></div>
            <div><dt>Saved revision</dt><dd>{current?.snapshot.revision ?? '—'}</dd></div>
            <div><dt>Body</dt><dd>{current?.snapshot.active_body_ref?.preset_id ?? '未選択'}</dd></div>
          </dl>
          <button type="button" className="chr-s4-primary" disabled={busy || !current || dirty || !current.snapshot.active_body_ref}
            onClick={() => void perform()}>{busy ? '処理中…' : '固定「あい」を Perform'}</button>
          {dirty && <p className="chr-s4-warning">未保存の Character 編集があります。保存してから実行してください。</p>}
        </>}
        {mode === 'Scene' && <>
          <span className="chr-s4-kicker">03 / SCENE</span><h2>Scene</h2>
          <div className="chr-s4-scene">SCENE / NOT ACTIVE IN V0</div>
          <p>Speaker / Listener、身体移動、接触、空間音響は将来の検証対象です。編集や実行はできません。</p>
        </>}
        {(error || message) && <div className={error ? 'chr-s4-alert' : 'chr-s4-message'}
          role={error ? 'alert' : 'status'} aria-live="polite">{error || message}</div>}
      </main>
      <aside className="chr-s4-inspector chr-s4-surface" data-slot="selection.inspector" aria-label="Selection inspector">
        <details open={mode === 'Character'} key={mode}>
          <summary><h2>Inspector</h2></summary>
          {mode === 'Character' ? <>
            <label htmlFor="chr-s4-name">名前</label>
            <input id="chr-s4-name" maxLength={160} value={editor.name}
              onChange={event => setEditor(old => ({ ...old, name: event.target.value }))} />
            <label htmlFor="chr-s4-description">説明</label>
            <textarea id="chr-s4-description" rows={3} maxLength={4000} value={editor.description}
              onChange={event => setEditor(old => ({ ...old, description: event.target.value }))} />
            <label htmlFor="chr-s4-body">既存 Body preset 参照</label>
            <select id="chr-s4-body" value={editor.body}
              onChange={event => setEditor(old => ({ ...old, body: event.target.value as Editor['body'] }))}>
              <option value="">未選択</option><option value="v3b-axial-M0">M0 · axial</option><option value="v3b-axial-M1">M1 · axial</option>
            </select>
            <p className="chr-s4-hint">選択 = SELECTED_UNRESOLVED。物理 binding の検証済み宣言ではありません。</p>
          </> : <p>固定 source・条件の参照のみ。v0 で調整可能な演技・Scene パラメータはありません。</p>}
        </details>
      </aside>
    </div>
    <section className={'chr-s4-dock' + (expanded ? ' chr-s4-dock-open' : '')} data-slot="take.transport"
      aria-label="Permanent Take transport">
      <div className="chr-s4-dock-head">
        <strong>TAKE / TRANSPORT</strong><span title={takeId || ''}>{active ? short(active.view.takeId) : 'Take 未選択'}</span>
        <span className="chr-s4-state">{active?.read.integrity_state ?? '未取得'}</span>
        <audio ref={compactAudio} src={active?.view.audioRef ?? undefined} preload="metadata"
          onPlay={event => { pauseOtherPlayers(event.currentTarget); setCompactPlaying(true); }}
          onPause={() => setCompactPlaying(false)} onEnded={() => setCompactPlaying(false)}
          onVolumeChange={event => syncGain(event.currentTarget)} />
        <button type="button" disabled={!active?.view.audioRef}
          aria-label={compactPlaying ? '選択中 Take を停止' : '選択中 Take を再生'}
          onClick={() => void toggleCompactPlayback()}>{compactPlaying ? '停止' : '再生'}</button>
        <button type="button" aria-expanded={expanded} aria-controls="chr-s4-dock-detail"
          onClick={() => setExpanded(e => !e)}>{expanded ? '縮小' : 'A/B・再生・ZIP を開く'}</button>
      </div>
      <div id="chr-s4-dock-detail" hidden={!expanded}>
        <div className="chr-s4-dock-actions">
          <button type="button" disabled={!active?.view.canCompare} aria-pressed={a === takeId}
            onClick={() => { if (takeId) assign('A', takeId); }}>A にセット</button>
          <button type="button" disabled={!active?.view.canCompare} aria-pressed={b === takeId}
            onClick={() => { if (takeId) assign('B', takeId); }}>B にセット</button>
          <button type="button" disabled={!active?.read.can_export || busy || !takeId}
            onClick={() => { if (takeId) void exportTake(takeId); }}>BagIt ZIP 書出し</button>
          <span>サーバ全件履歴ではありません。SHA/出典は研究・証拠へ。</span>
        </div>
        <div className="chr-s4-ab">
          {(['A', 'B'] as const).map(slot => {
            const t = slot === 'A' ? left : right;
            return <div key={slot} className="chr-s4-ab-slot">
              <strong>Take {slot}</strong><code title={t?.view.takeId}>{t ? short(t.view.takeId) : '未選択'}</code>
              {t?.view.audioRef ? <audio controls controlsList="nodownload noplaybackrate" preload="metadata" src={t.view.audioRef}
                aria-label={'Take ' + slot + ' の音声'}
                onLoadedMetadata={event => { event.currentTarget.volume = sharedGain.current; }}
                onVolumeChange={event => syncGain(event.currentTarget)}
                onRateChange={event => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1; }}
                onPlay={event => pauseOtherPlayers(event.currentTarget)} /> : <span>音声なし / unavailable</span>}
            </div>;
          })}
        </div>
        <p className="chr-s4-hint">A/B は異なる Take ID のみ。各 WAV は個別に peak-normalized、同じ再生 gain でも SPL・実際の声量は比較できません。</p>
        {comparison && !comparison.allowed && <p className="chr-s4-warning">A/B 不可：異なる再生可能な Take が必要です。</p>}
        {active?.view.audioRef && !a && !b && <audio controls controlsList="nodownload noplaybackrate" preload="metadata"
          src={active.view.audioRef} aria-label="選択中 Take の試聴"
          onLoadedMetadata={event => { event.currentTarget.volume = sharedGain.current; }}
          onVolumeChange={event => syncGain(event.currentTarget)}
          onRateChange={event => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1; }}
          onPlay={event => pauseOtherPlayers(event.currentTarget)} />}
        {active && <p className="chr-s4-hint">Source 実ラン: {active.view.sourceProvenance} /
          再計算 evidence: {active.view.sourceEvidence} /
          来歴: {active.read.envelope.provenance_state}。
          再生と export は別の可用性判定です。</p>}
      </div>
    </section>
    <dialog ref={drawerRef} className="chr-s4-dialog" aria-labelledby="chr-s4-drawer-title"
      onClose={() => { setDrawerOpen(false); drawerTrigger.current?.focus(); }}>
      <div className="chr-s4-heading"><h2 id="chr-s4-drawer-title">Research / evidence</h2>
        <button type="button" onClick={closeDrawer}>閉じる</button></div>
      <p>旧実験は製品 v0 と別の研究ハーネスです。ブラウザ draft / 旧 Take を server v0 envelope に変換しません。</p>
      <a href="/?view=legacy">旧 Mock / X1a / X1b / X2a / CC-A2 / CC-B1 ハーネスを開く</a>
      <p className="chr-s4-hint">このリンクは既存 App の実在する入口です。旧 localStorage key と legacy API はそのまま使います。</p>
      {current && <section><h3>Selected Character revision</h3>
        <pre>{JSON.stringify({ id: current.snapshot.character_id, revision: current.snapshot.revision,
          sha: current.snapshot_sha256, binding: current.snapshot.active_body_ref,
          import_anchor: parseImportAnchor(current.snapshot.metadata.notes) }, null, 2)}</pre></section>}
      {active && <section><h3>Take / provenance / archive</h3>
        <p>Bytes/artifact の integrity と actual-run source verification は別です。</p>
        <pre>{JSON.stringify({ take_id: active.view.takeId, integrity: active.read.integrity_state,
          issues: active.read.issues, can_export: active.read.can_export, source_samples_evidence:
          active.read.envelope.source_samples_evidence, source_samples_sha256:
          active.read.envelope.source_samples_sha256, full_verified_source_state:
          active.read.envelope.full_verified_source_state, actual_run_source_samples_sha256:
          active.read.envelope.actual_run_source_samples_sha256, exact_body_ref:
          active.read.envelope.exact_body_ref, motion_ref: active.read.envelope.motion_ref,
          claim_limit: active.view.claimLimit, artifacts: active.read.envelope.performance_result_v1.artifacts },
          null, 2)}</pre></section>}
      {drawerOpen && <p>限定ベースラインは品質 GO ではありません。外部保存とハッシュ独立照合は別作業です。</p>}
    </dialog>
  </div>;
}
