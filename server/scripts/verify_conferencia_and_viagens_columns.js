require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('🔍 Conferindo colunas de conferencia_criancas e viagens_ativas...');
    const confCols = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'conferencia_criancas' ORDER BY ordinal_position`);
    console.log('\n📋 conferencia_criancas:');
    confCols.rows.forEach(r => console.log(` - ${r.column_name} : ${r.data_type}`));

    const viagensCols = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'viagens_ativas' ORDER BY ordinal_position`);
    console.log('\n📋 viagens_ativas:');
    viagensCols.rows.forEach(r => console.log(` - ${r.column_name} : ${r.data_type}`));

  } catch (err) {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  } finally {
    if (db.pool) await db.pool.end();
  }
}

main();
