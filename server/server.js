/**
 * Main server - modular version
 * Uses app.js for middleware/routes and initializes WebSocket/realtime.
 */

require('dotenv').config();

const logger = require('./utils/logger');
const app = require('./app');
const RealtimeServer = require('./realtime/realtime-server');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    if (process.env.AUTO_CREATE_TABLES === 'true') {
      logger.warn('AUTO_CREATE_TABLES is deprecated. Use migrations (knex migrate:latest). Ignoring runtime creation.');
    }

    const server = app.listen(PORT, () => {
      logger.info('Server listening on port ' + PORT);
      logger.info('Open http://localhost:' + PORT);
    });

    // Initialize realtime server using the existing HTTP server
    const realtimeServer = new RealtimeServer({ server });
    await realtimeServer.initialize();

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

iniciarServidor();

module.exports = app;
