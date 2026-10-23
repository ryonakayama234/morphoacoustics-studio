# CC-B1 private Atelier — WSL2/Linux runbook

Status: opt-in **GO_LOCAL_CREATOR_PROTOTYPE** (owner-delegated engineering decision; integration state tracked by Studio PR #27). Not a public API, deployed service, or general speech capability. Intended for a single trusted creator on their PC. Core physical SHA must be exact. No public service, cloud auth, signer PKI or anthropomorphic/natural speech claims.

## Installation

Run in WSL2 Ubuntu/bash (Python 3.11, Node 22.12+). Keep **three separate** Core checkouts if using legacy X2a and CC-A2 simultaneously: they have distinct frozen SHA requirements.

```bash
git clone https://github.com/ryonakayama234/morphoacoustics.git morphoacoustics-cc-b1
cd morphoacoustics-cc-b1
git fetch origin pull/166/head
git checkout ef23738e1e6e3c631de5e36912bf5b601c7a17b3
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
pip install 'numpy==2.4.6'
python -c 'import numpy; assert numpy.__version__ == "2.4.6"'
cd ..

git clone https://github.com/ryonakayama234/morphoacoustics-studio.git
cd morphoacoustics-studio
git fetch origin pull/27/head
git checkout FETCH_HEAD
npm install --global npm@11.6.0
npm install --no-audit --no-fund
```

In a Studio terminal (same directory):

```bash
export MORPHO_CC_B1_CORE_DIR="$(realpath ../morphoacoustics-cc-b1)"
export MORPHO_CC_B1_PYTHON="$MORPHO_CC_B1_CORE_DIR/.venv/bin/python"
npm run cc-b1:server
```

In another Studio terminal:

```bash
npm run dev
```

Open the Vite page (normally `http://localhost:5173`). Expand **「CC-B1 · 身体の断面積を変えて声を聴く（ローカル実験）」**. Choose ×0.90 or ×1.10, press **「この身体の声を新規生成」**, listen to A/B WAV. A is the freshly synthesized reference body in that pair; B has the *only* rest-area edit on vocal tract section 9 (index8). The LF source and 3-task motor score remain fixed. You can compare prior attempts by selecting them in the list and reloading the page or localhost bridge.

Core's actual raw physical Pa (NumPy), 48kHz mono WAV, trace, manifest, and Studio pair completion record are stored in Studio's local `.morpho-cc-b1-data/runs/<UUID>/` directory; content-derived BodyRevision identity is under `.morpho-cc-b1-data/registry/revisions/`. Back up this directory if the creative history matters. Do not manually edit the physical receipts; the bridge refuses tampered readbacks.

## Personal-use policy

- Keep localhost and trusted Core checkout. The service binds `127.0.0.1:8767`; Vite proxies requests on localhost.
- The bridge pins and checks Core HEAD `ef23738...`, a clean tree including ignored executable candidates, the fixed Core v1 protocol, and a private local registry. Arbitrary anatomy, source injection, file paths, F0 or script control cannot be passed through this v0 Studio endpoint.
- An existing completed physical pair must be revalidated before it is shown. An incomplete/failed attempt is not a playable Take.
- No claim of malicious same-UID resistance, network deployment, hard crash consistency, human vocal naturalness or speaker/person identity. An extra shared-auth/PKI/service layer is *not* needed for this personal-loop milestone.
- This is a **new opt-in service**. CC-A2 retains its separate Core SHA, Node port 8766 and UI, and adopted X2a remains unchanged.
- If the Core PR #166 SHA changes, update the bridge pin, workflow, runbook and re-run genuine paired-physical CI; do not silently point to newer Core main.

## Acceptance evidence

The preregistered [INDEX.md](INDEX.md) defines exact failures and no-fake-Take requirements. `npm run build && npm test && npm run test:cc-b1` covers Studio compile, unit and refusing unexpected inputs. [Draft PR #27](https://github.com/ryonakayama234/morphoacoustics-studio/pull/27) dedicated GitHub Actions uses two real (0.90/1.10) 0.5s physically generated paired Core Pa/WAVs, tests new-process registry readback, and stores download artifacts.

Listening judgment belongs to the creator. The engineering checks can show physical difference in computed pressure, **not** that it sounds human, a vowel difference is audible, or a particular character is uniquely identifiable.
