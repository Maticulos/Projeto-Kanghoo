const db = require('../config/db');

async function checkCoords() {
  try {
    console.log('--- Coordenadas dos Usuários ---');
    const users = await db.query("SELECT id, nome_completo, latitude, longitude FROM usuarios WHERE tipo_usuario LIKE 'motorista%'");
    console.table(users.rows);

    console.log('\n--- Coordenadas das Rotas ---');
    const rotas = await db.query("SELECT id, nome_rota, latitude_origem, longitude_origem FROM rotas_escolares");
    console.table(rotas.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkCoords();
