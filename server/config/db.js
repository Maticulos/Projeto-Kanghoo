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

const pool = new Pool(poolConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
};
