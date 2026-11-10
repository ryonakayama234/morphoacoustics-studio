import { describe, expect, it } from 'vitest';
import type { CharacterVersion } from '../studio/characterApi';
import {
  BASELINE_TAKES, IMPORT_PREFIX, LEGACY_STORAGE_KEY, addTakeReference,
  checkImportCollision, makeImportNotes, parseImportAnchor, parseImportReceipts,
  parseTakeIndex, readLegacyCandidate, selectedBody,
} from './chr1S4';

const sha = 'a'.repeat(64);
const candidate = {
  id: 'char_mio', name: 'ミオ', description: 'test',
  sourceKey: LEGACY_STORAGE_KEY, sourceSha256: sha,
} as const;
const version = (notes: string, id = 'server-1'): CharacterVersion => ({
  head: { character_id: id, current_revision: 1, snapshot_sha256: 'sha256:' + sha },
  snapshot: { record_schema: 'studio-character-store/v0', character_id: id, revision: 1,
    name: 'ミオ', description: '', default_controls: { energy: .35, pace: .9 },
    active_body_ref: null, active_motion_ref: null, source_profile_ref: null,
    capability_scope: 'CC_A2_M0_M1_FIXED_ONLY', metadata: { notes },
    created_at: '2026-11-10T00:00:00Z', updated_at: '2026-11-10T00:00:00Z' },
});
describe('S4 bounded references and fail-closed UX', () => {
  it('builds exact unresolved M0/M1 refs without simulated verified binding', () => {
    expect(selectedBody('v3b-axial-M0').binding_state).toBe('SELECTED_UNRESOLVED');
    expect(selectedBody('v3b-axial-M1').core_commit).toMatch(/^[0-9a-f]{40}$/);
    expect(selectedBody('v3b-axial-M1')).not.toHaveProperty('preparation_digest');
  });
  it('allows a legacy candidate but never treats its Takes or Direction as import fields', () => {
    const raw = JSON.stringify({ draft: { characterId: candidate.id,
      characterName: candidate.name, characterDescription: candidate.description,
      directionNote: 'DO NOT TRANSFER' }, takes: [{ arbitrary: true }], serial: 1 });
    expect(readLegacyCandidate(raw, sha)).toEqual(candidate);
    expect(() => readLegacyCandidate('{bad', sha)).toThrow(/破損/);
    expect(() => readLegacyCandidate(JSON.stringify({ draft: { characterId: 'x',
      characterName: 'x', characterDescription: '' }, takes: null, serial: 1 }), sha)).toThrow();
    expect(() => readLegacyCandidate(null, sha)).toThrow();
  });
  it('anchors import intent in revision-one metadata.notes with immutable fingerprint', () => {
    const notes = makeImportNotes(candidate, 'd1e7c6ac-6bf7-43b6-8db5-032a0f0ccf01', '2026-11-10T00:00:00.000Z');
    expect(notes.startsWith(IMPORT_PREFIX)).toBe(true);
    expect(notes.length).toBeLessThan(4000);
    expect(parseImportAnchor(notes)).toMatchObject({
      source_sha256: sha, legacy_character_id: 'char_mio',
      source_key: LEGACY_STORAGE_KEY, fields: 'name,description',
    });
    expect(parseImportAnchor(IMPORT_PREFIX + '{')).toBeNull();
    expect(checkImportCollision([version(notes)], candidate)).toEqual(['server-1']);
    expect(checkImportCollision([version(notes)], { ...candidate, sourceSha256: 'b'.repeat(64) })).toEqual(['server-1']);
    expect(checkImportCollision([version(notes), version(notes, 'server-2')], candidate)).toHaveLength(2);
    expect(() => checkImportCollision([version(IMPORT_PREFIX + '{')], candidate)).toThrow(/不正/);
  });
  it('fail-closes on malformed receipt indexes and pending ambiguous intents', () => {
    expect(parseImportReceipts(null)).toEqual([]);
    expect(parseImportReceipts(JSON.stringify([{ status: 'pending', sourceSha256: sha,
      legacyId: 'char_mio', importIntentId: 'intent' }]))).toHaveLength(1);
    expect(() => parseImportReceipts('[{"status":"confirmed"}]')).toThrow(/不正/);
    expect(() => parseImportReceipts('{')).toThrow(/破損/);
  });
  it('never represents browser-indexed IDs as a full server inventory', () => {
    expect(parseTakeIndex(null)).toEqual([]);
    const id0 = BASELINE_TAKES[0].id, id1 = BASELINE_TAKES[1].id;
    expect(addTakeReference([id0, id1], id0)).toEqual([id0, id1]);
    expect(addTakeReference([id0], id1)).toEqual([id1, id0]);
    expect(parseTakeIndex(JSON.stringify([id0, id0, id1]))).toEqual([id0, id1]);
    expect(() => addTakeReference([], 'take_../unsafe')).toThrow();
    expect(() => parseTakeIndex('[7]')).toThrow(/不正/);
  });
});
