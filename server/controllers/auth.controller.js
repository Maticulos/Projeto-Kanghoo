const bcrypt = require('bcrypt');
const db = require('../config/db');
const logger = require('../utils/logger');
const { validationError, success, send } = require('../utils/api-response');
const { validateLoginData, JWT_SECRET } = require('../config/security-config');
const { generateToken } = require('../middleware/auth-utils');

async function login(ctx) {
  try {
    const data = ctx.request.body || {};

    const validation = validateLoginData(data);
    if (!validation.isValid) {
      ctx.status = 422;
      return send(ctx, validationError(validation.errors, 'Dados de login inválidos'));
    }

    const { email, senha } = validation.sanitizedData;
    const userRes = await db.query('SELECT id, email, nome_completo, tipo_usuario, senha FROM usuarios WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
    if (userRes.rows.length === 0) {
      ctx.status = 401;
      return send(ctx, validationError(['Credenciais inválidas'], 'Falha na autenticação'));
    }
    const user = userRes.rows[0];

    let ok = false;
    try {
      ok = await bcrypt.compare(senha, user.senha);
    } catch (error) {
      logger.warn('Erro ao comparar senha com bcrypt:', error.message);
      ok = false;
    }

    // Removido fallback de senha em texto plano por questões de segurança
    // Todas as senhas devem estar hasheadas no banco de dados
    if (!ok) {
      ctx.status = 401;
      return send(ctx, validationError(['Credenciais inválidas'], 'Falha na autenticação'));
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      tipo: user.tipo_usuario,
      nome: user.nome_completo
    }, process.env.JWT_EXPIRES_IN || '2h');

    return send(ctx, success({ token, user: { id: user.id, email: user.email, nome: user.nome_completo, tipo: user.tipo_usuario } }, 'Autenticado com sucesso'));
  } catch (error) {
    logger.error('Erro no login:', error);
    ctx.status = 500;
    return send(ctx, { statusCode: 500, success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { login };
