const db = require('../config/db');

async function simulateSearch() {
  try {
    console.log('Simulando busca de transportes...');

    // Parâmetros simulados (padrão do frontend)
    const tipo = 'todos';
    const latitude = -28.480036;
    const longitude = -49.006901;
    const raioKm = 10;
    const limit = 20;
    const offset = 0;

    let latExpr = 'COALESCE(cl.latitude, u.latitude, r.latitude_origem, p.latitude_partida)';
    let lonExpr = 'COALESCE(cl.longitude, u.longitude, r.longitude_origem, p.longitude_partida)';

    let query = `
      SELECT DISTINCT
        u.id,
        u.nome_completo as nome,
        ${latExpr} as latitude,
        ${lonExpr} as longitude,
        (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(${latExpr})) * 
            cos(radians(${lonExpr}) - radians(${longitude})) + 
            sin(radians(${latitude})) * sin(radians(${latExpr}))
          )
        ) AS distancia_km
      FROM usuarios u
      LEFT JOIN veiculos v ON u.id = v.motorista_id
      LEFT JOIN caracteristicas_veiculos cv ON v.id = cv.veiculo_id
      LEFT JOIN cache_localizacao cl ON u.id = cl.motorista_id
      LEFT JOIN viagens viagem_ativa ON cl.viagem_ativa_id = viagem_ativa.id
      LEFT JOIN rotas_escolares r_ativa ON viagem_ativa.rota_id = r_ativa.id
      LEFT JOIN rotas_escolares r ON u.id = r.usuario_id AND r.ativa = true
      LEFT JOIN pacotes_excursao p ON u.id = p.usuario_id AND p.ativo = true
      WHERE u.tipo_usuario IN ('motorista_escolar', 'motorista_excursao', 'motorista_escolar_excursao')
      AND (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(${latExpr})) * 
            cos(radians(${lonExpr}) - radians(${longitude})) + 
            sin(radians(${latitude})) * sin(radians(${latExpr}))
          )
        ) <= ${raioKm}
      LIMIT ${limit} OFFSET ${offset}
    `;

    console.log('Executando query...');
    const result = await db.query(query);
    console.log(`Resultados encontrados: ${result.rows.length}`);
    console.table(result.rows);

  } catch (err) {
    console.error('Erro na query:', err.message);
  } finally {
    process.exit();
  }
}

simulateSearch();
