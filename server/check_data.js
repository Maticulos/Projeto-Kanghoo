require('dotenv').config({ path: '../../.env' });
const db = require('./config/db');

async function checkData() {
  try {
    console.log('Checking vehicles...');
    const res = await db.query('SELECT * FROM veiculos');
    console.table(res.rows);

    console.log('Checking routes...');
    const routes = await db.query('SELECT id, usuario_id, nome_rota FROM rotas_escolares');
    console.table(routes.rows);

    console.log('Checking excursions...');
    const excursions = await db.query('SELECT id, usuario_id, nome_pacote FROM pacotes_excursao');
    console.table(excursions.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkData();
