import { describe, expect, it } from 'vitest';
import request from '../../vendor/performance-contract/v0/examples/request.json';
import { draftFromRequest } from '../studio/model';
import { makeCCRequest } from './CCAtelier';

describe('CC-A2 exact body v1 creator mapping', () => {
  const draft = draftFromRequest(request);

  it('preserves Character identity and confines physics selection to v1 embodiment', () => {
    const a = makeCCRequest(draft, 'v3b-axial-M0', 'cc_a2_A');
    const b = makeCCRequest(draft, 'v3b-axial-M1', 'cc_a2_B');
    expect(a.schema_version).toBe('performance-contract/v1');
    expect(a.character.character_id).toBe(b.character.character_id);
    expect(a.character).toEqual(b.character);
    expect(a.script).toEqual(b.script);
    expect(a.direction).toEqual(b.direction);
    expect(a.script.segments[0].text).toBe('あい');
    expect(a.seed).toBe(0);
    expect(a.direction.controls).toEqual({});
    expect(a.direction.segment_overrides).toEqual([]);
    expect(a.embodiment).toEqual({ preset_id: 'v3b-axial-M0', preset_revision: 1 });
    expect(b.embodiment).toEqual({ preset_id: 'v3b-axial-M1', preset_revision: 1 });
    expect('geometry' in a.character).toBe(false);
    expect('tract_area' in a.direction).toBe(false);
  });
});
