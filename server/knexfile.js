// Knex configuration for migrations only (PostgreSQL)
require('dotenv').config();

module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'kanghoo_db_prod',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || 'postgres'),
    ssl: false
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: __dirname + '/migrations'
  }
};

