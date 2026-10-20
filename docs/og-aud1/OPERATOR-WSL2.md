# OG-AUD1 research preview — WSL2 human operator checklist

**Use only after exact-head GitHub CI is green and the Core+Studio head SHAs below are reverified.** These commands prepare a *non-adopted research preview*, not natural speech. Do not run arbitrary external setup scripts. This test deliberately leaves existing CC-A2/Takes and the adopted Core main untouched.

## Terminal 1 — one-time preparation in WSL2 Ubuntu bash

~~~bash
mkdir -p "$HOME/morpho-og-aud1-review"
cd "$HOME/morpho-og-aud1-review"

git clone --branch research/og-aud1-pinned-preview-gateb-20261020 https://github.com/ryonakayama234/morphoacoustics.git morphoacoustics
cd morphoacoustics
git switch --detach f689d5c61bfb05728b326f3e811deab4eba37750
git rev-parse HEAD
git status --porcelain
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install "numpy==2.4.6"
python -m pip install -e .
PYTHONPATH=src python -m unittest discover -s experiments/046_og_aud1_pinned_preview -p 'test_*.py' -v
deactivate

cd "$HOME/morpho-og-aud1-review"
git clone --branch feature/og-aud1-verified-preview-studio-20261020 https://github.com/ryonakayama234/morphoacoustics-studio.git morphoacoustics-studio
cd morphoacoustics-studio
node --version
npm --version
npm install
npm run build
npm run og-aud1:policy
~~~

Expected: Node 22.12+, Python >=3.11, clean Core source after venv and install, 4 candidate scientific tests and 4 Node policy checks. Use current checked Studio commit explicitly when final approved by CI. The exact printed Core SHA must match the pinned SHA above. If clone exists already, do not overwrite it; use a separate new directory.

## Terminal 2 — keep Core physical local service running

~~~bash
cd "$HOME/morpho-og-aud1-review/morphoacoustics-studio"
export MORPHO_CORE_DIR="$HOME/morpho-og-aud1-review/morphoacoustics"
export MORPHO_PYTHON="$MORPHO_CORE_DIR/.venv/bin/python"
export MORPHO_OG_AUD1_DATA_DIR="$HOME/morpho-og-aud1-review/og-aud1-takes"
npm run og-aud1:server
~~~

Expected server line: OG-AUD1 research preview on 127.0.0.1:8767. It must refuse a nonmatching or dirty Core checkout. This terminal stays open while using the browser.

## Terminal 3 — Studio web application

~~~bash
cd "$HOME/morpho-og-aud1-review/morphoacoustics-studio"
npm run dev -- --host 127.0.0.1
~~~

Open http://localhost:5173 in the Windows browser. WSL2 localhost forwarding must be enabled. In Studio, find **OG-AUD1 · 3器官の物理A/B実験を開く／閉じる**. Open that panel and press **2身体の物理Takeを新規Perform** once. You should see A/C=1.5 cm² and B/C=6.0 cm² as distinct, otherwise same graph geometries, two native audio controls, exact source/backend/body snapshot identities, and download links to raw Pa and all six p/U ports. The output is **non-radiated internal p(A.in,t)**, not human speech, despite browser audio playback.

## Gate D (human operator owns this)

- Play A then B; do they sound different (yes/no/uncertain)? Record what changed: timbre, strength/loudness, or other feature.
- Does this A–J–(B,C) body difference help a creator design a Character? Record usefulness and any misleading controls/labels. Do not infer SPL from playback gain.
- Refresh page and confirm pair remains. Stop the Node physical service (Ctrl-C in Terminal 2), restart with same command, reload browser, confirm same Take IDs, same WAV availability, same source SHA and graph digests.
- Run negative refusal via a separate terminal (does not create a Take):

~~~bash
curl -sS -X POST http://127.0.0.1:8767/og-aud1/perform \
  -H 'Content-Type: application/json' \
  -d '{"schema":"og-aud1.preview.request.v0","character_id":"manual-audit","body":"arbitrary-not-supported"}'
~~~

Expect HTTP 400 and **no** newly playable pair. To view the status:

~~~bash
curl -sS http://127.0.0.1:8767/og-aud1/health
~~~

Expected adopted=false, preview, and exact Core commit. Keep a simple record of the tested browser, Windows/WSL2 version, exact hashes printed, audible findings, and any errors. Post human observations to [Studio #20](https://github.com/ryonakayama234/morphoacoustics-studio/issues/20) or share with the audit assistant. Do **not** merge experiment Drafts or claim final physics adoption without independent Gate A/B science and security signoffs.
