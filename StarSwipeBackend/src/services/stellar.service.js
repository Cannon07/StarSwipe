const StellarSdk = require('@stellar/stellar-sdk');
const { assembleTransaction } = require('@stellar/stellar-sdk/rpc');
const stellarConfig = require('../config/stellar');
const logger = require('../utils/logger');

const CONTRACT_ID = process.env.CONTRACT_ID || 'CDQI6IYM5TIEKLHAPOHJEJIGLQX2TMPGB3FJJCH7B4PFMAU6SRAVTJKZ';

class StellarService {
  constructor() {
    this.horizonServer = stellarConfig.getServer();
    this.rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
    this.masterKeypair = stellarConfig.getMasterKeypair();
    this.networkPassphrase = stellarConfig.getNetworkPassphrase();
    logger.info(`📡 Soroban RPC: ${this.rpcUrl}`);
  }

  async callSorobanRpc(method, params) {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      return data.result;
    } catch (error) {
      logger.error(`RPC call failed (${method}):`, error.message);
      throw error;
    }
  }

  /**
   * Create and fund a new Stellar account
   */
  async createAccount(newAccountPublicKey, startingBalance = '10') {
    try {
      logger.info(`   💰 Creating card account with ${startingBalance} XLM...`);
      
      // Load master account
      const masterAccount = await this.horizonServer.loadAccount(this.masterKeypair.publicKey());
      
      // Build transaction to create account
      const transaction = new StellarSdk.TransactionBuilder(masterAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.createAccount({
            destination: newAccountPublicKey,
            startingBalance: startingBalance
          })
        )
        .setTimeout(30)
        .build();
      
      // Sign and submit
      transaction.sign(this.masterKeypair);
      const result = await this.horizonServer.submitTransaction(transaction);
      
      logger.info(`   ✅ Card account created: ${newAccountPublicKey}`);
      return result.hash;
      
    } catch (error) {
      // Account might already exist
      if (error.response?.status === 400 && error.response?.data?.extras?.result_codes?.operations?.includes('op_already_exists')) {
        logger.info(`   ✅ Card account already exists`);
        return null;
      }
      throw error;
    }
  }

  async assembleAndSignTransaction(sourceAccount, operations, signerKeypair) {
    let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    });

    operations.forEach(op => tx.addOperation(op));
    tx = tx.setTimeout(30).build();

    logger.info('   ⏳ Simulating transaction...');
    const simulateResult = await this.callSorobanRpc('simulateTransaction', { 
      transaction: tx.toXDR() 
    });

    if (!simulateResult.results || simulateResult.results.length === 0) {
      throw new Error('Simulation returned no results');
    }

    logger.info('   ✅ Simulation successful');
    logger.info(`   Min resource fee: ${simulateResult.minResourceFee}`);
    
    logger.info('   🔧 Assembling transaction with auth...');
    const assembledTx = assembleTransaction(tx, simulateResult).build();
    logger.info('   ✅ Transaction assembled');
    
    assembledTx.sign(signerKeypair);
    logger.info('   ✅ Transaction signed');
    
    return { assembledTx, simulateResult };
  }

  async submitTransaction(tx) {
    logger.info('   ⏳ Submitting transaction...');
    const sendResult = await this.callSorobanRpc('sendTransaction', { 
      transaction: tx.toXDR() 
    });
    
    logger.info(`   ✅ Transaction submitted`);
    logger.info(`   Transaction hash: ${sendResult.hash}`);
    logger.info(`   Status: ${sendResult.status}`);

    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction error: ${JSON.stringify(sendResult)}`);
    }

    if (sendResult.status === 'PENDING') {
      logger.info('   ⏳ Waiting for confirmation...');
      const result = await this.pollTransactionStatus(sendResult.hash);
      return { 
        status: result.status, 
        hash: sendResult.hash 
      };
    }

    return { 
      status: sendResult.status, 
      hash: sendResult.hash 
    };
  }

  async pollTransactionStatus(txHash, maxAttempts = 15, delayMs = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const txResponse = await this.callSorobanRpc('getTransaction', { 
          hash: txHash 
        });
        
        logger.info(`   Polling attempt ${i + 1}/${maxAttempts}: ${txResponse.status}`);
        
        if (txResponse.status && txResponse.status !== 'NOT_FOUND') {
          if (txResponse.status === 'SUCCESS') {
            logger.info('✅ Transaction confirmed!');
            logger.info(`   View: https://stellar.expert/explorer/testnet/tx/${txHash}`);
          } else if (txResponse.status === 'FAILED') {
            logger.error(`   ❌ Transaction failed with status: ${txResponse.status}`);
          }
          return txResponse;
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        logger.warn(`   Polling error on attempt ${i + 1}: ${error.message}`);
      }
    }
    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Register card on blockchain
   * Now includes automatic card account creation
   */
  async registerCardOnChain(cardPublicKey, ownerAddress, cardId, dailyLimit) {
    try {
      logger.info(`📝 Registering card on blockchain...`);
      logger.info(`   Contract: ${CONTRACT_ID}`);
      logger.info(`   Card: ${cardPublicKey}`);
      logger.info(`   Owner: ${ownerAddress}`);
      logger.info(`   Card ID: ${cardId}`);
      logger.info(`   Daily Limit: ${dailyLimit} XLM`);

      // STEP 1: Create card account (if it doesn't exist)
      try {
        await this.createAccount(cardPublicKey, '10');  // Fund with 10 XLM
      } catch (error) {
        logger.warn(`   ⚠️  Could not create card account: ${error.message}`);
        // Continue anyway - account might already exist
      }

      // STEP 2: Register on contract
      const dailyLimitStroops = Math.floor(dailyLimit * 10_000_000);
      const sourceAccount = await this.horizonServer.loadAccount(this.masterKeypair.publicKey());
      logger.info(`   ✅ Source account loaded: ${this.masterKeypair.publicKey()}`);

      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const params = [
        new StellarSdk.Address(ownerAddress).toScVal(),
        StellarSdk.xdr.ScVal.scvString(cardId),
        new StellarSdk.Address(cardPublicKey).toScVal(),
        StellarSdk.nativeToScVal(dailyLimitStroops, { type: 'i128' })
      ];

      const { assembledTx } = await this.assembleAndSignTransaction(
        sourceAccount, 
        [contract.call('register_card', ...params)], 
        this.masterKeypair
      );
      
      const result = await this.submitTransaction(assembledTx);
      
      return {
        success: true,
        txHash: result.hash,
        status: result.status,
        onChain: true
      };

    } catch (error) {
      logger.error('❌ Failed to register card on blockchain:', error.message);
      logger.warn('⚠️  Falling back to mock registration');
      return { 
        success: true, 
        txHash: 'MOCK_TX_' + Date.now(), 
        mock: true,
        onChain: false, 
        error: error.message 
      };
    }
  }

  /**
   * Process payment transaction
   */
  async processTransaction(cardKeypair, cardId, amount, merchantAddress, merchantId) {
    try {
      logger.info(`💳 Processing transaction on blockchain...`);
      logger.info(`   Card: ${cardKeypair.publicKey()}`);
      logger.info(`   Amount: ${amount} XLM`);
      logger.info(`   Merchant: ${merchantAddress}`);

      const amountStroops = Math.floor(parseFloat(amount) * 10_000_000);

      // Load card account
      const cardAccount = await this.horizonServer.loadAccount(cardKeypair.publicKey());
      logger.info(`   ✅ Card account loaded`);

      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const params = [
        new StellarSdk.Address(cardKeypair.publicKey()).toScVal(),
        StellarSdk.xdr.ScVal.scvString(cardId),
        StellarSdk.nativeToScVal(amountStroops, { type: 'i128' }),
        new StellarSdk.Address(merchantAddress).toScVal(),
        StellarSdk.xdr.ScVal.scvString(merchantId)
      ];

      const { assembledTx } = await this.assembleAndSignTransaction(
        cardAccount, 
        [contract.call('process_transaction', ...params)], 
        cardKeypair
      );
      
      const result = await this.submitTransaction(assembledTx);
      
      return {
        success: true,
        hash: result.hash,
        status: result.status,
        onChain: true
      };

    } catch (error) {
      logger.error('❌ Process transaction error:', error.message);
      logger.warn('⚠️  Falling back to mock transaction');
      return { 
        success: true, 
        hash: 'TX_MOCK_' + Date.now(), 
        mock: true,
        onChain: false, 
        error: error.message 
      };
    }
  }

  async getBalance(publicKey) {
    return await stellarConfig.getAccountBalance(publicKey);
  }

  async accountExists(publicKey) {
    return await stellarConfig.accountExists(publicKey);
  }
}

module.exports = new StellarService();
