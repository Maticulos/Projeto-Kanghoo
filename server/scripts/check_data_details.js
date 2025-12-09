const db = require('../config/db');

async function checkDataDetails() {
  try {
    console.log('--- Detalhes das Rotas Escolares ---');
    const rotas = await db.query("SELECT id, nome_rota, ativa, escola_destino, turno FROM rotas_escolares");
    console.table(rotas.rows);

    console.log('\n--- Detalhes dos Motoristas ---');
    const users = await db.query("SELECT id, nome_completo, tipo_usuario, endereco_completo FROM usuarios WHERE tipo_usuario LIKE 'motorista%'");
    console.table(users.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkDataDetails();
