require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

// TRY importing from /rpc subdirectory
let assembleTransaction;
try {
  const rpc = require('@stellar/stellar-sdk/rpc');
  assembleTransaction = rpc.assembleTransaction;
  console.log('✅ Loaded assembleTransaction from @stellar/stellar-sdk/rpc');
} catch (e) {
  console.log('⚠️  Could not load from /rpc, trying main package...');
  try {
    assembleTransaction = StellarSdk.rpc?.assembleTransaction;
    if (!assembleTransaction) {
      console.log('❌ assembleTransaction not available in this SDK version');
      console.log('   Will use manual auth handling instead');
    }
  } catch (e2) {
    console.log('❌ assembleTransaction not available');
  }
}

// Configuration
const CONTRACT_ID = 'CDQI6IYM5TIEKLHAPOHJEJIGLQX2TMPGB3FJJCH7B4PFMAU6SRAVTJKZ';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const MASTER_PUBLIC = process.env.MASTER_PUBLIC_KEY;
const MASTER_SECRET = process.env.MASTER_SECRET_KEY;
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

console.log('\n🧪 Official Stellar SDK Pattern (v7)\n');

async function rpcCall(method, params) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function main() {
  try {
    // 1. Load account
    console.log('1️⃣  Loading account...');
    const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const sourceAccount = await horizonServer.loadAccount(MASTER_PUBLIC);
    console.log('   ✅ Loaded, sequence:', sourceAccount.sequence);
    
    // 2. Create keypair
    console.log('\n2️⃣  Creating keypair...');
    const keypair = StellarSdk.Keypair.fromSecret(MASTER_SECRET);
    console.log('   ✅ Created');
    
    // 3. Create test data
    console.log('\n3️⃣  Creating test data...');
    const testCardKeypair = StellarSdk.Keypair.random();
    const testCardPublic = testCardKeypair.publicKey();
    const cardId = 'FIXED_TEST_' + Date.now();
    console.log('   Card ID:', cardId);
    console.log('   Card Address:', testCardPublic);
    console.log('   Owner:', MASTER_PUBLIC);
    
    // 4. Build contract call
    console.log('\n4️⃣  Building contract call...');
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    
    const params = [
      new StellarSdk.Address(MASTER_PUBLIC).toScVal(),
      StellarSdk.xdr.ScVal.scvString(cardId),
      new StellarSdk.Address(testCardPublic).toScVal(),
      StellarSdk.nativeToScVal(1000000000, { type: 'i128' })
    ];
    
    const operation = contract.call('register_card', ...params);
    
    let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    console.log('   ✅ Transaction built');
    
    // 5. Simulate
    console.log('\n5️⃣  Simulating transaction...');
    const simResult = await rpcCall('simulateTransaction', {
      transaction: tx.toXDR()
    });
    
    if (!simResult.results || simResult.results.length === 0) {
      throw new Error('Simulation returned no results');
    }
    
    console.log('   ✅ Simulated successfully');
    console.log('   Min resource fee:', simResult.minResourceFee);
    console.log('   Latest ledger:', simResult.latestLedger);
    
    // 6. Use assembleTransaction if available, otherwise manual
    console.log('\n6️⃣  Assembling transaction...');
    
    if (assembleTransaction) {
      console.log('   Using assembleTransaction helper...');
      
      // This is the OFFICIAL way according to Stellar docs
      const assembledTx = assembleTransaction(tx, simResult);
      tx = assembledTx.build();
      
      console.log('   ✅ Assembled with helper');
    } else {
      console.log('   Using manual assembly (SDK version doesn\'t have assembleTransaction)...');
      
      // Manual assembly - what assembleTransaction does internally
      const freshAccount = await horizonServer.loadAccount(MASTER_PUBLIC);
      
      const sorobanData = StellarSdk.xdr.SorobanTransactionData.fromXDR(
        simResult.transactionData,
        'base64'
      );
      
      const minResourceFee = parseInt(simResult.minResourceFee || '0');
      const baseFee = parseInt(StellarSdk.BASE_FEE);
      const totalFee = minResourceFee + baseFee;
      
      // Get auth entries from simulation
      let authEntries = [];
      if (simResult.results[0]?.auth) {
        for (const authXdr of simResult.results[0].auth) {
          const authEntry = StellarSdk.xdr.SorobanAuthorizationEntry.fromXDR(authXdr, 'base64');
          authEntries.push(authEntry);
        }
      }
      
      const finalOperation = contract.call('register_card', ...params);
      
      if (authEntries.length > 0) {
        finalOperation.auth = authEntries;
      }
      
      tx = new StellarSdk.TransactionBuilder(freshAccount, {
        fee: totalFee.toString(),
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setSorobanData(sorobanData)
        .addOperation(finalOperation)
        .setTimeout(30)
        .build();
      
      console.log('   ✅ Assembled manually');
    }
    
    // 7. Sign
    console.log('\n7️⃣  Signing transaction...');
    tx.sign(keypair);
    console.log('   ✅ Signed');
    
    // 8. Submit
    console.log('\n8️⃣  Submitting...');
    
    const submitResult = await rpcCall('sendTransaction', {
      transaction: tx.toXDR()
    });
    
    console.log('   Hash:', submitResult.hash);
    console.log('   Status:', submitResult.status);
    
    if (submitResult.status === 'ERROR') {
      console.log('\n❌ ERROR!');
      console.log(JSON.stringify(submitResult, null, 2));
      return;
    }
    
    // 9. Poll
    if (submitResult.status === 'PENDING') {
      console.log('\n9️⃣  Polling...');
      
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        try {
          const statusResult = await rpcCall('getTransaction', {
            hash: submitResult.hash
          });
          
          console.log('   Attempt', i + 1, ':', statusResult.status);
          
          if (statusResult.status === 'SUCCESS') {
            console.log('\n🎉 SUCCESS!');
            console.log('   https://stellar.expert/explorer/testnet/tx/' + submitResult.hash);
            console.log('\n✅ Card registered!');
            console.log('   Card ID:', cardId);
            console.log('   Card Address:', testCardPublic);
            return;
          }
          
          if (statusResult.status === 'FAILED') {
            console.log('\n❌ FAILED!');
            console.log(JSON.stringify(statusResult, null, 2));
            return;
          }
        } catch (e) {
          console.log('   Poll error:', e.message);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

main();
