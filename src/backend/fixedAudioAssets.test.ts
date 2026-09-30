import { describe, expect, it } from 'vitest';
import { FIXED_AUDIO_REFS, resolveFixedAudioRef } from './fixedAudioAssets';

async function materializedWav(ref: string) {
  const asset = await resolveFixedAudioRef(ref);
  expect(asset).toBeDefined();
  const response = await fetch(asset!.url);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { asset: asset!, bytes };
}

describe('fixedAudioAssets', () => {
  it.each([
    ['uniform', FIXED_AUDIO_REFS.uniform, 'exp009-40de0d10-uniform.wav'],
    ['constricted', FIXED_AUDIO_REFS.constricted, 'exp009-40de0d10-constricted.wav'],
  ])('rematerializes the exact versioned %s WAV after resolving its persistent ref', async (_name, ref, filename) => {
    const { asset, bytes } = await materializedWav(ref);

    expect(asset.filename).toBe(filename);
    expect(bytes.byteLength).toBe(48_044);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe('WAVE');
  });

  it('does not invent an artifact for an unknown persistent ref', async () => {
    await expect(resolveFixedAudioRef('embedded-wav://experiment-009/unknown')).resolves.toBeUndefined();
  });
});
