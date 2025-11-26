require('dotenv').config();
const db = require('../config/db');

async function verificar() {
  const result = await db.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'criancas'
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  
  console.log('Colunas da tabela criancas:');
  result.rows.forEach(r => {
    console.log(`  - ${r.column_name} (${r.data_type}) - ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
  
  await db.pool.end();
}

verificar();
