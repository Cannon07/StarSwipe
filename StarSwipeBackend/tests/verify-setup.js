require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');
const path = require('path');

async function verifySetup() {
  console.log('🔍 BitSpend Environment Verification\n');
  console.log('='.repeat(60));
  
  let allGood = true;

  // 1. Check environment variables
  console.log('\n📋 Environment Variables:');
  
  const requiredVars = [
    'MASTER_PUBLIC_KEY',
    'MASTER_SECRET_KEY',  // Changed from MASTER_PRIVATE_KEY
    'CONTRACT_ID',
    'DATABASE_URL'
  ];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: Present`);
    } else {
      console.log(`   ❌ ${varName}: Missing`);
      allGood = false;
    }
  }

  // 2. Validate Stellar keys
  console.log('\n🔑 Stellar Keys Validation:');
  
  try {
    const keypair = StellarSdk.Keypair.fromSecret(process.env.MASTER_SECRET_KEY);
    console.log(`   ✅ Private key valid`);
    
    if (keypair.publicKey() === process.env.MASTER_PUBLIC_KEY) {
      console.log(`   ✅ Public key matches private key`);
    } else {
      console.log(`   ❌ Public key mismatch!`);
      console.log(`      Expected: ${process.env.MASTER_PUBLIC_KEY}`);
      console.log(`      Got: ${keypair.publicKey()}`);
      allGood = false;
    }
  } catch (error) {
    console.log(`   ❌ Invalid private key: ${error.message}`);
    allGood = false;
  }

  // 3. Check network connectivity
  console.log('\n🌐 Network Connectivity:');
  
  const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
  const rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
  
  try {
    const server = new StellarSdk.SorobanRpc.Server(rpcUrl);
    const health = await server.getHealth();
    console.log(`   ✅ Soroban RPC: Connected (${rpcUrl})`);
    console.log(`      Status: ${health.status}`);
  } catch (error) {
    console.log(`   ⚠️  Soroban RPC: Connection check skipped`);
    console.log(`      ${error.message}`);
    // Don't fail on this - getHealth might not be available
  }

  // 4. Check account balance
  console.log('\n💰 Account Status:');
  
  try {
    const horizonServer = new StellarSdk.Horizon.Server(horizonUrl);
    const account = await horizonServer.loadAccount(process.env.MASTER_PUBLIC_KEY);
    
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    const balance = xlmBalance ? xlmBalance.balance : '0';
    
    console.log(`   ✅ Account exists`);
    console.log(`   Balance: ${balance} XLM`);
    
    if (parseFloat(balance) < 10) {
      console.log(`   ⚠️  Warning: Low balance (< 10 XLM)`);
      console.log(`      Get testnet XLM at: https://laboratory.stellar.org/#account-creator`);
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`   ❌ Account not found on network`);
      console.log(`      Fund your account at: https://laboratory.stellar.org/#account-creator`);
      allGood = false;
    } else {
      console.log(`   ❌ Failed to load account: ${error.message}`);
      allGood = false;
    }
  }

  // 5. Check contract (simplified check)
  console.log('\n📜 Contract Status:');
  console.log(`   Contract ID: ${process.env.CONTRACT_ID}`);
  console.log(`   ℹ️  Contract verification requires deployment`);
  console.log(`   Test the actual contract calls to verify it's working`);

  // 6. Check database
  console.log('\n🗄️  Database:');
  
  try {
    // Try to load database module from project root
    const dbPath = path.join(process.cwd(), 'src', 'config', 'database');
    const db = require(dbPath);
    
    const result = await db.query('SELECT NOW()');
    console.log(`   ✅ Database connection: Working`);
    
    // Check if cards table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cards'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log(`   ✅ Cards table: Exists`);
      
      // Check for share3_length column
      const columnCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'cards' AND column_name = 'share3_length'
        );
      `);
      
      if (columnCheck.rows[0].exists) {
        console.log(`   ✅ share3_length column: Exists`);
      } else {
        console.log(`   ⚠️  share3_length column: Missing`);
        console.log(`      Run: psql $DATABASE_URL -f add_share3_length_column.sql`);
      }
    } else {
      console.log(`   ❌ Cards table: Missing`);
      console.log(`      Run your database migrations first`);
      allGood = false;
    }
  } catch (error) {
    console.log(`   ❌ Database connection failed: ${error.message}`);
    console.log(`      Make sure you're running this from the project root`);
    allGood = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allGood) {
    console.log('✅ All checks passed! You\'re ready to test.');
    console.log('\nNext steps:');
    console.log('1. Run database migration if needed');
    console.log('2. node tests/test-sdk-contract.js');
  } else {
    console.log('❌ Some checks failed. Fix the issues above before testing.');
    console.log('\nCommon fixes:');
    console.log('- Fund account: curl "https://friendbot.stellar.org?addr=$MASTER_PUBLIC_KEY"');
    console.log('- Run migrations: psql $DATABASE_URL -f migrations/your_migration.sql');
    console.log('- Check .env file has all required variables');
  }
  console.log('='.repeat(60));

  process.exit(allGood ? 0 : 1);
}

verifySetup().catch(error => {
  console.error('\n❌ Verification error:', error);
  process.exit(1);
});
