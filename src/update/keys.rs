/// A trusted Ed25519 public key for verifying release manifests.
///
/// Multiple keys are supported for key rotation. When rotating:
/// 1. Add the new key at position 0
/// 2. Release a version signed with the OLD key that includes the new key
/// 3. Switch CI to sign with the new key
/// 4. After sufficient adoption, remove the old key
#[derive(Debug, Clone)]
pub struct TrustedKey {
    pub id: &'static str,
    pub fingerprint: &'static str,
    pub public_key_pem: &'static str,
    pub not_before: &'static str,
    pub not_after: Option<&'static str>,
}

// Placeholder key — replaced when the first real release signing key is generated.
// To generate a real key pair:
//   openssl genpkey -algorithm ED25519 -out icefall-release.pem
//   openssl pkey -in icefall-release.pem -pubout -out icefall-release.pub
//
// Then embed the public key here and store the private key as a GitHub Actions secret.
pub static TRUSTED_RELEASE_KEYS: &[TrustedKey] = &[
    TrustedKey {
        id: "icefall-release-2026-placeholder",
        fingerprint: "sha256:placeholder",
        public_key_pem: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n-----END PUBLIC KEY-----",
        not_before: "2026-01-01T00:00:00Z",
        not_after: None,
    },
];

/// Returns the set of currently valid trusted keys (filters by not_before / not_after).
pub fn valid_keys(now: &str) -> Vec<&'static TrustedKey> {
    TRUSTED_RELEASE_KEYS
        .iter()
        .filter(|k| k.not_before <= now)
        .filter(|k| k.not_after.is_none_or(|expiry| now < expiry))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_key_is_present() {
        assert!(!TRUSTED_RELEASE_KEYS.is_empty());
        assert_eq!(
            TRUSTED_RELEASE_KEYS[0].id,
            "icefall-release-2026-placeholder"
        );
    }

    #[test]
    fn valid_keys_filters_by_time() {
        let keys = valid_keys("2026-06-01T00:00:00Z");
        assert_eq!(keys.len(), 1);

        let keys = valid_keys("2025-01-01T00:00:00Z");
        assert_eq!(keys.len(), 0);
    }
}
