const StellarSdk = require('@stellar/stellar-sdk');
const logger = require('../utils/logger');

class StellarConfig {
  constructor() {
    logger.info('🔗 Initializing Stellar connection...');
    
    // Set network
    const network = process.env.STELLAR_NETWORK || 'testnet';
    
    if (network === 'testnet') {
      StellarSdk.Networks.TESTNET;
      this.server = new StellarSdk.Horizon.Server(
        process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
      );
      this.networkPassphrase = StellarSdk.Networks.TESTNET;
    } else if (network === 'public') {
      StellarSdk.Networks.PUBLIC;
      this.server = new StellarSdk.Horizon.Server(
        process.env.STELLAR_HORIZON_URL || 'https://horizon.stellar.org'
      );
      this.networkPassphrase = StellarSdk.Networks.PUBLIC;
    } else {
      throw new Error(`Unknown network: ${network}`);
    }
    
    // Master keypair (backend service account)
    try {
      this.masterKeypair = StellarSdk.Keypair.fromSecret(process.env.MASTER_SECRET_KEY);
      logger.info('✅ Master keypair loaded');
    } catch (error) {
      logger.error('❌ Failed to load master keypair:', error.message);
      throw new Error('Invalid MASTER_SECRET_KEY in .env');
    }
    
    // Asset configuration
    this.assetCode = process.env.ASSET_CODE || 'XLM';
    this.assetIssuer = process.env.ASSET_ISSUER || 'native';
    
    if (this.assetCode === 'XLM' || this.assetIssuer === 'native') {
      this.asset = StellarSdk.Asset.native();
    } else {
      this.asset = new StellarSdk.Asset(this.assetCode, this.assetIssuer);
    }
    
    logger.info('✅ Stellar config initialized');
    logger.info(`   Network: ${network}`);
    logger.info(`   Horizon: ${this.server.serverURL}`);
    logger.info(`   Master Account: ${this.masterKeypair.publicKey()}`);
    logger.info(`   Asset: ${this.assetCode}`);
  }
  
  getServer() {
    return this.server;
  }
  
  getMasterKeypair() {
    return this.masterKeypair;
  }
  
  getNetworkPassphrase() {
    return this.networkPassphrase;
  }
  
  getAsset() {
    return this.asset;
  }
  
  // Helper: Check if account exists
  async accountExists(publicKey) {
    try {
      await this.server.loadAccount(publicKey);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false;
      }
      throw error;
    }
  }
  
  // Helper: Get account balance
  async getAccountBalance(publicKey, assetCode = 'native') {
    try {
      const account = await this.server.loadAccount(publicKey);
      const balance = account.balances.find(b => 
        assetCode === 'native' 
          ? b.asset_type === 'native'
          : b.asset_code === assetCode
      );
      return balance ? balance.balance : '0';
    } catch (error) {
      logger.error(`Error fetching balance for ${publicKey}:`, error.message);
      return '0';
    }
  }
}

module.exports = new StellarConfig();
