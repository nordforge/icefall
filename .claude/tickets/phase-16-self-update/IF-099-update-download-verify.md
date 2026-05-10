# IF-099: Update download & integrity verification

**Phase:** 16 — Self-Update
**Priority:** Critical
**Estimate:** M

## Description

Implement the secure download and multi-layer verification of update artifacts. After IF-098 discovers an available version, this ticket handles fetching the correct architecture-specific tarball, verifying its integrity (SHA-256 + Ed25519 chain), extracting the contents, and validating the new binary — all with progress reporting via SSE.

## Acceptance Criteria

### Architecture Detection
- [ ] Binary knows its target triple at compile time (`env!("TARGET")` set in `build.rs`)
- [ ] Selects the matching artifact from the manifest's `artifacts` map
- [ ] If no matching artifact exists: clear error "No update binary available for your architecture ({triple})"

### Pre-Download Checks
- [ ] Verify available disk space: requires `artifact_size * 3` free (download + extract + backup)
  - Use `statvfs` on the download directory's filesystem
  - Clear error if insufficient: "Not enough disk space. Need {required}, have {available}."
- [ ] Verify download directory exists and is writable: `/var/lib/icefall/updates/`
- [ ] Clean up any previous incomplete downloads (`.partial` files)

### Download with Progress
- [ ] Download to `icefall-{version}.tar.gz.partial` in `/var/lib/icefall/updates/`
- [ ] Use `reqwest` with streaming response for progress tracking
- [ ] Track `bytes_downloaded` vs `Content-Length` for percentage
- [ ] Store progress in `update_state` table so multiple clients can poll
- [ ] Rename `.partial` → `.tar.gz` on successful completion
- [ ] If download fails: delete `.partial`, report error, allow retry
- [ ] Timeout: 10 minutes for the full download

### Integrity Verification (Two Layers)
- [ ] **Layer 1 — SHA-256**: Compute SHA-256 of downloaded tarball, compare against manifest `sha256` field
  - If mismatch: delete download, report "Download integrity check failed. The file may be corrupted."
  - Do NOT retry automatically (could indicate tampering)
- [ ] **Layer 2 — Ed25519 chain**: Manifest was already signature-verified during discovery (IF-098). The hash in the verified manifest is the trust anchor for the downloaded file.

### Extraction & Validation
- [ ] Extract tarball to temp directory on same filesystem as target binary
- [ ] Verify extracted binary exists and is executable
- [ ] Run `./icefall-new --version` to confirm it prints the expected version
- [ ] Verify dashboard assets directory exists (if not embedded in binary)
- [ ] Set executable permissions: `chmod 755` on the binary

### SSE Progress Events
- [ ] Stream real-time progress to connected admin clients:
  ```
  event: update.download_progress
  data: {"percent": 45, "bytes_downloaded": 15728640, "bytes_total": 34952806}

  event: update.download_complete
  data: {"version": "1.4.0", "verified": true}

  event: update.download_failed
  data: {"version": "1.4.0", "error": "SHA-256 mismatch"}
  ```

### API Endpoint
- [ ] `POST /api/v1/system/update/download` — start downloading a specific version
  - Returns 409 if a download is already in progress
  - Returns 404 if no update is available
  - Returns 200 with initial status, then streams progress via SSE

## Technical Notes

- `sha2` crate for SHA-256 (already in deps)
- `flate2` + `tar` crates for `.tar.gz` extraction
- Same-filesystem download/extract is critical for atomic `rename()` in IF-100
- The `.partial` convention makes interrupted downloads obvious — on daemon restart, any `.partial` files are deleted
- No resume support (HTTP Range) in v1 — binary is ~20-50MB, full re-download is fast enough
- Keep at most 1 downloaded update + 1 rollback binary in the updates directory

## Out of Scope

- Applying the downloaded update (IF-100)
- Resume support via HTTP Range requests (future enhancement)
- Differential/delta updates (not worth it for binary size)

## Dependencies

- IF-097 (release pipeline — need artifacts to download)
- IF-098 (update discovery — provides manifest and version info)
