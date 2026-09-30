import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const CASES = [
  {
    paths: [
      'public/x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part1',
      'public/x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part2',
      'public/x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part3',
      'public/x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part4',
    ],
    sha256: 'a71937a8cdb10590e7decc4f672ecaeed3c15e1560daf849932e883734c544ec',
    prefix: 'RIFF',
  },
  {
    paths: ['public/x1b/exp010-373ff710-wide-body-slow.wav.gz.b64'],
    sha256: '76d9f9ae49ce086fc6ee76a49aa3c78ee2b1843d31cf366aa6dee853f1565be2',
    prefix: 'RIFF',
  },
  {
    paths: ['public/x1b/exp010-373ff710-wide-body-fast-trace.csv.gz.b64'],
    sha256: '73e59ec7fe9d1605a4b63d62266b86ef6bc4012292a1b74d269f2918b25bf9cb',
    prefix: 'time_s,activation,area_m2',
  },
  {
    paths: ['public/x1b/exp010-373ff710-wide-body-slow-trace.csv.gz.b64'],
    sha256: '90dadf1a2a4fd4e3e92b3d7ee363de072ad0fc39c1e0463c83e565239574cb73',
    prefix: 'time_s,activation,area_m2',
  },
] as const;

function readEncoded(paths: readonly string[]): string {
  return paths
    .map((path) => readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\s+/g, ''))
    .join('');
}

describe('Experiment 010 pinned X1b assets', () => {
  for (const fixture of CASES) {
    it(`matches source digest for ${fixture.paths.join(' + ')}`, () => {
      const raw = gunzipSync(Buffer.from(readEncoded(fixture.paths), 'base64'));
      const digest = createHash('sha256').update(raw).digest('hex');

      expect(digest).toBe(fixture.sha256);
      expect(raw.subarray(0, fixture.prefix.length).toString('utf8')).toBe(fixture.prefix);
    });
  }
});
