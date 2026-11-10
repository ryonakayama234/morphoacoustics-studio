/** CHR-1 S4: local-only reference/index logic. No new server schema or API. */
import type { SelectedBodyRef, CharacterVersion } from '../studio/characterApi';

export const LEGACY_STORAGE_KEY = 'morphoacoustics-studio:s2-workspace:v1';
export const TAKE_INDEX_KEY = 'morphoacoustics-studio:chr1-s4-take-refs:v1';
export const IMPORT_RECEIPT_KEY = 'morphoacoustics-studio:chr1-s4-import-receipts:v1';
export const IMPORT_PREFIX = 'CHR1_S4_IMPORT_V1:';
export const CORE_PIN = 'b569f044bfda309dff1a00cccf8365754e6b1355';
export const BASELINE_TAKES = [
  { label: 'S5 M0（Owner PC の限定記録）', id: 'take_studio_v0_41877a7b213a499fb054c3fc59e3e2c8' },
  { label: 'S5 M1（Owner PC の限定記録）', id: 'take_studio_v0_c606fd53bf1447e9970f5a818b4f0325' },
] as const;
const takePattern = /^take_studio_v0_[a-z0-9_-]{1,140}$/;
const hex = /^[a-f0-9]{64}$/;
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function selectedBody(presetId: SelectedBodyRef['preset_id']): SelectedBodyRef {
  return {
    kind: 'core_body_preset', preset_id: presetId, preset_revision: 1,
    producer_repo: 'ryonakayama234/morphoacoustics', core_commit: CORE_PIN,
    backend_id: 'cc-a2-axial-live/1', binding_state: 'SELECTED_UNRESOLVED',
  };
}

