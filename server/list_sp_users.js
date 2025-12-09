require('dotenv').config({ path: '../../.env' });
const db = require('./config/db');

async function listSPUsers() {
  try {
    console.log('Searching for users in SP...');
    const res = await db.query(`
      SELECT id, nome_completo, cidade, estado, endereco_completo 
      FROM usuarios 
      WHERE 
        cidade ILIKE '%Paulo%' OR 
        estado ILIKE '%SP%' OR 
        endereco_completo ILIKE '%São Paulo%' OR
        endereco_completo ILIKE '%SP%'
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

listSPUsers();
