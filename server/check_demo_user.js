require('dotenv').config({ path: '../../.env' });
const db = require('./config/db');

async function checkUser() {
  try {
    const email = 'ana.responsavel@teste.kanghoo.com';
    console.log(`Checking user: ${email}`);
    const res = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (res.rows.length > 0) {
      console.log('User found:', res.rows[0]);
    } else {
      console.log('User NOT found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkUser();
