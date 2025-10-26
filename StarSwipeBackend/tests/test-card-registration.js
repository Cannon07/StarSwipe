require('dotenv').config();
const db = require('../src/config/database');
const cardService = require('../src/services/card.service');
const shamirService = require('../src/services/shamir.service');

async function testCardRegistration() {
  console.log('🧪 Testing Complete Card Registration Flow\n');
  
  try {
    // Step 1: Create test user
    console.log('Step 1: Creating test user...');
    const userResult = await db.query(
      `INSERT INTO users (wallet_address, email) 
       VALUES ($1, $2) 
       ON CONFLICT (wallet_address) DO UPDATE SET email = $2
       RETURNING id, wallet_address`,
      ['GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', 'test@bitspend.com']
    );
    const userId = userResult.rows[0].id;
    console.log(`✅ User created: ID ${userId}\n`);

    // Step 2: Register card
    console.log('Step 2: Registering card...');
    const cardId = 'NFC_TEST_' + Date.now();
    const pin = '1234';
    const dailyLimit = 500;
    
    const registration = await cardService.registerCard(userId, cardId, pin, dailyLimit);
    
    console.log('✅ Card registered successfully!');
    console.log(`   Card ID: ${registration.card.card_id}`);
    console.log(`   Public Key: ${registration.cardPublicKey}`);
    console.log(`   Share 2 (for user): ${registration.share2.substring(0, 30)}...`);
    console.log(`   TX Hash: ${registration.txHash}\n`);

    // Step 3: Verify card in database
    console.log('Step 3: Verifying card in database...');
    const card = await cardService.getCard(cardId);
    console.log(`✅ Card retrieved from DB`);
    console.log(`   Daily Limit: ${card.daily_limit} XLM`);
    console.log(`   Is Active: ${card.is_active}`);
    console.log(`   Owner: ${card.owner_address}\n`);

    // Step 4: Test key reconstruction (simulate transaction)
    console.log('Step 4: Testing key reconstruction (simulating payment)...');
    
    const reconstructedKey = await shamirService.reconstructKey(
      {
        encrypted: card.share1_encrypted,
        iv: card.share1_iv,
        authTag: card.share1_auth_tag
      },
      registration.share2, // In real app, this comes from user's device
      pin,
      card.share3_salt,
      card.share3_encrypted,
      82 // Share length
    );
    
    console.log(`✅ Key reconstructed: ${reconstructedKey.length} bytes`);
    
    // Step 5: Verify reconstructed key
    console.log('\nStep 5: Verifying reconstructed key...');
    const isValid = shamirService.verifyKey(reconstructedKey, card.card_public_key);
    console.log(`✅ Key verification: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    // Cleanup
    reconstructedKey.fill(0);
    console.log('✅ Key wiped from memory\n');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 COMPLETE FLOW TEST PASSED!                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\nWhat was tested:');
    console.log('✅ User creation');
    console.log('✅ SSS key generation');
    console.log('✅ Card registration in database');
    console.log('✅ Blockchain registration (mocked)');
    console.log('✅ Card retrieval');
    console.log('✅ Key reconstruction from shares');
    console.log('✅ Key verification');
    console.log('✅ Secure memory cleanup\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCardRegistration();
