require('dotenv').config();
const db = require('../config/db');

async function verificar() {
  const result = await db.query(`
    SELECT constraint_name, constraint_type 
    FROM information_schema.table_constraints 
    WHERE table_name = 'veiculos' 
    AND table_schema = 'public'
  `);
  
  console.log('Constraints de veiculos:');
  result.rows.forEach(r => {
    console.log(`  - ${r.constraint_name} (${r.constraint_type})`);
  });
  
  // Verificar se placa tem unique
  const unique = await db.query(`
    SELECT constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'veiculos'
    AND ccu.column_name = 'placa'
    AND tc.constraint_type = 'UNIQUE'
  `);
  
  console.log('\nUnique constraints em placa:');
  if (unique.rows.length > 0) {
    unique.rows.forEach(r => console.log(`  - ${r.constraint_name}`));
  } else {
    console.log('  - Nenhuma constraint UNIQUE encontrada em placa');
  }
  
  await db.pool.end();
}

verificar();

