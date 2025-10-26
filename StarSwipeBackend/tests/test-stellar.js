require('dotenv').config();
const stellarConfig = require('../src/config/stellar');
const StellarSdk = require('@stellar/stellar-sdk');

async function testStellar() {
  console.log('🧪 Testing Stellar connection...\n');
  
  try {
    const server = stellarConfig.getServer();
    const masterKeypair = stellarConfig.getMasterKeypair();
    
    // Test 1: Server connectivity
    console.log('Test 1: Server connection');
    const ledgers = await server.ledgers().limit(1).order('desc').call();
    console.log(`✅ Connected to Horizon (Latest ledger: ${ledgers.records[0].sequence})`);
    
    // Test 2: Master account
    console.log('\nTest 2: Master account');
    const masterAccount = await server.loadAccount(masterKeypair.publicKey());
    console.log(`✅ Master account loaded: ${masterKeypair.publicKey()}`);
    
    // Test 3: Check master account balance
    console.log('\nTest 3: Master account balance');
    const nativeBalance = masterAccount.balances.find(b => b.asset_type === 'native');
    console.log(`✅ Balance: ${nativeBalance.balance} XLM`);
    
    if (parseFloat(nativeBalance.balance) < 10) {
      console.warn('⚠️  Warning: Master account balance is low. Consider funding it.');
    }
    
    // Test 4: Network configuration
    console.log('\nTest 4: Network configuration');
    console.log(`✅ Network passphrase: ${stellarConfig.getNetworkPassphrase()}`);
    console.log(`✅ Server URL: ${server.serverURL.href}`);
    
    // Test 5: Asset configuration
    console.log('\nTest 5: Asset configuration');
    const asset = stellarConfig.getAsset();
    if (asset.isNative()) {
      console.log('✅ Using native XLM asset');
    } else {
      console.log(`✅ Using custom asset: ${asset.code} (${asset.issuer})`);
    }
    
    console.log('\n✅ All Stellar tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Stellar test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testStellar();
