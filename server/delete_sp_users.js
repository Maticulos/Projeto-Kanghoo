require('dotenv').config({ path: '../../.env' });
const db = require('./config/db');

async function deleteSPUsers() {
  try {
    console.log('Deleting users in SP...');
    
    // Delete related data first (cascade usually handles this, but let's be safe/explicit if needed, 
    // or just rely on cascade if configured. Assuming cascade or manual deletion needed).
    // Let's try deleting users directly and see if it works (assuming cascade).
    // If not, we delete children tables first.
    
    const ids = [9, 10, 11, 12, 13];
    
    // Delete from dependent tables manually just in case
    await db.query('DELETE FROM rotas_escolares WHERE usuario_id = ANY($1)', [ids]);
    await db.query('DELETE FROM pacotes_excursao WHERE usuario_id = ANY($1)', [ids]);
    await db.query('DELETE FROM veiculos WHERE motorista_id = ANY($1)', [ids]);
    await db.query('DELETE FROM empresas WHERE usuario_id = ANY($1)', [ids]);
    
    // Delete users
    const res = await db.query('DELETE FROM usuarios WHERE id = ANY($1)', [ids]);
    
    console.log(`Deleted ${res.rowCount} users.`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

deleteSPUsers();
