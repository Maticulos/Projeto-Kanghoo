require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔌 Conectando ao banco...');
    await db.query('SELECT 1');

    const res = await db.query(`
      SELECT con.conname AS constraint_name,
             pg_get_constraintdef(con.oid) AS constraint_def
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'viagens_ativas'
        AND con.conname LIKE 'viagens_ativas_%';
    `);

    if (res.rows.length === 0) {
      console.log('Nenhuma constraint encontrada com prefixo viagens_ativas_');
    } else {
      for (const row of res.rows) {
        console.log('---');
        console.log('Constraint:', row.constraint_name);
        console.log(row.constraint_def);
      }
    }
  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
  }
}

main();
