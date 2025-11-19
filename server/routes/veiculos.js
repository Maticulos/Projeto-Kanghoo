const Router = require('koa-router');
const db = require('../config/db');
const { success, error } = require('../utils/api-response');
const { authenticateToken } = require('../middleware/auth-utils');

const router = new Router({ prefix: '/api/veiculos' });

// Aplica autenticação a todas as rotas de veículos
router.use(authenticateToken);

/**
 * Obtém todos os veículos para o motorista logado
 * GET /api/veiculos/motorista
 */
router.get('/motorista', async (ctx) => {
  const motorista_id = ctx.state.user.id;
  try {
    const result = await db.query(
      'SELECT * FROM veiculos WHERE motorista_id = $1 ORDER BY placa',
      [motorista_id]
    );
    return ctx.body = success(result.rows);
  } catch (err) {
    console.error('Erro ao buscar veículos do motorista:', err);
    return ctx.body = error('Erro interno ao buscar veículos.', 500);
  }
});

module.exports = router;
