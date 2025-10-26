const shamir = require('shamirs-secret-sharing');
const crypto = require('crypto');
const zlib = require('zlib');
const StellarSdk = require('@stellar/stellar-sdk');
const { encrypt, decrypt, hash, generateSalt, deriveKeyFromPIN } = require('../utils/encryption');
const logger = require('../utils/logger');

class ShamirService {
  /**
   * Generate Stellar keypair and split using SSS
   * @param {string} pin - 4-digit PIN from user
   * @returns {Object} - SSS shares and Stellar public key
   */
  async generateAndSplitKey(pin) {
    try {
      logger.info('🔐 Generating SSS shares...');

      // 1. Generate random Stellar keypair
      const keypair = StellarSdk.Keypair.random();

      // 2. Extract raw 32-byte secret seed
      const privateKey = keypair.rawSecretKey();

      // 3. Get Stellar public key (G... format)
      const cardPublicKey = keypair.publicKey();
      logger.info(`✅ Card address (Stellar): ${cardPublicKey}`);

      // 4. Split private key into 3 shares (threshold: 2)
      const shares = shamir.split(Buffer.from(privateKey), {
        shares: parseInt(process.env.SSS_TOTAL_SHARES) || 3,
        threshold: parseInt(process.env.SSS_THRESHOLD) || 2,
      });

      const [share1, share2, share3] = shares;
      logger.info(`✅ Split into ${shares.length} shares (threshold: 2)`);

      // 5. Encrypt Share 1 for database storage (AES-256-GCM)
      const share1Encrypted = encrypt(share1.toString('hex'));
      const share1Hash = hash(share1.toString('hex'));
      logger.info('✅ Share 1 encrypted for database');

      // 6. Compress Share 2 before sending to user device
      const share2Compressed = zlib.deflateSync(share2);
      const share2Hex = share2Compressed.toString('hex');
      logger.info(
        `✅ Share 2 compressed: ${share2.length} → ${share2Compressed.length} bytes (${share2Hex.length} hex chars)`
      );

      // 7. Encrypt Share 3 with PIN
      const salt = generateSalt(16);
      const pinKey = deriveKeyFromPIN(pin.toString(), salt, share3.length);

      // XOR Share 3 with PIN-derived key
      const share3Encrypted = Buffer.alloc(share3.length);
      for (let i = 0; i < share3.length; i++) {
        share3Encrypted[i] = share3[i] ^ pinKey[i];
      }
      logger.info('✅ Share 3 encrypted with PIN');

      // CRITICAL: Clean up sensitive data from memory
      privateKey.fill(0);
      share1.fill(0);
      share2.fill(0);
      share3.fill(0);
      pinKey.fill(0);
      logger.info('✅ Sensitive data cleared from memory');

      return {
        cardPublicKey,
        share1Encrypted: share1Encrypted.encrypted,
        share1Iv: share1Encrypted.iv,
        share1AuthTag: share1Encrypted.authTag,
        share1Hash,
        share2: share2Hex, // Compressed hex
        share3Salt: salt,
        share3Encrypted: share3Encrypted.toString('hex'),
        share3Length: share3.length,
      };
    } catch (error) {
      logger.error('❌ SSS generation error:', error);
      throw new Error('Failed to generate SSS shares');
    }
  }

  /**
   * Reconstruct Stellar private key from 3 shares
   */
  async reconstructKey(share1Data, share2Hex, pin, share3Salt, share3Encrypted, share3Length) {
    try {
      logger.info('🔓 Reconstructing private key from shares...');

      // 1. Decrypt Share 1
      const share1Decrypted = decrypt(
        share1Data.encrypted,
        share1Data.iv,
        share1Data.authTag
      );
      const share1 = Buffer.from(share1Decrypted, 'hex');
      logger.info(`✅ Share 1 decrypted (${share1.length} bytes)`);

      // 2. Decompress Share 2
      const share2Compressed = Buffer.from(share2Hex, 'hex');
      const share2 = zlib.inflateSync(share2Compressed);
      logger.info(`✅ Share 2 decompressed: ${share2Compressed.length} → ${share2.length} bytes`);

      // 3. Derive Share 3 from PIN
      const share3EncryptedBuf = Buffer.from(share3Encrypted, 'hex');
      const keyLength = share3Length || share3EncryptedBuf.length;
      const pinKey = deriveKeyFromPIN(pin.toString(), share3Salt, keyLength);

      // XOR to decrypt
      const share3 = Buffer.alloc(share3EncryptedBuf.length);
      for (let i = 0; i < share3EncryptedBuf.length; i++) {
        share3[i] = share3EncryptedBuf[i] ^ pinKey[i];
      }
      logger.info(`✅ Share 3 derived from PIN (${share3.length} bytes)`);

      // 4. Reconstruct using combine
      const reconstructed = shamir.combine([share1, share2, share3]);
      const privateKey = Buffer.from(reconstructed);
      logger.info(`✅ Private key reconstructed (${privateKey.length} bytes)`);

      // Validate it's 32 bytes
      if (privateKey.length !== 32) {
        throw new Error(`Invalid reconstructed key length: ${privateKey.length}`);
      }

      // Clean up shares from memory
      share1.fill(0);
      share2.fill(0);
      share3.fill(0);
      pinKey.fill(0);

      return privateKey;
    } catch (error) {
      logger.error('❌ Key reconstruction error:', error);
      throw new Error('Failed to reconstruct key - invalid PIN or corrupted shares');
    }
  }

  /**
   * Verify reconstructed key matches expected Stellar address
   */
  verifyKey(privateKeyBuffer, expectedAddress) {
    try {
      const keypair = StellarSdk.Keypair.fromRawEd25519Seed(Buffer.from(privateKeyBuffer));
      return keypair.publicKey() === expectedAddress;
    } catch (error) {
      logger.error('Key verification failed:', error);
      return false;
    }
  }
}

module.exports = new ShamirService();

