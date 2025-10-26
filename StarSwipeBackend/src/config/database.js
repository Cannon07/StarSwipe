const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  logger.info('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing database pool');
  pool.end(() => {
    logger.info('Database pool closed');
    process.exit(0);
  });
});

// Test query function
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database');
    logger.info('✅ Database test query successful:', {
      time: result.rows[0].current_time,
      database: result.rows[0].database
    });
    return true;
  } catch (error) {
    logger.error('❌ Database test query failed:', error.message);
    return false;
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection
};
