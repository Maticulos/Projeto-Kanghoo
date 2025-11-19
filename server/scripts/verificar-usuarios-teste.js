require('dotenv').config();
const db = require('../config/db');

async function verificar() {
  const result = await db.query(`
    SELECT id, email, nome_completo, tipo_usuario
    FROM usuarios
    WHERE email LIKE '%teste%' OR email LIKE '%@teste.%'
    ORDER BY email
  `);
  
  console.log(`Encontrados ${result.rows.length} usuários de teste:\n`);
  result.rows.forEach(u => {
    console.log(`  - ${u.email} (${u.nome_completo}) - ${u.tipo_usuario} [ID: ${u.id}]`);
  });
  
  await db.pool.end();
}

verificar();
