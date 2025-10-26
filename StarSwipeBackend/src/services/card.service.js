
const db = require("../config/database");
const shamirService = require("./shamir.service");
const stellarService = require("./stellar.service"); // Use SDK service, not CLI
const logger = require("../utils/logger");

class CardService {
  /**
   * Register a new card with SSS key splitting and blockchain registration
   */
  async registerCard(userId, cardId, pin, dailyLimit = 1000) {
    try {
      logger.info(`🎴 Registering new card: ${cardId}`);

      // Step 1: Generate SSS shares and Stellar keypair
      logger.info("   Step 1: Generating SSS shares...");
      const sssResult = await shamirService.generateAndSplitKey(pin);

      // Step 2: Get user's wallet address
      const userQuery = await db.query(
        "SELECT wallet_address FROM users WHERE id = $1",
        [userId],
      );

      if (userQuery.rows.length === 0) {
        throw new Error("User not found");
      }

      const ownerAddress = userQuery.rows[0].wallet_address;

      // Step 3: Register on blockchain using SDK (not CLI)
      logger.info("   Step 2: Registering on blockchain via SDK...");
      const blockchainResult = await stellarService.registerCardOnChain(
        sssResult.cardPublicKey,
        ownerAddress,
        cardId,
        dailyLimit,
      );

      // Step 4: Store in database
      logger.info("   Step 3: Storing in database...");
      const insertQuery = `
        INSERT INTO cards (
          card_id, user_id, card_public_key,
          share1_encrypted, share1_iv, share1_auth_tag, share1_hash,
          share3_salt, share3_encrypted, share3_length,
          daily_limit, blockchain_tx_hash, account_created
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, card_id, card_public_key, created_at
      `;

      const result = await db.query(insertQuery, [
        cardId,
        userId,
        sssResult.cardPublicKey,
        sssResult.share1Encrypted,
        sssResult.share1Iv,
        sssResult.share1AuthTag,
        sssResult.share1Hash,
        sssResult.share3Salt,
        sssResult.share3Encrypted,
        sssResult.share3Length, // Store this for reconstruction
        dailyLimit.toString(),
        blockchainResult.txHash,
        blockchainResult.onChain || false,
      ]);

      logger.info("✅ Card registered successfully!");

      // ✅ Minimal changes — add compact fields to return payload
      return {
        success: true,
        card: result.rows[0],
        cardPublicKey: sssResult.cardPublicKey,
        cardPublicKeyCompact: sssResult.cardPublicKeyCompact, // added
        share2: sssResult.share2, // (legacy field)
        share2Compact: sssResult.share2Compact, // added
        txHash: blockchainResult.txHash,
        onChain: blockchainResult.onChain || false,
        mock: blockchainResult.mock || false,
      };
    } catch (error) {
      logger.error("❌ Card registration failed:", error);
      throw error;
    }
  }

  /**
   * Get card details with owner information
   */
  async getCard(cardId) {
    try {
      const query = `
        SELECT c.*, u.wallet_address as owner_address
        FROM cards c
        JOIN users u ON c.user_id = u.id
        WHERE c.card_id = $1
      `;
      const result = await db.query(query, [cardId]);

      if (result.rows.length === 0) {
        throw new Error("Card not found");
      }

      return result.rows[0];
    } catch (error) {
      logger.error("❌ Failed to get card:", error);
      throw error;
    }
  }

  /**
   * Process a transaction using the card
   */
  async processCardTransaction(
    cardId,
    share2Hex,
    pin,
    amount,
    merchantAddress,
    merchantId,
  ) {
    try {
      logger.info(`💳 Processing card transaction: ${cardId}`);

      // 1. Get card data from database
      const card = await this.getCard(cardId);

      // 2. Reconstruct private key from shares
      logger.info("   🔓 Reconstructing private key...");
      const privateKey = await shamirService.reconstructKey(
        {
          encrypted: card.share1_encrypted,
          iv: card.share1_iv,
          authTag: card.share1_auth_tag,
        },
        share2Hex,
        pin,
        card.share3_salt,
        card.share3_encrypted,
        card.share3_length,
      );

      // 3. Create keypair from reconstructed key
      const StellarSdk = require("@stellar/stellar-sdk");
      const cardKeypair = StellarSdk.Keypair.fromRawEd25519Seed(privateKey);

      logger.error(`
        =========================================================
        !!! DANGER: TEMPORARY DEBUG SECRET KEY LOGGED !!!
        The Secret Key for card ${cardId} is: ${cardKeypair.secret()}
        =========================================================
      `);

      // 4. Verify it matches the card's public key
      if (!shamirService.verifyKey(privateKey, card.card_public_key)) {
        throw new Error("Reconstructed key does not match card public key");
      }

      logger.info("   ✅ Key verified");

      // 5. Process transaction on blockchain
      logger.info("   💸 Sending transaction to blockchain...");
      const txResult = await stellarService.processTransaction(
        cardKeypair,
        cardId,
        amount,
        merchantAddress,
        merchantId,
      );

      // 6. Clean up sensitive data
      privateKey.fill(0);

      return txResult;
    } catch (error) {
      logger.error("❌ Transaction processing failed:", error);
      throw error;
    }
  }
}

module.exports = new CardService();

