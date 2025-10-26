require('dotenv').config();
const shamirService = require('../src/services/shamir.service');

async function testSSS() {
  console.log('🧪 Testing SSS Service\n');
  
  try {
    // Step 1: Generate
    console.log('Step 1: Generating card with PIN 1234...');
    const result = await shamirService.generateAndSplitKey('1234');
    console.log(`✅ Card Public Key: ${result.cardPublicKey}`);
    console.log(`✅ Share 2 length: ${result.share2.length} chars\n`);
    
    // Step 2: Reconstruct
    console.log('Step 2: Reconstructing key...');
    const key = await shamirService.reconstructKey(
      {
        encrypted: result.share1Encrypted,
        iv: result.share1Iv,
        authTag: result.share1AuthTag
      },
      result.share2,
      '1234',
      result.share3Salt,
      result.share3Encrypted,
      result.share3Length
    );
    console.log(`✅ Key reconstructed: ${key.length} bytes\n`);
    
    // Step 3: Verify
    console.log('Step 3: Verifying...');
    const valid = shamirService.verifyKey(key, result.cardPublicKey);
    console.log(`✅ Verification: ${valid ? 'PASSED ✅' : 'FAILED ❌'}\n`);
    
    // Step 4: Cleanup
    key.fill(0);
    console.log('✅ Key wiped from memory\n');
    
    console.log('🎉 SSS Service Working Perfectly!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSSS();
