const db = require('../../config/db');

async function testarCriacaoRotaEscolar() {
  try {
    const motoristaId = 141; // ID do motorista.escolar@teste.com

    const rota = {
      nome_rota: "Rota Teste Escolar",
      descricao: "Rota de teste para motorista escolar",
      escola_destino: "Escola de Teste",
      turno: "manha",
      horario_ida: "07:00:00",
      horario_volta: "17:00:00",
      dias_semana: "seg-sex",
      preco_mensal: 250.00,
      vagas_disponiveis: 10
    };

    await db.query(`
      INSERT INTO rotas_escolares (
        usuario_id, nome_rota, descricao, escola_destino, turno,
        horario_ida, horario_volta, dias_semana, preco_mensal,
        vagas_disponiveis, ativa
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
    `, [
      motoristaId,
      rota.nome_rota,
      rota.descricao,
      rota.escola_destino,
      rota.turno,
      rota.horario_ida,
      rota.horario_volta,
      rota.dias_semana,
      rota.preco_mensal,
      rota.vagas_disponiveis
    ]);

    console.log('✅ Rota escolar de teste criada com sucesso!');

    // Verificar se a rota foi realmente inserida
    const result = await db.query('SELECT * FROM rotas_escolares WHERE usuario_id = $1 AND nome_rota = $2', [motoristaId, rota.nome_rota]);
    if (result.rows.length > 0) {
      console.log('🔍 Rota encontrada no banco de dados:', result.rows[0]);
    } else {
      console.log('❌ Rota não encontrada no banco de dados.');
    }

  } catch (error) {
    console.error('❌ Erro ao testar criação de rota escolar:', error.message);
  }
  process.exit(0);
}

testarCriacaoRotaEscolar();