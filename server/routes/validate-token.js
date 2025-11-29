const Router = require('koa-router');
const { verifyToken } = require('../middleware/auth-utils');
const logger = require('../utils/logger');

const router = new Router();

/**
 * POST /api/validate-token
 * Body: none
 * Headers: Authorization: Bearer <token>
 * Response: { valid: boolean, user?: { id, email, tipo, nome } }
 */
router.post('/validate-token', async (ctx) => {
  try {
    logger.info('[VALIDATE-TOKEN] Requisição recebida');
    const rawAuth = ctx.headers.authorization || '';
    logger.info('[VALIDATE-TOKEN] Authorization header length:', rawAuth.length);
    const authHeader = ctx.headers.authorization || '';
    if (!authHeader) {
      ctx.status = 401;
      ctx.body = { valid: false };
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      ctx.status = 401;
      ctx.body = { valid: false };
      return;
    }

    // dev/demo token shortcut (keeps previous behavior and supports DEMO_MODE)
    const isDemo = process.env.DEMO_MODE === 'true';
    if ((token === 'dev_token_responsavel_teste' && process.env.NODE_ENV !== 'production') || (token === 'demo_token_responsavel' && isDemo)) {
      ctx.body = { valid: true, user: { id: 1, email: 'ana.responsavel@teste.kanghoo.com', tipo: 'responsavel', nome: 'Responsável Teste' } };
      return;
    }

    // verify JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      logger.info('[VALIDATE-TOKEN] Token inválido:', err.message);
      ctx.status = 401;
      ctx.body = { valid: false };
      return;
    }

    const user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      tipo: decoded.tipo,
      nome: decoded.nome || decoded.nomeCompleto || decoded.nome_completo
    };

    ctx.body = { valid: true, user };
  } catch (error) {
    logger.error('[VALIDATE-TOKEN] Erro ao validar token', error);
    ctx.status = 500;
    ctx.body = { valid: false };
  }
});

module.exports = router;
