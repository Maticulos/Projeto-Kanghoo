require('dotenv').config();
const db = require('../config/db');

async function verificar() {
  const result = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'rotas_escolares' 
    AND table_schema = 'public' 
    ORDER BY ordinal_position
  `);
  
  console.log('Colunas de rotas_escolares:');
  result.rows.forEach(r => {
    console.log(`  - ${r.column_name} (${r.data_type})`);
  });
  
  await db.pool.end();
}

verificar();