export type LegacyImport = {
  id: string;
  name: string;
  description: string;
  sourceKey: typeof LEGACY_STORAGE_KEY;
  /** Fingerprint of the entire original localStorage value. Legacy Takes are NOT imported. */
  sourceSha256: string;
};
export function readLegacyCandidate(raw: string | null, sha: string): LegacyImport {
  if (raw === null) throw new Error('このブラウザには取り込み対象の旧下書きがありません。');
  if (!hex.test(sha)) throw new Error('下書き fingerprint が無効です。');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('旧下書き JSON が破損しています。取り込みは停止しました。'); }
  if (!isObject(parsed) || !isObject(parsed.draft) ||
      !Array.isArray(parsed.takes) || !Number.isSafeInteger(parsed.serial))
    throw new Error('旧下書きの形式が不明です。取り込みは停止しました。');
  const d = parsed.draft;
  if (typeof d.characterId !== 'string' || !d.characterId.trim() ||
      d.characterId.length > 160 || /[\\/\0]/.test(d.characterId) ||
      typeof d.characterName !== 'string' || !d.characterName.trim() ||
      d.characterName.length > 160 || d.characterName.includes('\0') ||
      typeof d.characterDescription !== 'string' ||
      d.characterDescription.length > 4000 || d.characterDescription.includes('\0'))
    throw new Error('旧 Character の識別子・名前・説明が不正です。');
  return {
    id: d.characterId, name: d.characterName, description: d.characterDescription,
    sourceKey: LEGACY_STORAGE_KEY, sourceSha256: sha,
  };
}
export async function fingerprint(raw: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('安全な SHA-256 API がありません。取り込みを停止しました。');
  const sha = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(sha)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export type ImportAnchor = {
  format: 'chr1-s4-ux-import-v1';
  source_key: string;
  legacy_character_id: string;
  source_sha256: string;
  import_intent_id: string;
  imported_at: string;
  fields: 'name,description';
  limitation: 'browser-only draft; script, Direction and Takes not transferred; no atomic exactly-once guarantee';
};
export function makeImportNotes(candidate: LegacyImport, intentId: string, importedAt: string): string {
  if (!/^[a-f0-9-]{36}$/i.test(intentId) || !Number.isFinite(Date.parse(importedAt)))
    throw new Error('import intent の識別子が不正です。');
  const anchor: ImportAnchor = {
    format: 'chr1-s4-ux-import-v1', source_key: candidate.sourceKey,
    legacy_character_id: candidate.id, source_sha256: candidate.sourceSha256,
    import_intent_id: intentId, imported_at: importedAt, fields: 'name,description',
    limitation: 'browser-only draft; script, Direction and Takes not transferred; no atomic exactly-once guarantee',
  };
  const notes = IMPORT_PREFIX + JSON.stringify(anchor);
  if (notes.length > 4000) throw new Error('metadata.notes の長さ制限を超えます。');
  return notes;
}
export function parseImportAnchor(notes: unknown): ImportAnchor | null {
  if (typeof notes !== 'string' || !notes.startsWith(IMPORT_PREFIX)) return null;
  try {
    const a: unknown = JSON.parse(notes.slice(IMPORT_PREFIX.length));
    if (!isObject(a) || a.format !== 'chr1-s4-ux-import-v1' ||
        a.source_key !== LEGACY_STORAGE_KEY || typeof a.legacy_character_id !== 'string' ||
        typeof a.source_sha256 !== 'string' || !hex.test(a.source_sha256) ||
        typeof a.import_intent_id !== 'string' || typeof a.imported_at !== 'string' ||
        a.fields !== 'name,description' || typeof a.limitation !== 'string') return null;
    return a as ImportAnchor;
  } catch { return null; }
}
/** Ambiguous or malformed import anchors are never ignored as a safe duplicate check. */
export function checkImportCollision(records: readonly CharacterVersion[], candidate: LegacyImport): string[] {
  const matches: string[] = [];
  for (const item of records) {
    const notes = item.snapshot.metadata?.notes;
    if (typeof notes !== 'string' || !notes.startsWith(IMPORT_PREFIX)) continue;
    const anchor = parseImportAnchor(notes);
    if (!anchor) throw new Error('不正な既存 import anchor を検出しました。重複確認不能のため停止します。');
    if (anchor.source_key === candidate.sourceKey &&
        anchor.legacy_character_id === candidate.id)
      matches.push(item.snapshot.character_id);
  }
  return matches;
}

export function parseTakeIndex(raw: string | null): string[] {
  if (raw === null) return [];
  let obj: unknown;
  try { obj = JSON.parse(raw); } catch { throw new Error('ブラウザ Take 参照索引が破損しています。'); }
  if (!Array.isArray(obj) || obj.length > 100 || obj.some(id => typeof id !== 'string' || !takePattern.test(id)))
    throw new Error('ブラウザ Take 参照索引が不正です。');
  return [...new Set(obj)];
}
export function addTakeReference(current: readonly string[], id: string): string[] {
  if (!takePattern.test(id)) throw new Error('v0 Take ID の形式ではありません。');
  return [id, ...current.filter(item => item !== id)].slice(0, 50);
}

export type ImportReceipt = {
  status: 'pending' | 'confirmed';
  sourceSha256: string;
  legacyId: string;
  importIntentId: string;
  serverCharacterId?: string;
  serverRevision?: number;
  serverSnapshotSha256?: string;
};
export function parseImportReceipts(raw: string | null): ImportReceipt[] {
  if (raw === null) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('import receipt 索引が破損しています。安全のため停止します。'); }
  if (!Array.isArray(value) || value.length > 100 || value.some(x =>
      !isObject(x) || (x.status !== 'pending' && x.status !== 'confirmed') ||
      typeof x.sourceSha256 !== 'string' || !hex.test(x.sourceSha256) ||
      typeof x.legacyId !== 'string' || typeof x.importIntentId !== 'string' ||
      (x.status === 'confirmed' && (typeof x.serverCharacterId !== 'string' ||
        !Number.isSafeInteger(x.serverRevision) || typeof x.serverSnapshotSha256 !== 'string'))))
    throw new Error('import receipt の形式が不正です。安全のため停止します。');
  return value as ImportReceipt[];
}
