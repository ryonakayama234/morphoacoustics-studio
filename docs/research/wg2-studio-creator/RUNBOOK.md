# WSL2/Linux WG2 local creator Take trial

Prerequisites: Node 22+, npm11, Python3.11, Linux/Wsl2. This stage is a **Draft** research integration until exact review/CI passes. It does NOT replace prior Core checkouts or CC-A2 service. Clone a **separate** WG2 Core checkout at the exact pinned `CORE_SHA` declared by `server/wg2-local.mjs`. Install Python dependencies with Core's hashed `requirements/sv1-physical-py311.lock.txt`; then `pip install --no-deps --no-build-isolation -e .`. The checkout must be clean, and the Core SHA must match the Node service. Use `npm install --no-audit --no-fund` in Studio. Exact commands as used in CI:

```bash
cd morphoacoustics-wg2
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --only-binary=:all: --require-hashes -r requirements/sv1-physical-py311.lock.txt
python -m pip install --no-deps --no-build-isolation -e .
cd ../morphoacoustics-studio
npm install --no-audit --no-fund
export MORPHO_WG2_CORE_DIR="$(cd ../morphoacoustics-wg2 && pwd)"
export MORPHO_WG2_PYTHON="$MORPHO_WG2_CORE_DIR/.venv/bin/python"
npm run wg2:server
```

In a second terminal, run `npm run dev` from Studio and visit the Vite URL. Open WG2's opt-in panel, select M0 then M1, Perform, play and download A/B. Reload and restart the WG2 server to verify the history. WAVs are **mouth-port pressure monitors**, not calibrated microphone recordings.

Separate old CC-A2 and CC-B1 service roots, processes and their pinned Core SHAs remain unchanged. Do not repin an old service to the new Core commit. If Core PR #193 changes during review, update `CORE_SHA` and the dedicated Studio CI checkout, rerun all gates.
