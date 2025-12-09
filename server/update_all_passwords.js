require('dotenv').config({ path: '../../.env' });
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function updateAllPasswords() {
  try {
    console.log('Updating all user passwords to "teste123"...');
    
    // Fix missing column issue
    try {
      await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
      console.log('Added/Verified atualizado_em column in usuarios table.');
    } catch (e) {
      console.warn('Could not add column atualizado_em:', e.message);
    }

    const senha = 'teste123';
    const hash = await bcrypt.hash(senha, 12);
    
    const result = await db.query(`
      UPDATE usuarios 
      SET senha = $1
    `, [hash]);
    
    console.log(`Updated passwords for ${result.rowCount} users.`);
  } catch (err) {
    console.error('Error updating passwords:', err);
  } finally {
    // Force exit after a short delay to allow logs to flush
    setTimeout(() => process.exit(0), 1000);
  }
}

updateAllPasswords();
