export const DYNAMIC_ASSET_REFS = {
  fast: {
    audio: 'embedded-x1b://experiment-010/373ff710/wide-body/fast/audio',
    trace: 'embedded-x1b://experiment-010/373ff710/wide-body/fast/trace',
  },
  slow: {
    audio: 'embedded-x1b://experiment-010/373ff710/wide-body/slow/audio',
    trace: 'embedded-x1b://experiment-010/373ff710/wide-body/slow/trace',
  },
} as const;

type EmbeddedAsset = Readonly<{
  sourcePaths: readonly string[];
  filename: string;
  sha256: string;
  mediaType: string;
}>;

export type ResolvedDynamicAsset = Readonly<{
  url: string;
  filename: string;
  mediaType: string;
}>;

const EMBEDDED: Record<string, EmbeddedAsset> = {
  [DYNAMIC_ASSET_REFS.fast.audio]: {
    sourcePaths: [
      'x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part1',
      'x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part2',
      'x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part3a',
      'x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part3b',
      'x1b/exp010-373ff710-wide-body-fast.wav.gz.b64.part4',
    ],
    filename: 'exp010-373ff710-wide-body-fast.wav',
    sha256: 'a71937a8cdb10590e7decc4f672ecaeed3c15e1560daf849932e883734c544ec',
    mediaType: 'audio/wav',
  },
  [DYNAMIC_ASSET_REFS.slow.audio]: {
    sourcePaths: ['x1b/exp010-373ff710-wide-body-slow.wav.gz.b64'],
    filename: 'exp010-373ff710-wide-body-slow.wav',
    sha256: '76d9f9ae49ce086fc6ee76a49aa3c78ee2b1843d31cf366aa6dee853f1565be2',
    mediaType: 'audio/wav',
  },
  [DYNAMIC_ASSET_REFS.fast.trace]: {
    sourcePaths: ['x1b/exp010-373ff710-wide-body-fast-trace.csv.gz.b64'],
    filename: 'exp010-373ff710-wide-body-fast-trace.csv',
    sha256: '73e59ec7fe9d1605a4b63d62266b86ef6bc4012292a1b74d269f2918b25bf9cb',
    mediaType: 'text/csv',
  },
  [DYNAMIC_ASSET_REFS.slow.trace]: {
    sourcePaths: ['x1b/exp010-373ff710-wide-body-slow-trace.csv.gz.b64'],
    filename: 'exp010-373ff710-wide-body-slow-trace.csv',
    sha256: '90dadf1a2a4fd4e3e92b3d7ee363de072ad0fc39c1e0463c83e565239574cb73',
    mediaType: 'text/csv',
  },
};

const cache = new Map<string, Promise<ResolvedDynamicAsset>>();

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function loadEncodedParts(sourcePaths: readonly string[]): Promise<string> {
  const parts = await Promise.all(sourcePaths.map(async (sourcePath) => {
    const sourceUrl = new URL(sourcePath, document.baseURI).toString();
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`X1b asset fetch failed: ${response.status} ${sourceUrl}`);
    return (await response.text()).replace(/\s+/g, '');
  }));
  return parts.join('');
}

async function materialize(asset: EmbeddedAsset): Promise<ResolvedDynamicAsset> {
  const compressed = decodeBase64(await loadEncodedParts(asset.sourcePaths));
  const compressedBuffer = compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength,
  ) as ArrayBuffer;
  const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  const digest = await sha256Hex(buffer);
  if (digest !== asset.sha256) throw new Error(`embedded X1b asset digest mismatch: ${digest}`);
  return {
    url: URL.createObjectURL(new Blob([buffer], { type: asset.mediaType })),
    filename: asset.filename,
    mediaType: asset.mediaType,
  };
}

export async function resolveDynamicAssetRef(ref: string): Promise<ResolvedDynamicAsset | undefined> {
  const asset = EMBEDDED[ref];
  if (!asset) return undefined;
  let pending = cache.get(ref);
  if (!pending) {
    pending = materialize(asset);
    cache.set(ref, pending);
  }
  return pending;
}
