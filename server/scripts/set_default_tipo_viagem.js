require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Conectando ao banco...');
    await db.query('SELECT 1');
    console.log('✅ Conexão OK');

    console.log("🔧 Definindo default 'ida' para tipo_viagem e atualizando nulos...");
    await db.query("ALTER TABLE viagens_ativas ALTER COLUMN tipo_viagem SET DEFAULT 'ida'");
    await db.query("UPDATE viagens_ativas SET tipo_viagem = 'ida' WHERE tipo_viagem IS NULL");
    console.log('✅ Default aplicado e valores nulos atualizados');

  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
  }
}

main();
