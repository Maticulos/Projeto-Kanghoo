/**
 * AVISO: Rota /admin/dev-tools APENAS para DEV/TESTE. Não use em produção.
 */
const Router = require('koa-router');
const db = require('../config/db');
const { authenticateToken, requireRole, generateToken } = require('../middleware/auth-utils');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
let blockedUsers = new Set(); // simulação em memória

const TEST_EMAILS = new Set([
  'dashboard.test@example.com',
  'perfil.test@example.com',
  'financeiro.test@example.com',
  'relatorios.test@example.com',
  'config.test@example.com',
  'admin.test@example.com',
  'dev.test@example.com'
]);

const router = new Router({ prefix: '/admin/dev-tools' });

// Protegido: admin ou developer
router.use(authenticateToken);
router.use(requireRole(['admin', 'developer']));

router.get('/users', async (ctx) => {
  const res = await db.query("SELECT id, nome_completo, email, tipo_usuario FROM usuarios ORDER BY id ASC");
  const users = res.rows.filter(u => TEST_EMAILS.has(u.email));
  ctx.body = { success: true, users: users.map(u => ({ ...u, blocked: blockedUsers.has(u.id) })) };
});

router.post('/impersonate', async (ctx) => {
  const { user_id } = ctx.request.body || {};
  const res = await db.query('SELECT id, email, nome_completo, tipo_usuario FROM usuarios WHERE id=$1', [user_id]);
  if (res.rowCount === 0) return ctx.throw(404, 'Usuário não encontrado');
  if (blockedUsers.has(user_id)) return ctx.throw(403, 'Usuário bloqueado');
  const u = res.rows[0];
  const token = generateToken({ userId: u.id, email: u.email, nome: u.nome_completo, tipo: u.tipo_usuario }, '2h');
  ctx.body = { success: true, token };
});

router.post('/reset-password', async (ctx) => {
  const { user_id, new_password } = ctx.request.body || {};
  const hash = await bcrypt.hash(new_password || 'Test@1234', 10);
  const upd = await db.query('UPDATE usuarios SET senha=$1 WHERE id=$2 RETURNING id, email', [hash, user_id]);
  if (upd.rowCount === 0) return ctx.throw(404, 'Usuário não encontrado');
  ctx.body = { success: true };
});

router.post('/block', async (ctx) => {
  const { user_id } = ctx.request.body || {};
  blockedUsers.add(user_id);
  ctx.body = { success: true };
});

router.post('/unblock', async (ctx) => {
  const { user_id } = ctx.request.body || {};
  blockedUsers.delete(user_id);
  ctx.body = { success: true };
});

// Reset e seed do banco
router.post('/reset-db', async (ctx) => {
  const { resetAndSeed } = require('../scripts/seed-test-data');
  await resetAndSeed();
  ctx.body = { success: true };
});

// Limpar caches
router.post('/clear-cache', async (ctx) => {
  try {
    const maps = require('../utils/google-maps-service');
    if (maps && maps.cache && maps.cache.clear) maps.cache.clear();
  } catch (_) {}
  try {
    const tracking = require('../utils/tracking-persistence');
    if (tracking && tracking.cache && tracking.cache.clear) tracking.cache.clear();
  } catch (_) {}
  ctx.body = { success: true };
});

// Ativar plano para um usuário (DEV ONLY)
router.post('/plan/activate', async (ctx) => {
  try {
    const { user_id, tipo_plano, preco_mensal } = ctx.request.body || {};
    if (!user_id || !tipo_plano) return ctx.throw(400, 'user_id e tipo_plano são obrigatórios');

    // Garantir que a tabela exista (ambiente de DEV/teste)
    await db.query(`
      CREATE TABLE IF NOT EXISTS planos_assinatura (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo_plano VARCHAR(50) NOT NULL,
        limite_rotas INTEGER NOT NULL,
        limite_usuarios INTEGER NOT NULL,
        preco_mensal DECIMAL(10,2) DEFAULT 0,
        data_inicio TIMESTAMP WITH TIME ZONE,
        data_fim TIMESTAMP WITH TIME ZONE,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_planos_usuario ON planos_assinatura(usuario_id)`);

    // Limites por tipo
    let limite_rotas, limite_usuarios, preco_padrao;
    switch (String(tipo_plano)) {
      case 'basico':
        limite_rotas = 3; limite_usuarios = 15; preco_padrao = 0; break;
      case 'premium':
        limite_rotas = 10; limite_usuarios = 50; preco_padrao = 29.90; break;
      case 'empresarial':
        limite_rotas = -1; limite_usuarios = -1; preco_padrao = 99.90; break;
      default:
        return ctx.throw(400, 'tipo_plano inválido');
    }
    const precoFinal = (preco_mensal !== undefined && preco_mensal !== null) ? preco_mensal : preco_padrao;

    await db.query('BEGIN');
    try {
      await db.query(`UPDATE planos_assinatura SET ativo=false, data_fim=NOW(), atualizado_em=NOW() WHERE usuario_id=$1 AND ativo=true`, [user_id]);
      const ins = await db.query(`
        INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios, preco_mensal, data_inicio, ativo)
        VALUES ($1,$2,$3,$4,$5,NOW(),true) RETURNING id
      `, [user_id, tipo_plano, limite_rotas, limite_usuarios, precoFinal]);
      await db.query('COMMIT');
      ctx.body = { success: true, plano_id: ins.rows[0].id, tipo_plano };
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }
  } catch (err) {
    logger.error('DEV-TOOLS plan/activate error:', err);
    ctx.status = 500;
    ctx.body = { success: false, message: 'Erro ao ativar plano' };
  }
});

module.exports = router;
