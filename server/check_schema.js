
require('dotenv').config();
delete process.env.DATABASE_URL; // Remove DATABASE_URL to force using individual params
process.env.DB_HOST = 'localhost'; // Force localhost for local script execution
const db = require('./config/db');

async function check() {
  try {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'veiculos' AND column_name = 'marca';
    `);
    if (res.rows.length > 0) {
      console.log('Column marca exists');
    } else {
      console.log('Column marca does NOT exist');
      // Add it
      await db.query('ALTER TABLE veiculos ADD COLUMN marca VARCHAR(100)');
      console.log('Column marca added');
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
