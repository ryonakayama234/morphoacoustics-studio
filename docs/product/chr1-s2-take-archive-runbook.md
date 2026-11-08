# CHR-1 S2 — Read-only Take lookup / BagIt 1.0 export runbook

Authority: [Issue #46](https://github.com/ryonakayama234/morphoacoustics-studio/issues/46), CHR-R-20261106-02 QI3 / QI5-S2. This is **not** S3, S4, an import API, Core replay, or an off-device backup guarantee.

## API

- `GET http://127.0.0.1:8766/cc-a2/takes/<TakeID>`: scans the whole persisted `takes/` inventory (and optional `v0-takes/`); returns `state`, `issues`, `can_export`, exact source record path/SHA, artifact paths/sizes/SHA and `unreadable_records`. It does not use the pinned/latest-100 recent-history API.
- `GET http://127.0.0.1:8766/cc-a2/takes/<TakeID>/archive`: streams `take-<TakeID>.bag.zip` (uncompressed ZIP STORE). Only available for current-pin complete-artifact Takes or bona fide refusal-only Takes. Invalid ID → 400; no match → 404; existing unexportable Take → 409. No mutation, auto-recompute, import, or fallback.
- Existing `GET /cc-a2/takes`, `POST /cc-a2/perform` and artifact URLs are unchanged. Origin whitelist, localhost bind and `no-store` are inherited.

**Use the actual Core TakeID** (for example `take_cc_a2_integration_A`), not the `takes/<run-uuid>.json` filename. Repeated identical TakeIDs in different saved files are ambiguous and rejected; no last-write-wins repair.

### Interpreting completeness

`AVAILABLE_VERIFIED` means known bytes and applicable provenance are complete; `INCOMPLETE_PROVENANCE` means stored artifact hashes match but some provenance is not attested. Existing CC-A2 Takes normally have `INCOMPLETE_PROVENANCE` because the Core receipt never emitted actual-run source sample SHA and there is no immutable server Character revision in the old record. **They can still be exported**, clearly marked as incomplete; this does not certify source sample identity. `MISSING_ARTIFACT` and `CORRUPT_ARTIFACT` block export and retain diagnostic references. `UNVERIFIED_LEGACY` is old-pin read-only; it is not silently upgraded or exported as current-pin evidence. `REFUSAL_NO_AUDIO` permits a refusal-only Bag with no fabricated WAV.

The archive stores exact `data/take.json` source bytes, JSON projections of the original request/Core output/stored output, portable ref map and archive evidence. Any available genuine Character revision snapshot is included, but **not synthesized** from old creative metadata. All four physical artifacts are packed under content-addressed names if the Core Take is FEASIBLE. BagIt 1.0 SHA-256 payload manifest, tag manifest, `Payload-Oxum`, and ZIP CRC-32 cover the exported bytes. The source store is not written. A manifest is **not** a signature against an adversary who can alter both data and manifest; keep separately recorded SHA-256 and provenance.

## Owner-managed external ZIP procedure

Use the dedicated **PC-local folder outside the repository**, `~/MorphoacousticsBackup`, following the S0 practice. It is a second copy on the same PC, not automatically an off-device backup. In WSL2/bash:

```bash
set -euo pipefail
TAKE_ID='take_cc_a2_integration_A'  # replace with actual exact TakeID
BACKUP="$HOME/MorphoacousticsBackup"
mkdir -p "$BACKUP"
umask 077
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT
curl --fail --show-error --silent \
  "http://127.0.0.1:8766/cc-a2/takes/$TAKE_ID" > "$TEMP/lookup.json"
curl --fail --show-error --silent \
  "http://127.0.0.1:8766/cc-a2/takes/$TAKE_ID/archive" \
  -o "$TEMP/$TAKE_ID.bag.zip"
unzip -t "$TEMP/$TAKE_ID.bag.zip"
# Independently verify all BagIt payload and tag SHA-256 lines.
python3 - "$TEMP/$TAKE_ID.bag.zip" <<'PY'
import hashlib, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    names = z.namelist()
    assert len(names) == len(set(names))
    assert all(not n.startswith('/') and '..' not in n.split('/')
               and '\\' not in n for n in names)
    assert z.read('bagit.txt') == b'BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n'
    for manifest, prefix, expected in [
        ('manifest-sha256.txt', 'data/', {n for n in names if n.startswith('data/')}),
        ('tagmanifest-sha256.txt', '', {n for n in names
         if not n.startswith('data/') and n != 'tagmanifest-sha256.txt'}),
    ]:
        found = set()
        for line in z.read(manifest).decode('utf-8').splitlines():
            digest, name = line.split(None, 1)
            assert name.startswith(prefix) and name in names and name not in found
            assert hashlib.sha256(z.read(name)).hexdigest() == digest
            found.add(name)
        assert found == expected
    print('BagIt payload and tag SHA-256 verification PASS')
PY
TARGET="$BACKUP/$TAKE_ID.bag.zip"
test ! -e "$TARGET"  # never clobber an existing owner copy
cp --no-clobber "$TEMP/$TAKE_ID.bag.zip" "$TARGET"
cmp "$TEMP/$TAKE_ID.bag.zip" "$TARGET"
sha256sum "$TARGET" | tee "$BACKUP/$TAKE_ID.bag.zip.sha256"
```

Store the non-secret Take ID, server record SHA, ZIP SHA, date, core pin, state, and review/verification result in a separate manifest or audit record; **never commit WAV/NPY/ZIP bytes**. Re-verify the stored external ZIP after copy. If download is interrupted, or hashes differ, discard the incomplete temporary file and do not announce a successful export. The local store and ZIP are independent copies, not substitutes for a verified off-device recovery strategy.

## Audit

```bash
node --test server/take-archive.policy.mjs
node --test server/cc-a2-server.policy.mjs server/character-store.policy.mjs
npm test && npm run test:bridge && npm run build
```

The policy suite independently parses ZIP central directory/STORE/CRC, validates exact payload and tag manifests and Payload-Oxum, copies to an external directory and validates again. It covers missing/corrupt bytes, symlinks, traversal, duplicates, restart, stream cancellation, SIGKILL interrupted write, >100 stored records, legacy pin, refusal-only, and source pre/post mutation. Only Muse's exact-head physical/browser E2E can attest a fresh actual Core Take; fixture-based S2 policy tests do not generate or claim physical audio.
