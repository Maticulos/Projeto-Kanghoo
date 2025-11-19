const { Pool } = require('pg');
const logger = require('../utils/logger');

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT_MS || '10000', 10),
  };
} else {
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const passwordString = String(dbPassword);

  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'kanghoo_db_prod',
    user: process.env.DB_USER || 'postgres',
    password: passwordString,
    ssl: false,
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT_MS || '10000', 10),
  };
}

const pool = new Pool(poolConfig);

// Event listeners para tratamento de erros
pool.on('error', (err, client) => {
  logger.error('Erro inesperado no pool de conexões PostgreSQL:', {
    error: err.message,
    stack: err.stack,
    client: client ? 'client exists' : 'no client'
  });
  
  // Não encerrar o processo, apenas logar
  // O pool tentará reconectar automaticamente
});

pool.on('connect', (client) => {
  logger.info('Nova conexão PostgreSQL estabelecida');
});

pool.on('remove', (client) => {
  logger.info('Conexão PostgreSQL removida do pool');
});

// Health check do pool
async function checkPoolHealth() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: result.rows[0].now };
  } catch (error) {
    logger.error('Health check do pool falhou:', error);
    return { healthy: false, error: error.message };
  }
}

// Verificar saúde do pool periodicamente (a cada 5 minutos)
setInterval(async () => {
  const health = await checkPoolHealth();
  if (!health.healthy) {
    logger.warn('Pool de conexões não está saudável:', health);
  }
}, 5 * 60 * 1000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exportar pool para acesso direto se necessário
  checkPoolHealth
};
