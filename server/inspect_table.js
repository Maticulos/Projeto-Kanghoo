
require('dotenv').config();
delete process.env.DATABASE_URL;
process.env.DB_HOST = 'localhost';
const db = require('./config/db');

async function inspect() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'veiculos';
    `);
    console.log(res.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

inspect();
