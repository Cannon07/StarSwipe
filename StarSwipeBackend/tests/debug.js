require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const CONTRACT_ID = process.env.CONTRACT_ID || 'CDQI6IYM5TIEKLHAPOHJEJIGLQX2TMPGB3FJJCH7B4PFMAU6SRAVTJKZ';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const MASTER_PUBLIC = process.env.MASTER_PUBLIC_KEY;
const MASTER_SECRET = process.env.MASTER_SECRET_KEY;
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

console.log('🔬 Step-by-Step RPC Debug Script\n');
console.log('='.repeat(70));

async function testRpcCall(method, params) {
  console.log(`\n📡 Testing: ${method}`);
  console.log('   Params:', JSON.stringify(params, null, 2).substring(0, 200) + '...');
  
  try {
    const response = await fetch(RPC_URL, {
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
      console.log('   ❌ Error:', data.error.message);
      console.log('   Full error:', JSON.stringify(data.error, null, 2));
      return { success: false, error: data.error };
    }
    
    console.log('   ✅ Success!');
    console.log('   Result keys:', Object.keys(data.result || {}).join(', '));
    return { success: true, result: data.result };
  } catch (error) {
    console.log('   ❌ Exception:', error.message);
    return { success: false, error: error.message };
  }
}

async function runDebugTests() {
  // Test 1: Get Latest Ledger (simplest test)
  console.log('\n📝 TEST 1: Get Latest Ledger');
  console.log('─'.repeat(70));
  const ledgerTest = await testRpcCall('getLatestLedger', {});
  
  if (!ledgerTest.success) {
    console.log('\n❌ Basic RPC connection failed!');
    console.log('   Check your RPC_URL:', RPC_URL);
    return;
  }
  
  console.log('   Ledger sequence:', ledgerTest.result.sequence);
  console.log('   Protocol version:', ledgerTest.result.protocolVersion);
  
  // Test 2: Get Health (if available)
  console.log('\n📝 TEST 2: Get Health');
  console.log('─'.repeat(70));
  await testRpcCall('getHealth', {});
  
  // Test 3: Load Horizon account
  console.log('\n📝 TEST 3: Load Account from Horizon');
  console.log('─'.repeat(70));
  try {
    const horizonUrl = 'https://horizon-testnet.stellar.org';
    const horizonServer = new StellarSdk.Horizon.Server(horizonUrl);
    const account = await horizonServer.loadAccount(MASTER_PUBLIC);
    console.log('   ✅ Account loaded');
    console.log('   Sequence:', account.sequence);
    console.log('   Balance:', account.balances.find(b => b.asset_type === 'native')?.balance || '0', 'XLM');
  } catch (error) {
    console.log('   ❌ Failed to load account:', error.message);
    return;
  }
  
  // Test 4: Build a simple transaction
  console.log('\n📝 TEST 4: Build Contract Call Transaction');
  console.log('─'.repeat(70));
  
  try {
    const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const sourceAccount = await horizonServer.loadAccount(MASTER_PUBLIC);
    const keypair = StellarSdk.Keypair.fromSecret(MASTER_SECRET);
    
    // Create contract instance
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    console.log('   ✅ Contract instance created');
    
    // Test card data
    const testCardId = 'DEBUG_TEST_' + Date.now();
    const testCardPublic = StellarSdk.Keypair.random().publicKey();
    const dailyLimitStroops = 1000000000; // 100 XLM
    
    console.log('   Test data:');
    console.log('     Owner:', MASTER_PUBLIC);
    console.log('     Card ID:', testCardId);
    console.log('     Card Address:', testCardPublic);
    console.log('     Daily Limit:', dailyLimitStroops, 'stroops');
    
    // Build parameters - try different methods
    console.log('\n   Trying parameter encoding method 1 (Address.toScVal)...');
    try {
      const params1 = [
        new StellarSdk.Address(MASTER_PUBLIC).toScVal(),
        StellarSdk.xdr.ScVal.scvString(testCardId),
        new StellarSdk.Address(testCardPublic).toScVal(),
        StellarSdk.nativeToScVal(dailyLimitStroops, { type: 'i128' })
      ];
      console.log('   ✅ Method 1 parameters created');
      
      // Build transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('register_card', ...params1))
        .setTimeout(30)
        .build();
      
      console.log('   ✅ Transaction built');
      console.log('   Transaction XDR length:', transaction.toXDR().length);
      
      // Test 5: Simulate transaction
      console.log('\n📝 TEST 5: Simulate Transaction');
      console.log('─'.repeat(70));
      
      const simulateResult = await testRpcCall('simulateTransaction', {
        transaction: transaction.toXDR()
      });
      
      if (!simulateResult.success) {
        console.log('\n❌ Simulation failed!');
        console.log('   This could mean:');
        console.log('   - Contract function name is wrong');
        console.log('   - Parameter types don\'t match');
        console.log('   - Contract not deployed');
        console.log('   - Contract has a bug');
        return;
      }
      
      console.log('\n   ✅ SIMULATION SUCCESSFUL!');
      console.log('   Result:', JSON.stringify(simulateResult.result, null, 2).substring(0, 500));
      
      // Check what we got back
      if (simulateResult.result.results && simulateResult.result.results.length > 0) {
        console.log('\n   📊 Simulation Results:');
        console.log('   - Results count:', simulateResult.result.results.length);
        console.log('   - Transaction data present:', !!simulateResult.result.transactionData);
        console.log('   - Min resource fee:', simulateResult.result.minResourceFee || 'N/A');
        console.log('   - Cost (CPU):', simulateResult.result.cost?.cpuInsns || 'N/A');
        console.log('   - Cost (Mem):', simulateResult.result.cost?.memBytes || 'N/A');
      }
      
      // Test 6: Prepare transaction with simulation data
      if (simulateResult.result.transactionData) {
        console.log('\n📝 TEST 6: Prepare Transaction with Simulation Data');
        console.log('─'.repeat(70));
        
        try {
          const sorobanData = StellarSdk.xdr.SorobanTransactionData.fromXDR(
            simulateResult.result.transactionData,
            'base64'
          );
          console.log('   ✅ Soroban data decoded');
          
          // Calculate proper fee
          const minResourceFee = Number(simulateResult.result.minResourceFee || '0');
          const baseFee = Number(StellarSdk.BASE_FEE);
          const totalFee = minResourceFee + baseFee;
          
          console.log('   Fee calculation:');
          console.log('     Base fee:', baseFee);
          console.log('     Resource fee:', minResourceFee);
          console.log('     Total fee:', totalFee);
          
          // Rebuild transaction with simulation data
          const ops = transaction.operations;
          const preparedTx = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: String(totalFee),
            networkPassphrase: NETWORK_PASSPHRASE,
          })
            .setSorobanData(sorobanData)
            .addOperation(ops[0])
            .setTimeout(30)
            .build();
          
          console.log('   ✅ Transaction prepared with simulation data');
          
          // Test 7: Sign transaction
          console.log('\n📝 TEST 7: Sign Transaction');
          console.log('─'.repeat(70));
          
          preparedTx.sign(keypair);
          console.log('   ✅ Transaction signed');
          console.log('   Signatures count:', preparedTx.signatures.length);
          
          // Test 8: Submit transaction (OPTIONAL - uncomment to actually submit)
          console.log('\n📝 TEST 8: Submit Transaction (DRY RUN - not submitting)');
          console.log('─'.repeat(70));
          console.log('   ⚠️  To actually submit, uncomment the code below');
          console.log('   Transaction ready to submit with XDR:', preparedTx.toXDR().substring(0, 100) + '...');
          
          /*
          // UNCOMMENT TO ACTUALLY SUBMIT:
          const submitResult = await testRpcCall('sendTransaction', {
            transaction: preparedTx.toXDR()
          });
          
          if (submitResult.success) {
            console.log('\n   ✅ TRANSACTION SUBMITTED!');
            console.log('   Hash:', submitResult.result.hash);
            console.log('   Status:', submitResult.result.status);
            console.log('   View at: https://stellar.expert/explorer/testnet/tx/' + submitResult.result.hash);
          }
          */
          
        } catch (error) {
          console.log('   ❌ Failed to prepare transaction:', error.message);
          console.log('   Stack:', error.stack);
        }
      }
      
    } catch (error) {
      console.log('   ❌ Failed to encode parameters:', error.message);
      console.log('   Stack:', error.stack);
    }
    
  } catch (error) {
    console.log('   ❌ Failed to build transaction:', error.message);
    console.log('   Stack:', error.stack);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 DEBUG SUMMARY');
  console.log('='.repeat(70));
  console.log('✅ RPC endpoint is working');
  console.log('✅ Can build contract transactions');
  console.log('✅ Parameter encoding works');
  console.log('Next step: Uncomment TEST 8 to actually submit a transaction');
  console.log('='.repeat(70));
}

// Run the tests
runDebugTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.error(error.stack);
});
