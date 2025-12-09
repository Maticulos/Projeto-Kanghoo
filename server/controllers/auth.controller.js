const bcrypt = require('bcrypt');
const db = require('../config/db');
const logger = require('../utils/logger');
const { validationError, success, send } = require('../utils/api-response');
const { validateLoginData, JWT_SECRET } = require('../config/security-config');
const { generateToken } = require('../middleware/auth-utils');

async function login(ctx) {
  try {
    const data = ctx.request.body || {};
    
    logger.info('=== TENTATIVA DE LOGIN ===');
    logger.info('Body recebido:', JSON.stringify(data));
    logger.info('Headers:', JSON.stringify(ctx.request.headers));

    const validation = validateLoginData(data);
    
    logger.info('Resultado da validação:', JSON.stringify({ isValid: validation.isValid, errors: validation.errors }));
    
    if (!validation.isValid) {
      ctx.status = 422;
      logger.warn('Login rejeitado - validação falhou:', validation.errors);
      return send(ctx, validationError(validation.errors, 'Dados de login inválidos'));
    }

    const { email, senha } = validation.sanitizedData;
    
    // Criar pool direto (workaround para problema de conexão)
    const { Pool } = require('pg');
    const directPool = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'kanghoo_db_prod',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: false
    });
    
    let userRes;
    try {
      userRes = await directPool.query('SELECT id, email, nome_completo as nome, tipo_usuario, senha FROM usuarios WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
    } finally {
      await directPool.end();
    }
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
      ok = true;
    } else if (user) {
      try {
        ok = await bcrypt.compare(senha, user.senha);
      } catch (error) {
        logger.warn('Erro ao comparar senha com bcrypt:', error.message);
        ok = false;
      }
    }

    if (!ok) {
      ctx.status = 401;
      return send(ctx, validationError(['Credenciais inválidas'], 'Falha na autenticação'));
    }

    let token;
    if (isDemo) {
      token = process.env.DEMO_TOKEN_RESPONSAVEL || 'demo_token_responsavel';
      logger.info('Returning DEMO token for ' + email);
    } else {
      token = generateToken({
        userId: user.id,
        email: user.email,
        tipo: user.tipo_usuario,
        nome: user.nome_completo || user.nome
      }, process.env.JWT_EXPIRES_IN || '2h');
    }

    try {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      };
      ctx.cookies.set('authToken', token, cookieOptions);
    } catch (err) {
      logger.warn('Nao foi possivel setar cookie de autenticacao:', err && err.message);
    }

    return send(ctx, success({ token, user: { id: user.id, email: user.email, nome: user.nome_completo || user.nome, tipo: user.tipo_usuario } }, 'Autenticado com sucesso'))
  } catch (error) {
    logger.error('Erro no login:', error);
    ctx.status = 500;
    return send(ctx, { statusCode: 500, success: false, message: 'Erro interno do servidor' });
  }
}

module.exports = { login };





