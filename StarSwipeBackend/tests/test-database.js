require('dotenv').config();
const db = require('../src/config/database');
const logger = require('../src/utils/logger');

async function testDatabase() {
  console.log('🧪 Testing database connection...\n');
  
  try {
    await db.testConnection();
    
    const tables = ['users', 'cards', 'transactions', 'pin_attempts', 'sessions', 'audit_logs'];
    
    for (const table of tables) {
      const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`✅ ${table} table: ${result.rows[0].count} rows`);
    }
    
    console.log('\n✅ All database tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();
