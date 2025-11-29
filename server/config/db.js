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
  const dbHost = process.env.DB_HOST || 'localhost';

  poolConfig = {
    host: dbHost,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'kanghoo_db_prod',
    user: process.env.DB_USER || 'postgres',
    password: passwordString,
    ssl: false,
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT_MS || '10000', 10),
  };
  
  // Log para debug
  console.log('[DB] Configuração de conexão:', {
    host: dbHost,
    port: poolConfig.port,
    database: poolConfig.database,
    user: poolConfig.user
  });
}

let pool = null;

// Lazy initialization - criar pool apenas quando necessário
function getPool() {
  if (!pool) {
    console.log('[DB] Criando pool de conexões (lazy init)...');
    pool = new Pool(poolConfig);
    
    pool.on('error', (err, client) => {
      logger.error('Erro inesperado no pool de conexões PostgreSQL:', {
        error: err.message,
        stack: err.stack,
        client: client ? 'client exists' : 'no client'
      });
    });

    pool.on('connect', (client) => {
      logger.info('Nova conexão PostgreSQL estabelecida');
    });

    pool.on('remove', (client) => {
      logger.info('Conexão PostgreSQL removida do pool');
    });
  }
  return pool;
}

// Event listeners serão adicionados no getPool()

// Health check do pool
async function checkPoolHealth() {
  try {
    const currentPool = getPool();
    const result = await currentPool.query('SELECT NOW()');
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

// Wrapper com retry automático
async function queryWithRetry(text, params, retries = 3) {
  const currentPool = getPool(); // Lazy init
  
  for (let i = 0; i < retries; i++) {
    try {
      return await currentPool.query(text, params);
    } catch (error) {
      console.log(`[DB] Tentativa ${i + 1}/${retries} falhou:`, error.code);
      
      if (error.code === 'ECONNREFUSED' && i < retries - 1) {
        // Aguardar um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        
        // Tentar reconectar
        try {
          await currentPool.query('SELECT 1');
        } catch (reconnectError) {
          console.log('[DB] Reconexão falhou, tentando novamente...');
        }
      } else {
        throw error;
      }
    }
  }
}

module.exports = {
  query: queryWithRetry,
  get pool() { return getPool(); }, // Getter para lazy init
  checkPoolHealth
};
