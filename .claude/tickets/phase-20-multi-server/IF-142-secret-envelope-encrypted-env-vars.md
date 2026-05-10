# IF-142: Secret envelope — encrypted env var transfer

**Phase:** 20E — Polish & Security
**Priority:** High
**Estimate:** M

## Description

Implement end-to-end encryption for environment variables when they are transferred to worker servers during deploys. Each worker has an X25519 keypair generated during enrollment. For each deploy, the control plane generates a per-deploy AES-256-GCM key, encrypts the env vars, then encrypts the AES key with the worker's X25519 public key. The worker decrypts with its private key and passes the env vars directly to Docker in memory, never writing them to disk.

## Acceptance Criteria

### Worker Keypair (Agent Side)
- [ ] X25519 keypair generated during enrollment (IF-122)
- [ ] Private key stored at `/etc/icefall-agent/keys/private.key`, mode 0600, root-owned
- [ ] Public key sent to control plane during enrollment and stored in `servers.public_key`
- [ ] Private key never leaves the worker server

### Encryption (Control Plane Side)
- [ ] Per-deploy AES-256-GCM key: 256-bit random key generated for each deploy
- [ ] Env vars serialized as JSON, then encrypted with AES-256-GCM
- [ ] Nonce: 96-bit random, prepended to the ciphertext
- [ ] AES key encrypted with the worker's X25519 public key using a key encapsulation scheme
- [ ] Encrypted payload (envelope):
  ```json
  {
    "encrypted_key": "<base64 — AES key encrypted with X25519>",
    "nonce": "<base64 — 12-byte nonce>",
    "ciphertext": "<base64 — AES-256-GCM encrypted env vars>",
    "key_id": "<server public key fingerprint>"
  }
  ```
- [ ] Envelope sent as part of the `container.create` command to the agent

### Decryption (Agent Side)
- [ ] Agent decrypts the AES key using its X25519 private key
- [ ] Agent decrypts the env var JSON using AES-256-GCM with the recovered key and nonce
- [ ] Env vars passed directly to `bollard::container::Config.env` in memory
- [ ] Decrypted env vars are never written to disk, logs, or temporary files
- [ ] After container creation: plaintext env vars zeroed from memory

### Key Rotation
- [ ] If a worker's keypair is compromised: agent generates new keypair, re-enrolls
- [ ] Control plane updates the stored public key
- [ ] Existing running containers are unaffected (env vars already in Docker)

### Error Handling
- [ ] Public key not found for server: deploy fails with "server encryption key missing"
- [ ] Decryption failure on agent: deploy fails with "unable to decrypt environment variables"
- [ ] Key fingerprint mismatch: deploy fails with "key mismatch" (prevents stale key usage)

## Technical Notes

- Use `x25519-dalek` for key exchange and `aes-gcm` crate for symmetric encryption
- The key encapsulation scheme: perform X25519 Diffie-Hellman with an ephemeral keypair, derive the shared secret, use it to encrypt the AES key (or use the shared secret directly as the AES key)
- The `key_id` field is the SHA-256 fingerprint of the server's public key — used to detect stale keys
- Memory zeroing: use `zeroize` crate on the decrypted env vars after they are passed to Docker
- This scheme ensures that even if the WebSocket connection is compromised (TLS stripped), env vars remain encrypted

## Out of Scope

- Encrypting other data (only env vars for now)
- Hardware security module (HSM) integration
- Key escrow or recovery mechanisms
- Encrypting env vars at rest in the control plane database (separate concern)

## Dependencies

- IF-122 (agent enrollment generates the X25519 keypair)
- IF-131 (server-aware deploy manager sends the encrypted envelope during deploys)
