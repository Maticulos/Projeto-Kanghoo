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
    const userRes = await db.query('SELECT id, email, nome, tipo_usuario, senha FROM usuarios WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
    if (userRes.rows.length === 0) {
      ctx.status = 401;
      return send(ctx, validationError(['Credenciais inválidas'], 'Falha na autenticação'));
    }
    const user = userRes.rows[0];
    // Allow demo login when DEMO_MODE=true for specific demo accounts
    const isDemo = process.env.DEMO_MODE === 'true';
    const demoAllowedEmails = (process.env.DEMO_ALLOWED_EMAILS || 'ana.responsavel@teste.kanghoo.com').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    let ok = false;
    if (isDemo && demoAllowedEmails.includes((email || '').toLowerCase())) {
      // In demo mode allow login for configured demo accounts without password check
      logger.info(`DEMO_MODE login for ${email} - skipping password check`);
      ok = true;
    } else {
      try {
        ok = await bcrypt.compare(senha, user.senha);
      } catch (error) {
        logger.warn('Erro ao comparar senha com bcrypt:', error.message);
        ok = false;
      }
    }

    // All real logins require bcrypt verification
    if (!ok) {
      ctx.status = 401;
      return send(ctx, validationError(['Credenciais inválidas'], 'Falha na autenticação'));
    }

<<<<<<< HEAD
    // In demo mode, optionally return a fixed demo token to simplify front-end demos
    let token;
    if (isDemo) {
      token = process.env.DEMO_TOKEN_RESPONSAVEL || 'demo_token_responsavel';
      logger.info(`Returning DEMO token for ${email}`);
    } else {
      token = generateToken({
        userId: user.id,
        email: user.email,
        tipo: user.tipo_usuario,
        nome: user.nome_completo
      }, process.env.JWT_EXPIRES_IN || '2h');
    }

    // Also set token as an HttpOnly cookie to simplify demo clients that prefer cookies
    try {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      };
      ctx.cookies.set('authToken', token, cookieOptions);
    } catch (err) {
      logger.warn('Não foi possível setar cookie de autenticação:', err && err.message);
    }
=======
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tipo: user.tipo_usuario,
      nome: user.nome
    }, process.env.JWT_EXPIRES_IN || '2h');
>>>>>>> 7e3033439b6ddb76a0413d080f32ee1cb52d2502

    return send(ctx, success({ token, user: { id: user.id, email: user.email, nome: user.nome, tipo: user.tipo_usuario } }, 'Autenticado com sucesso'));
  } catch (error) {
    logger.error('Erro no login:', error);
    ctx.status = 500;
    return send(ctx, { statusCode: 500, success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { login };
