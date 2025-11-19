const Router = require('koa-router');
const db = require('../config/db');
const { success, error } = require('../utils/api-response');
const { authenticateToken } = require('../middleware/auth-utils');

const router = new Router({ prefix: '/api/viagens' });

// Aplica autenticação a todas as rotas de viagens
router.use(authenticateToken);

/**
 * Inicia uma nova viagem para uma rota escolar
 * POST /api/viagens/iniciar
 * Body: { rota_id: number, veiculo_id: number, odometro_inicial: number (optional) }
 */
router.post('/iniciar', async (ctx) => {
  const { rota_id, veiculo_id, odometro_inicial } = ctx.request.body;
  const usuario_id = ctx.state.user.id;

  if (!rota_id || !veiculo_id) {
    return ctx.body = error('ID da Rota e ID do Veículo são obrigatórios.', 400);
  }

  try {
    // Verificar se já existe uma viagem em andamento para esta rota/motorista
    const viagemExistente = await db.query(
      'SELECT * FROM viagens_ativas WHERE rota_id = $1 AND usuario_id = $2 AND status = $3',
      [rota_id, usuario_id, 'em_andamento']
    );

    if (viagemExistente.rows.length > 0) {
      return ctx.body = error('Já existe uma viagem em andamento para esta rota.', 409);
    }

    const result = await db.query(
      'INSERT INTO viagens_ativas (rota_id, veiculo_id, usuario_id, odometro_inicial) VALUES ($1, $2, $3, $4) RETURNING *',
      [rota_id, veiculo_id, usuario_id, odometro_inicial]
    );
    
    return ctx.body = success(result.rows[0], 'Viagem iniciada com sucesso!');
  } catch (err) {
    console.error('Erro ao iniciar viagem:', err);
    return ctx.body = error('Erro interno ao iniciar a viagem.', 500);
  }
});

/**
 * Finaliza uma viagem ativa
 * POST /api/viagens/:id/finalizar
 * Body: { odometro_final: number (optional) }
 */
router.post('/:id/finalizar', async (ctx) => {
  const viagem_id = parseInt(ctx.params.id);
  const { odometro_final } = ctx.request.body;
  const usuario_id = ctx.state.user.id;

  try {
    const viagemResult = await db.query('SELECT * FROM viagens_ativas WHERE id = $1 AND usuario_id = $2', [viagem_id, usuario_id]);
    if (viagemResult.rows.length === 0) {
      return ctx.body = error('Viagem não encontrada ou não pertence a este motorista.', 404);
    }

    const viagem = viagemResult.rows[0];
    if (viagem.status !== 'em_andamento') {
      return ctx.body = error('Esta viagem não está em andamento.', 400);
    }

    let distancia = null;
    if (viagem.odometro_inicial && odometro_final) {
      distancia = odometro_final - viagem.odometro_inicial;
    }

    const result = await db.query(
      'UPDATE viagens_ativas SET status = $1, data_fim = CURRENT_TIMESTAMP, odometro_final = $2, distancia_percorrida_km = $3 WHERE id = $4 RETURNING *',
      ['concluida', odometro_final, distancia, viagem_id]
    );
    
    return ctx.body = success(result.rows[0], 'Viagem finalizada com sucesso!');
  } catch (err) {
    console.error('Erro ao finalizar viagem:', err);
    return ctx.body = error('Erro interno ao finalizar a viagem.', 500);
  }
});

/**
 * Registra uma conferência de criança (embarque/desembarque)
 * POST /api/viagens/:id/conferencia
 * Body: { crianca_id: number, tipo_conferencia: string, latitude: number, longitude: number }
 */
router.post('/:id/conferencia', async (ctx) => {
  const viagem_id = parseInt(ctx.params.id);
  const { crianca_id, tipo_conferencia, latitude, longitude } = ctx.request.body;
  const responsavel_conferencia_id = ctx.state.user.id;

  if (!crianca_id || !tipo_conferencia) {
    return ctx.body = error('ID da Criança e Tipo de Conferência são obrigatórios.', 400);
  }

  // Validar tipo_conferencia
  const tiposValidos = ['embarque_ida', 'desembarque_ida', 'embarque_volta', 'desembarque_volta'];
  if (!tiposValidos.includes(tipo_conferencia)) {
    return ctx.body = error('Tipo de conferência inválido.', 400);
  }
  
  try {
    const result = await db.query(
      'INSERT INTO conferencia_criancas (viagem_id, crianca_id, tipo_conferencia, latitude, longitude, responsavel_conferencia_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [viagem_id, crianca_id, tipo_conferencia, latitude, longitude, responsavel_conferencia_id]
    );

    // TODO: Disparar notificação para os pais aqui

    return ctx.body = success(result.rows[0], 'Conferência registrada com sucesso!');
  } catch (err) {
    console.error('Erro ao registrar conferência:', err);
    return ctx.body = error('Erro interno ao registrar a conferência.', 500);
  }
});

/**
 * Obtém todas as viagens ativas para o motorista logado
 * GET /api/viagens/ativas
 */
router.get('/ativas', async (ctx) => {
  const usuario_id = ctx.state.user.id;
  try {
    const result = await db.query(
      'SELECT v.*, r.nome_rota FROM viagens_ativas v JOIN rotas_escolares r ON v.rota_id = r.id WHERE v.usuario_id = $1 AND v.status = $2',
      [usuario_id, 'em_andamento']
    );
    return ctx.body = success(result.rows);
  } catch (err) {
    console.error('Erro ao buscar viagens ativas:', err);
    return ctx.body = error('Erro interno ao buscar viagens ativas.', 500);
  }
});

/**
 * Obtém detalhes de uma viagem específica, incluindo conferências
 * GET /api/viagens/:id
 */
router.get('/:id', async (ctx) => {
  const viagem_id = parseInt(ctx.params.id);
  const usuario_id = ctx.state.user.id;
  try {
    // Obter dados da viagem
    const viagemResult = await db.query(
      'SELECT v.*, r.nome_rota FROM viagens_ativas v JOIN rotas_escolares r ON v.rota_id = r.id WHERE v.id = $1 AND v.usuario_id = $2',
      [viagem_id, usuario_id]
    );

    if (viagemResult.rows.length === 0) {
      return ctx.body = error('Viagem não encontrada ou não pertence a este motorista.', 404);
    }

    // Obter dados das conferências
    const conferenciasResult = await db.query(
      'SELECT cc.*, c.nome_completo as nome_crianca FROM conferencia_criancas cc JOIN criancas c ON cc.crianca_id = c.id WHERE cc.viagem_id = $1 ORDER BY cc.horario ASC',
      [viagem_id]
    );

    const viagem = viagemResult.rows[0];
    viagem.conferencias = conferenciasResult.rows;

    return ctx.body = success(viagem);
  } catch (err) {
    console.error('Erro ao buscar detalhes da viagem:', err);
    return ctx.body = error('Erro interno ao buscar detalhes da viagem.', 500);
  }
});

module.exports = router;
