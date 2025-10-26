
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const StellarSdk = require('@stellar/stellar-sdk');
const cardService = require('../services/card.service');
const stellarService = require('../services/stellar.service');
const shamirService = require('../services/shamir.service');
const logger = require('../utils/logger');

/**
 * POST /api/v1/cards/register
 * Direct registration (old workflow, optional)
 */
router.post('/register', async (req, res) => {
  try {
    const { userId, cardId, pin, dailyLimit } = req.body;
    if (!userId || !cardId || !pin) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const result = await cardService.registerCard(userId, cardId, pin, dailyLimit || 1000);

    res.status(201).json({
      success: true,
      message: 'Card registered successfully',
      card: {
        cardId: result.card.card_id,
        cardPublicKey: result.cardPublicKey,
        dailyLimit: dailyLimit || 1000,
        createdAt: result.card.created_at
      },
      share2: result.share2,
      txHash: result.txHash
    });
    logger.info(`✅ Card registered via API: ${cardId}`);
  } catch (error) {
    logger.error('❌ Card registration error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to register card' });
  }
});

/**
 * POST /api/v1/cards/prepare-registration
 * Step 1 - Prepare unsigned registration transaction
 */
router.post('/prepare-registration', async (req, res) => {
  try {
    const { userId, cardId, pin, dailyLimit } = req.body;
    if (!userId || !cardId || !pin) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const sssResult = await shamirService.generateAndSplitKey(pin);
    const userQuery = await db.query('SELECT wallet_address FROM users WHERE id = $1', [userId]);
    if (userQuery.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    const ownerAddress = userQuery.rows[0].wallet_address;

    // Create account if needed
    await stellarService.createAccount(sssResult.cardPublicKey, '10');

    // Prepare transaction (example with Soroban RPC)
    const dailyLimitStroops = Math.floor((dailyLimit || 1000) * 10_000_000);
    const horizonServer = stellarService.horizonServer;
    const ownerAccount = await horizonServer.loadAccount(ownerAddress);

    const contract = new StellarSdk.Contract(process.env.CONTRACT_ID);
    const params = [
      new StellarSdk.Address(ownerAddress).toScVal(),
      StellarSdk.xdr.ScVal.scvString(cardId),
      new StellarSdk.Address(sssResult.cardPublicKey).toScVal(),
      StellarSdk.nativeToScVal(dailyLimitStroops, { type: 'i128' })
    ];

    let transaction = new StellarSdk.TransactionBuilder(ownerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: stellarService.networkPassphrase
    })
      .addOperation(contract.call('register_card', ...params))
      .setTimeout(30)
      .build();

    const simulateResult = await stellarService.callSorobanRpc('simulateTransaction', { transaction: transaction.toXDR() });
    if (!simulateResult.results || simulateResult.results.length === 0) throw new Error('Simulation failed');

    const { assembleTransaction } = require('@stellar/stellar-sdk/rpc');
    const assembledTx = assembleTransaction(transaction, simulateResult);
    transaction = assembledTx.build();

    await db.query(
      `INSERT INTO cards (
        card_id, user_id, card_public_key,
        share1_encrypted, share1_iv, share1_auth_tag, share1_hash,
        share3_salt, share3_encrypted, share3_length,
        daily_limit, account_created, registration_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        cardId, userId, sssResult.cardPublicKey,
        sssResult.share1Encrypted, sssResult.share1Iv, sssResult.share1AuthTag, sssResult.share1Hash,
        sssResult.share3Salt, sssResult.share3Encrypted, sssResult.share3Length,
        (dailyLimit || 1000).toString(), true, 'PENDING_SIGNATURE'
      ]
    );

    res.json({
      success: true,
      message: 'Transaction prepared. Please sign with your wallet.',
      unsignedTxXDR: transaction.toXDR(),
      cardPublicKey: sssResult.cardPublicKey,
      share2: sssResult.share2,
      cardId
    });
  } catch (error) {
    logger.error('❌ Failed to prepare registration:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to prepare registration' });
  }
});

/**
 * POST /api/v1/cards/submit-registration
 * Step 2 - Submit signed transaction
 */
router.post('/submit-registration', async (req, res) => {
  try {
    const { signedTxXDR, cardId } = req.body;
    if (!signedTxXDR || !cardId) return res.status(400).json({ success: false, error: 'Missing signed transaction or card ID' });

    logger.info(`📤 Submitting signed card registration: ${cardId}`);
    const rpcParams = { transaction: signedTxXDR };
    const sendResult = await stellarService.callSorobanRpc('sendTransaction', rpcParams);

    if (sendResult.status === 'ERROR') throw new Error('Transaction rejected by network');

    const txResult = await stellarService.pollTransactionStatus(sendResult.hash);
    if (txResult.status !== 'SUCCESS') throw new Error(`Transaction failed: ${txResult.status}`);

    await db.query(
      `UPDATE cards SET blockchain_tx_hash=$1, registration_status=$2, updated_at=NOW() WHERE card_id=$3`,
      [sendResult.hash, 'CONFIRMED', cardId]
    );

    logger.info(`✅ Card registration confirmed: ${cardId}`);
    res.json({ success: true, message: 'Card registered successfully on blockchain', txHash: sendResult.hash });
  } catch (error) {
    logger.error('❌ Failed to submit registration:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit registration' });
  }
});

/**
 * GET /api/v1/cards/:cardId
 * Fetch card details
 */
router.get('/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await cardService.getCard(cardId);
    res.json({
      success: true,
      card: {
        cardId: card.card_id,
        cardPublicKey: card.card_public_key,
        ownerAddress: card.owner_address,
        dailyLimit: card.daily_limit,
        dailySpent: card.daily_spent,
        isActive: card.is_active,
        isLocked: card.is_locked,
        createdAt: card.created_at,
        lastUsedAt: card.last_used_at,
        registrationStatus: card.registration_status
      }
    });
  } catch (error) {
    logger.error('❌ Get card error:', error);
    res.status(error.message === 'Card not found' ? 404 : 500).json({ success: false, error: error.message || 'Failed to get card' });
  }
});

/**
 * POST /api/v1/cards/:cardId/status
 * Freeze/unfreeze card
 */
router.post('/:cardId/status', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { isActive, reason } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ success: false, error: 'isActive must be a boolean' });

    await db.query(
      'UPDATE cards SET is_active=$1, locked_reason=$2, updated_at=NOW() WHERE card_id=$3',
      [isActive, reason || null, cardId]
    );

    logger.info(`✅ Card status updated: ${cardId} -> ${isActive ? 'active' : 'frozen'}`);
    res.json({ success: true, message: `Card ${isActive ? 'activated' : 'frozen'} successfully` });
  } catch (error) {
    logger.error('❌ Update card status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update card status' });
  }
});

/**
 * POST /api/v1/cards/prepare-topup
 * Prepare top-up transaction
 */
router.post('/prepare-topup', async (req, res) => {
  try {
    const { cardId, cardAddress, ownerAddress, amount } = req.body;
    if (!cardId || !cardAddress || !ownerAddress || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const ownerAccount = await stellarService.horizonServer.loadAccount(ownerAddress);
    const transaction = new StellarSdk.TransactionBuilder(ownerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: stellarService.networkPassphrase
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: cardAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString()
      }))
      .setTimeout(30)
      .build();

    res.json({ success: true, unsignedTxXDR: transaction.toXDR() });
    logger.info(`✅ Top-up transaction prepared: ${amount} to ${cardId}`);
  } catch (error) {
    logger.error('❌ Failed to prepare top-up:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/cards/submit-topup
 * Submit signed top-up transaction
 */
router.post('/submit-topup', async (req, res) => {
  try {
    const { signedTxXDR, cardId } = req.body;
    if (!signedTxXDR || !cardId) return res.status(400).json({ success: false, error: 'Missing required fields' });

    const transaction = StellarSdk.TransactionBuilder.fromXDR(signedTxXDR, stellarService.networkPassphrase);
    const result = await stellarService.horizonServer.submitTransaction(transaction);

    logger.info(`✅ Top-up successful: ${result.hash}`);
    res.json({ success: true, message: 'Top-up successful', txHash: result.hash });
  } catch (error) {
    logger.error('❌ Failed to submit top-up:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

