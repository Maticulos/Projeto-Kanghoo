/**
 * Servidor principal - versão modular
 * Usa app.js para middlewares/rotas e inicializa WebSocket/realtime.
 */

require('dotenv').config();

const logger = require('./utils/logger');
const app = require('./app');
const db = require('./config/db');

// Realtime
const RealtimeServer = require('./realtime/realtime-server');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    if (process.env.AUTO_CREATE_TABLES === 'true') {
      await db.criarTabelas();
      logger.info('Criação automática de tabelas habilitada (AUTO_CREATE_TABLES=true)');
    } else {
      logger.info('AUTO_CREATE_TABLES não habilitado. Assumindo migrações aplicadas.');
    }

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📱 Acesse a aplicação em http://localhost:${PORT}`);
    });

    // Inicializar servidor de tempo real usando o HTTP server existente
    const realtimeServer = new RealtimeServer({ server });
    await realtimeServer.initialize();

  } catch (error) {
    logger.error('Falha ao iniciar servidor:', error);
    process.exit(1);
  }
}

iniciarServidor();

module.exports = app;

