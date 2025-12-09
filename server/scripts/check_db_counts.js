const db = require('../config/db');

async function checkCounts() {
  try {
    console.log('Verificando contagem de registros no banco de dados...');

    const users = await db.query("SELECT count(*) FROM usuarios WHERE tipo_usuario IN ('motorista_escolar', 'motorista_excursao', 'motorista_escolar_excursao')");
    console.log(`Motoristas cadastrados: ${users.rows[0].count}`);

    const rotas = await db.query("SELECT count(*) FROM rotas_escolares");
    console.log(`Rotas escolares cadastradas: ${rotas.rows[0].count}`);

    const pacotes = await db.query("SELECT count(*) FROM pacotes_excursao");
    console.log(`Pacotes de excursão cadastrados: ${pacotes.rows[0].count}`);

    const viagens = await db.query("SELECT count(*) FROM viagens");
    console.log(`Viagens (em andamento/histórico) cadastradas: ${viagens.rows[0].count}`);

  } catch (err) {
    console.error('Erro ao verificar banco:', err.message);
  } finally {
    process.exit();
  }
}

checkCounts();
