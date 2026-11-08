/** CHR-1 S3 transport types. Server Character IDs/revisions are authoritative;
 * legacy StudioDraft remains a separate, untrusted editor-only model.
 */
export type SelectedBodyRef = Readonly<{
  kind: 'core_body_preset';
  preset_id: 'v3b-axial-M0' | 'v3b-axial-M1';
  preset_revision: 1;
  producer_repo: 'ryonakayama234/morphoacoustics';
  core_commit: string;
  backend_id: 'cc-a2-axial-live/1';
  binding_state: 'SELECTED_UNRESOLVED' | 'VERIFIED_BOUND';
  preparation_digest?: string;
  body_receipt_ref?: string;
}>;
export type StoredCharacter = Readonly<{
  record_schema: 'studio-character-store/v0';
  character_id: string;
  revision: number;
  name: string;
  description: string;
  default_controls: { energy: number; pace: number };
  active_body_ref: SelectedBodyRef | null;
  active_motion_ref: null | { id: string; revision: number; digest?: string };
  source_profile_ref: null | { id: string; revision: number; digest?: string };
  capability_scope: 'CC_A2_M0_M1_FIXED_ONLY';
  metadata: { notes?: string; tags?: string[] };
  created_at: string;
  updated_at: string;
}>;
export type CharacterVersion = Readonly<{
  head: { character_id: string; current_revision: number; snapshot_sha256: string };
  snapshot: StoredCharacter;
  snapshot_sha256?: string;
}>;
export type CharacterChanges = Partial<Pick<StoredCharacter,
  'name' | 'description' | 'default_controls' | 'active_body_ref' |
  'active_motion_ref' | 'source_profile_ref' | 'metadata' | 'capability_scope'>>;
export type V0Submission = Readonly<{
  submission_id: string; // UUID idempotency/replay key, generated once per user action
  character_id: string;
  character_revision: number;
  character_snapshot_sha256: string;
  body_preset_id?: SelectedBodyRef['preset_id']; // assertion only; not authority
  text?: 'あい'; // only the fixed task; not an open script API
  direction?: Record<string, never>;
  seed?: 0;
}>;
export class StudioApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message); this.name = 'StudioApiError';
  }
}
async function jsonRequest<T>(route: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(route, { ...init,
    cache: 'no-store',
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const obj = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    throw new StudioApiError(response.status, typeof obj.code === 'string' ? obj.code : 'HTTP_ERROR',
      typeof obj.message === 'string' ? obj.message : 'Studio server request failed');
  }
  return data as T;
}
/** GET at an exact revision includes snapshot_sha256; do not use current
 * head-only views as a substitute for an exact immutable revision. */
export const characterApi = {
  list: () => jsonRequest<CharacterVersion[]>('/characters'),
  create: (changes: CharacterChanges & { name: string }) =>
    jsonRequest<CharacterVersion>('/characters',
      { method: 'POST', body: JSON.stringify(changes) }),
  get: (characterId: string) =>
    jsonRequest<CharacterVersion>('/characters/' + encodeURIComponent(characterId)),
  revision: (characterId: string, revision: number) =>
    jsonRequest<CharacterVersion>('/characters/' + encodeURIComponent(characterId) +
      '/revisions/' + encodeURIComponent(revision)),
  patch: (characterId: string, expectedRevision: number, changes: CharacterChanges) =>
    jsonRequest<CharacterVersion>('/characters/' + encodeURIComponent(characterId),
      { method: 'PATCH', body: JSON.stringify({ expected_revision: expectedRevision, changes }) }),
  perform: <T>(submission: V0Submission) =>
    jsonRequest<T>('/studio/v0/perform', { method: 'POST', body: JSON.stringify(submission) }),
  take: <T>(takeId: string) =>
    jsonRequest<T>('/studio/v0/takes/' + encodeURIComponent(takeId)),
};
