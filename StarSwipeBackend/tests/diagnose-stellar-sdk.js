require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

console.log('🔍 Stellar SDK Diagnostic\n');
console.log('='.repeat(60));

// 1. Check SDK version
console.log('\n📦 Stellar SDK Version:');
try {
  const packageJson = require('@stellar/stellar-sdk/package.json');
  console.log(`   Version: ${packageJson.version}`);
  console.log(`   ✅ SDK loaded successfully`);
} catch (error) {
  console.log(`   ⚠️  Could not determine version`);
}

// 2. Check SorobanRpc availability
console.log('\n🔧 Soroban RPC Support:');
if (StellarSdk.SorobanRpc) {
  console.log(`   ✅ StellarSdk.SorobanRpc: Available`);
  
  if (StellarSdk.SorobanRpc.Server) {
    console.log(`   ✅ StellarSdk.SorobanRpc.Server: Available`);
  } else {
    console.log(`   ❌ StellarSdk.SorobanRpc.Server: Missing`);
  }
  
  if (StellarSdk.SorobanRpc.Api) {
    console.log(`   ✅ StellarSdk.SorobanRpc.Api: Available`);
  } else {
    console.log(`   ❌ StellarSdk.SorobanRpc.Api: Missing`);
  }
  
  if (StellarSdk.SorobanRpc.assembleTransaction) {
    console.log(`   ✅ StellarSdk.SorobanRpc.assembleTransaction: Available`);
  } else {
    console.log(`   ❌ StellarSdk.SorobanRpc.assembleTransaction: Missing`);
  }
} else {
  console.log(`   ❌ StellarSdk.SorobanRpc: Not available`);
  console.log(`   ⚠️  Your SDK version may not support Soroban`);
}

// 3. Test Soroban RPC connection
console.log('\n🌐 Soroban RPC Connection Test:');
const rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
console.log(`   URL: ${rpcUrl}`);

async function testSorobanRpc() {
  try {
    const server = new StellarSdk.SorobanRpc.Server(rpcUrl);
    console.log(`   ✅ Server instance created`);
    
    // Test if methods exist
    console.log(`\n   Testing server methods:`);
    console.log(`   - simulateTransaction: ${typeof server.simulateTransaction === 'function' ? '✅' : '❌'}`);
    console.log(`   - sendTransaction: ${typeof server.sendTransaction === 'function' ? '✅' : '❌'}`);
    console.log(`   - getTransaction: ${typeof server.getTransaction === 'function' ? '✅' : '❌'}`);
    console.log(`   - getHealth: ${typeof server.getHealth === 'function' ? '✅' : '❌'}`);
    console.log(`   - getLatestLedger: ${typeof server.getLatestLedger === 'function' ? '✅' : '❌'}`);
    
    // Try to get latest ledger
    console.log(`\n   Testing actual RPC call...`);
    try {
      const ledger = await server.getLatestLedger();
      console.log(`   ✅ RPC call successful!`);
      console.log(`   Latest ledger: ${ledger.sequence}`);
      console.log(`   Protocol version: ${ledger.protocolVersion}`);
    } catch (error) {
      console.log(`   ⚠️  RPC call failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Failed to create server: ${error.message}`);
    console.log(`\n   💡 This might mean:`);
    console.log(`   1. Stellar SDK version is too old (needs v11.0.0+)`);
    console.log(`   2. Wrong import path or package name`);
  }
}

// 4. Check contract support
console.log('\n📜 Contract Support:');
if (StellarSdk.Contract) {
  console.log(`   ✅ StellarSdk.Contract: Available`);
  
  try {
    const testContract = new StellarSdk.Contract(process.env.CONTRACT_ID);
    console.log(`   ✅ Contract instance created`);
    console.log(`   Contract ID: ${process.env.CONTRACT_ID}`);
  } catch (error) {
    console.log(`   ❌ Failed to create contract: ${error.message}`);
  }
} else {
  console.log(`   ❌ StellarSdk.Contract: Not available`);
}

// 5. Check Address support
console.log('\n🏠 Address Support:');
if (StellarSdk.Address) {
  console.log(`   ✅ StellarSdk.Address: Available`);
  
  try {
    const testAddress = new StellarSdk.Address(process.env.MASTER_PUBLIC_KEY);
    console.log(`   ✅ Address instance created`);
    console.log(`   Can convert to ScVal: ${typeof testAddress.toScVal === 'function' ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   ❌ Failed to create address: ${error.message}`);
  }
} else {
  console.log(`   ❌ StellarSdk.Address: Not available`);
}

// 6. Check nativeToScVal support
console.log('\n🔄 ScVal Conversion:');
if (StellarSdk.nativeToScVal) {
  console.log(`   ✅ StellarSdk.nativeToScVal: Available`);
  
  try {
    const testVal = StellarSdk.nativeToScVal(100, { type: 'i128' });
    console.log(`   ✅ Can convert to i128`);
  } catch (error) {
    console.log(`   ⚠️  i128 conversion failed: ${error.message}`);
  }
} else {
  console.log(`   ❌ StellarSdk.nativeToScVal: Not available`);
}

// Run async tests
testSorobanRpc().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary:');
  console.log('   If you see ✅ for most checks above, your SDK is ready');
  console.log('   If you see ❌, you may need to upgrade @stellar/stellar-sdk');
  console.log('\n   Minimum required version: v11.0.0');
  console.log('   Recommended version: v12.0.0 or later');
  console.log('\n   To upgrade:');
  console.log('   npm install @stellar/stellar-sdk@latest');
  console.log('='.repeat(60));
}).catch(error => {
  console.error('\n❌ Diagnostic failed:', error);
});
