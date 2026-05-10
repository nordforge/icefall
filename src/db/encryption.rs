use aes_gcm::aead::rand_core::RngCore;
use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum EncryptionError {
    #[error("encryption failed")]
    Encrypt,
    #[error("decryption failed")]
    Decrypt,
    #[error("invalid ciphertext: too short")]
    InvalidCiphertext,
}

const NONCE_SIZE: usize = 12;

pub struct Encryptor {
    cipher: Aes256Gcm,
}

impl Encryptor {
    pub fn new(key: &[u8; 32]) -> Self {
        let cipher = Aes256Gcm::new_from_slice(key).expect("valid 32-byte key");
        Self { cipher }
    }

    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, EncryptionError> {
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext)
            .map_err(|_| EncryptionError::Encrypt)?;

        let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);
        Ok(result)
    }

    pub fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, EncryptionError> {
        if data.len() < NONCE_SIZE {
            return Err(EncryptionError::InvalidCiphertext);
        }

        let (nonce_bytes, ciphertext) = data.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);

        self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| EncryptionError::Decrypt)
    }

    pub fn generate_key() -> [u8; 32] {
        let mut key = [0u8; 32];
        OsRng.fill_bytes(&mut key);
        key
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let key = Encryptor::generate_key();
        let encryptor = Encryptor::new(&key);
        let plaintext = b"DATABASE_URL=postgres://localhost/mydb";

        let encrypted = encryptor.encrypt(plaintext).unwrap();
        assert_ne!(&encrypted, plaintext);

        let decrypted = encryptor.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn decrypt_with_wrong_key_fails() {
        let encryptor1 = Encryptor::new(&Encryptor::generate_key());
        let encryptor2 = Encryptor::new(&Encryptor::generate_key());

        let encrypted = encryptor1.encrypt(b"secret").unwrap();
        assert!(encryptor2.decrypt(&encrypted).is_err());
    }

    #[test]
    fn decrypt_too_short_data_fails() {
        let encryptor = Encryptor::new(&Encryptor::generate_key());
        assert!(encryptor.decrypt(&[0u8; 5]).is_err());
    }

    #[test]
    fn each_encryption_produces_different_output() {
        let encryptor = Encryptor::new(&Encryptor::generate_key());
        let plaintext = b"same input";
        let a = encryptor.encrypt(plaintext).unwrap();
        let b = encryptor.encrypt(plaintext).unwrap();
        assert_ne!(a, b);
    }
}
