#!/usr/bin/env node

/**
 * Generate and Fund Stellar Testnet Account
 * This script creates a new Stellar keypair and funds it using Friendbot
 */

const StellarSdk = require('@stellar/stellar-sdk');
const https = require('https');

console.log('🚀 Generating Stellar Testnet Account\n');
console.log('='.repeat(60));

// Generate new keypair
const pair = StellarSdk.Keypair.random();
const publicKey = pair.publicKey();
const secretKey = pair.secret();

console.log('\n✅ New Stellar Keypair Generated:');
console.log('\nPublic Key (Address):');
console.log(publicKey);
console.log('\nSecret Key (KEEP THIS SAFE!):');
console.log(secretKey);

console.log('\n' + '='.repeat(60));
console.log('\n🌟 Funding account via Friendbot...');

// Fund account using Friendbot
const friendbotUrl = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;

https.get(friendbotUrl, (resp) => {
  let data = '';
  
  resp.on('data', (chunk) => {
    data += chunk;
  });
  
  resp.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.successful !== false) {
        console.log('✅ Account funded successfully!');
        console.log(`   Balance: 10,000 XLM (testnet)`);
        console.log(`   Transaction: ${result.hash || 'completed'}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('\n📝 Add these to your .env file:\n');
        console.log(`MASTER_PUBLIC_KEY=${publicKey}`);
        console.log(`MASTER_SECRET_KEY=${secretKey}`);
        console.log('\n' + '='.repeat(60));
        
        console.log('\n✅ Setup Complete!');
        console.log('\nNext steps:');
        console.log('1. Copy the keys above to your .env file');
        console.log('2. Run: npm run test:stellar');
        console.log('3. All tests should pass! 🎉\n');
      } else {
        console.error('❌ Friendbot funding failed:', result);
        console.log('\n💡 You can fund manually at:');
        console.log(`   https://laboratory.stellar.org/#account-creator?network=test`);
        console.log('\n📝 Still add these to your .env file:\n');
        console.log(`MASTER_PUBLIC_KEY=${publicKey}`);
        console.log(`MASTER_SECRET_KEY=${secretKey}`);
      }
    } catch (error) {
      console.error('❌ Error parsing Friendbot response');
      console.log('\n📝 Add these to your .env file:\n');
      console.log(`MASTER_PUBLIC_KEY=${publicKey}`);
      console.log(`MASTER_SECRET_KEY=${secretKey}`);
      console.log('\n💡 Fund manually at:');
      console.log(`   https://friendbot.stellar.org/?addr=${publicKey}`);
    }
  });
}).on('error', (err) => {
  console.error('❌ Error contacting Friendbot:', err.message);
  console.log('\n📝 Add these to your .env file:\n');
  console.log(`MASTER_PUBLIC_KEY=${publicKey}`);
  console.log(`MASTER_SECRET_KEY=${secretKey}`);
  console.log('\n💡 Fund manually by visiting:');
  console.log(`   https://friendbot.stellar.org/?addr=${publicKey}`);
  console.log('\n   Or use Stellar Laboratory:');
  console.log(`   https://laboratory.stellar.org/#account-creator?network=test`);
});
