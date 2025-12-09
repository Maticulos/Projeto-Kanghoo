const KoaRouter = require('koa-router');
const db = require('../config/db');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth-utils');
const { validate } = require('../middleware/validation');
const { success, error, send } = require('../utils/api-response');
const { getFirstChild, getChildById, updateChild } = require('../controllers/responsavel.controller');

const router = new KoaRouter({ prefix: '/responsavel' });

// Health/test
router.get('/test', async (ctx) => send(ctx, success(null, 'API do responsável funcionando')));

// Primeira criança do responsável
router.get('/crianca', authenticateToken, requireRole('responsavel'), getFirstChild);

// Listar todas as crianças do responsável
router.get('/criancas', authenticateToken, requireRole('responsavel'), async (ctx) => {
  try {
    const res = await db.query(
      'SELECT id, nome_completo FROM criancas WHERE responsavel_id = $1 ORDER BY criado_em DESC',
      [ctx.user.id]
    );
    return send(ctx, success(res.rows, 'Lista de crianças do responsável'));
  } catch (err) {
    logger.error('Erro ao listar crianças do responsável:', err);
    ctx.status = 500;
    return send(ctx, error('Erro interno do servidor', 500));
  }
});

// Detalhes de uma criança específica
router.get('/criancas/:id', authenticateToken, requireRole('responsavel'), getChildById);

// Atualizar informações de uma criança
const updateSchema = {
  endereco_residencial: { required: true, minLength: 5, maxLength: 200 },
  escola: { required: true, minLength: 2, maxLength: 100 },
  endereco_escola: { required: true, minLength: 5, maxLength: 200 }
};
router.put('/criancas/:id', authenticateToken, requireRole('responsavel'), validate(updateSchema), updateChild);

// Localização atual da criança (se em viagem)
router.get('/criancas/:id/localizacao', authenticateToken, requireRole('responsavel'), async (ctx) => {
  try {
    const responsavelId = ctx.user.id;
    const criancaId = parseInt(ctx.params.id, 10);

    if (!Number.isFinite(criancaId) || criancaId <= 0) {
      ctx.status = 400;
      return send(ctx, error('ID da criança inválido', 400));
    }

    // Verificar se a criança pertence ao responsável
    const criancaExistente = await db.query(
      'SELECT id FROM criancas WHERE id = $1 AND responsavel_id = $2',
      [criancaId, responsavelId]
    );

    if (criancaExistente.rows.length === 0) {
      ctx.status = 404;
      return send(ctx, error('Criança não encontrada', 404));
    }

    // Buscar viagem ativa
    const viagemAtiva = await db.query(
      `SELECT 
          v.id,
          v.data_viagem,
          v.horario_inicio,
          v.tipo_viagem,
          v.status,
          r.nome_rota as nome_rota,
          u.nome_completo as nome_motorista,
          l.latitude,
          l.longitude,
          l.timestamp as ultima_localizacao
        FROM viagens v
        JOIN rotas r ON v.rota_id = r.id
        JOIN usuarios u ON v.motorista_id = u.id
        JOIN criancas_viagens cv ON v.id = cv.viagem_id
        LEFT JOIN localizacoes l ON v.id = l.viagem_id
        WHERE cv.crianca_id = $1 
          AND v.status IN ('em_andamento', 'iniciada')
          AND v.data_viagem = CURRENT_DATE
        ORDER BY l.timestamp DESC
        LIMIT 1`,
      [criancaId]
    );

    if (viagemAtiva.rows.length === 0) {
      return send(ctx, success({ em_viagem: false }, 'Criança não está em viagem no momento'));
    }

    return send(ctx, success({ em_viagem: true, viagem: viagemAtiva.rows[0] }));
  } catch (err) {
    logger.error('Erro ao buscar localização da criança:', err);
    ctx.status = 500;
    return send(ctx, error('Erro interno do servidor', 500));
  }
});

module.exports = router;

