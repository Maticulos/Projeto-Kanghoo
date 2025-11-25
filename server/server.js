/**
 * Main server - modular version
 * Uses app.js for middleware/routes and initializes WebSocket/realtime.
 */

require('dotenv').config();

const logger = require('./utils/logger');
const { validateEnvironment } = require('./scripts/validate-env');

// Validar variáveis de ambiente antes de iniciar
try {
  validateEnvironment();
} catch (error) {
  logger.error('Falha na validação de ambiente:', error.message);
  process.exit(1);
}

// Log de variáveis importantes para depuração de ambiente
logger.info(`Environment variables: NODE_ENV=${process.env.NODE_ENV || ''}, DEMO_MODE=${process.env.DEMO_MODE || ''}, CORS_ORIGINS=${process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || ''}`);

const app = require('./app');
const RealtimeServer = require('./realtime/realtime-server');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    console.log('[SERVER] Iniciando servidor HTTP na porta', PORT);
    
    if (process.env.AUTO_CREATE_TABLES === 'true') {
      logger.warn('AUTO_CREATE_TABLES is deprecated. Use migrations (knex migrate:latest). Ignoring runtime creation.');
    }

    const server = app.listen(PORT, () => {
      console.log('[SERVER] ✅ Servidor HTTP rodando na porta', PORT);
      console.log('[SERVER] 🌐 Acesse: http://localhost:' + PORT);
      logger.info('Server listening on port ' + PORT);
      logger.info('Open http://localhost:' + PORT);
    });

    console.log('[SERVER] Inicializando servidor realtime...');
    // Initialize realtime server using the existing HTTP server
    const realtimeServer = new RealtimeServer({ server });
    await realtimeServer.initialize();
    console.log('[SERVER] ✅ Servidor realtime inicializado');

  } catch (error) {
    console.error('[SERVER] ❌ Erro ao iniciar servidor:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

iniciarServidor();

module.exports = app;
