require('dotenv').config();
const app = require('./app');
const db = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Test database connection on startup
db.testConnection()
  .then(() => {
    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔗 API base: http://localhost:${PORT}/api/v1`);
    });
  })
  .catch((error) => {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
