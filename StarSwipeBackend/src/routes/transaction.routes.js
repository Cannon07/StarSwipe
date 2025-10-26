const express = require('express');
const router = express.Router();
const db = require('../config/database');
const StellarSdk = require('@stellar/stellar-sdk');
const shamirService = require('../services/shamir.service');
const stellarService = require('../services/stellar.service');
const cardService = require('../services/card.service');
const logger = require('../utils/logger');

/**
 * POST /api/v1/transactions/process
 * Process a payment transaction using NFC card
 */
router.post('/process', async (req, res) => {
  let privateKey = null;
  
  try {
    const { 
      cardId,
      share2,
      pin,
      amount,
      merchantAddress,
      merchantName,
      merchantId
    } = req.body;

    // Validation
    if (!cardId || !share2 || !pin || !amount || !merchantAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    logger.info(`💳 Processing payment: ${amount} XLM from ${cardId}`);

    // Step 1: Get card from database
    const card = await cardService.getCard(cardId);

    // Step 2: Check if card is active
    if (!card.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Card is frozen or inactive'
      });
    }

    // Step 3: Check daily limit
    const currentSpent = parseFloat(card.daily_spent) || 0;
    const dailyLimit = parseFloat(card.daily_limit);
    const requestedAmount = parseFloat(amount);

    if (currentSpent + requestedAmount > dailyLimit) {
      return res.status(403).json({
        success: false,
        error: `Daily limit exceeded. Spent: ${currentSpent}/${dailyLimit} XLM`
      });
    }

    // Step 4: Reconstruct private key from 3 shares
    logger.info('   🔓 Reconstructing private key...');
    privateKey = await shamirService.reconstructKey(
      {
        encrypted: card.share1_encrypted,
        iv: card.share1_iv,
        authTag: card.share1_auth_tag
      },
      share2,
      pin,
      card.share3_salt,
      card.share3_encrypted,
      card.share3_length  // Use the stored length
    );

    // Step 5: Verify key matches card
    const isValid = shamirService.verifyKey(privateKey, card.card_public_key);
    if (!isValid) {
      privateKey.fill(0);
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN or corrupted shares'
      });
    }

    logger.info('   ✅ Key verified successfully');

    // Step 6: Create Stellar keypair from reconstructed key
    const cardKeypair = StellarSdk.Keypair.fromRawEd25519Seed(privateKey);

    // Step 7: Process transaction on blockchain using stellarService
    logger.info('   📤 Submitting to blockchain...');
    const txResult = await stellarService.processTransaction(
      cardKeypair,
      cardId,
      amount,
      merchantAddress,
      merchantId || 'MERCHANT_' + Date.now()
    );

    // Step 8: CRITICAL - Wipe private key from memory immediately
    privateKey.fill(0);
    privateKey = null;
    logger.info('   ✅ Private key wiped from memory');

    // Check if transaction succeeded
    if (!txResult.hash) {
      throw new Error('Transaction failed on blockchain');
    }

    // Step 9: Update daily spent
    await db.query(
      `UPDATE cards 
       SET daily_spent = daily_spent::numeric + $1,
           last_used_at = NOW(),
           updated_at = NOW()
       WHERE card_id = $2`,
      [amount, cardId]
    );

    // Step 10: Record transaction
    await db.query(
      `INSERT INTO transactions (
        tx_hash, card_id, amount, destination_address,
        merchant_name, merchant_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        txResult.hash, 
        cardId, 
        amount, 
        merchantAddress, 
        merchantName || 'Unknown Merchant', 
        merchantId || 'MERCHANT_' + Date.now(), 
        txResult.status === 'SUCCESS' ? 'confirmed' : 'pending'
      ]
    );

    logger.info(`✅ Payment processed: ${amount} XLM`);

    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction: {
        txHash: txResult.hash,
        amount,
        merchantAddress,
        merchantName,
        timestamp: new Date().toISOString(),
        onChain: true,
        status: txResult.status
      }
    });

  } catch (error) {
    // Ensure private key is wiped even on error
    if (privateKey) {
      privateKey.fill(0);
      logger.info('   ✅ Private key wiped (error handler)');
    }
    
    logger.error('❌ Transaction processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process transaction'
    });
  }
});

/**
 * GET /api/v1/transactions/card/:cardId
 * Get transaction history for a card
 */
router.get('/card/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT 
        tx_hash, amount, destination_address, merchant_name,
        status, created_at, confirmed_at
       FROM transactions
       WHERE card_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [cardId, limit, offset]
    );

    res.json({
      success: true,
      transactions: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('❌ Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
});

/**
 * GET /api/v1/transactions/:txHash
 * Get single transaction details
 */
router.get('/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    const result = await db.query(
      `SELECT * FROM transactions WHERE tx_hash = $1`,
      [txHash]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction: result.rows[0]
    });

  } catch (error) {
    logger.error('❌ Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction'
    });
  }
});

module.exports = router;
