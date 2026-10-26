import { describe, expect, it } from 'vitest';
import { makeWG2Request } from './WG2Atelier';

describe('WG2 static real-body audition request boundary', () => {
  it('constructs a fixed exact-revision request without inventing text or DSP controls', () => {
    const a = makeWG2Request('char_mio', 'v3b-axial-M0', 0.25);
    const b = makeWG2Request('char_mio', 'v3b-axial-M1', 0.50);
    expect(a).toEqual({
      character_id: 'char_mio', preset_id: 'v3b-axial-M0',
      revision: 1, duration_s: 0.25,
    });
    expect(b).toEqual({
      character_id: 'char_mio', preset_id: 'v3b-axial-M1',
      revision: 1, duration_s: 0.50,
    });
    expect('script' in a).toBe(false);
    expect('voice_color' in a).toBe(false);
    expect('source_gain' in a).toBe(false);
  });
});
