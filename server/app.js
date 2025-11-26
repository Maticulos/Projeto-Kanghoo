const Koa = require('koa');
const path = require('path');
const fs = require('fs');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const json = require('koa-json');
const cors = require('@koa/cors');
const compress = require('koa-compress');
const Router = require('koa-router');

const { errorHandler } = require('./utils/api-response');
let securityMiddleware = null;
try {
  securityMiddleware = require('./middleware/security-middleware');
} catch (e) {
  // fallback sem helmet
  securityMiddleware = null;
}
const { getSecurityHeaders } = require('./config/security-config');
const logger = require('./utils/logger');

const mountRoutes = require('./routes');
const { cleanupOldFiles } = require('./middleware/upload-security');

const app = new Koa();

// Erros primeiro
app.use(errorHandler);

// Security headers via Helmet (fallback para headers manuais)
if (securityMiddleware && securityMiddleware.securityHeaders) {
  const headersMiddleware = securityMiddleware.securityHeaders();
  // Verificar se retornou uma função válida (não null)
  if (typeof headersMiddleware === 'function') {
    app.use(headersMiddleware);
  } else {
    // Usar fallback de headers manuais
    app.use(async (ctx, next) => {
      const headers = getSecurityHeaders();
      Object.entries(headers).forEach(([k, v]) => ctx.set(k, v));
      ctx.remove('X-Powered-By');
      await next();
    });
  }
} else {
  app.use(async (ctx, next) => {
    const headers = getSecurityHeaders();
    Object.entries(headers).forEach(([k, v]) => ctx.set(k, v));
    ctx.remove('X-Powered-By');
    await next();
  });
}

// Compressão
app.use(compress({
  filter(ct) { return /text|javascript|json|xml|svg/.test(ct); },
  threshold: 1024,
  br: false
}));

// CORS por ambiente (restrito em produção)
function buildCorsOptions() {
  // Detectar ambiente de forma mais robusta
  const isProd = process.env.NODE_ENV === 'production' || 
                 process.env.NODE_ENV === 'prod' ||
                 process.env.ENVIRONMENT === 'production';
  
  const fromEnv = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '').trim();
  const isDemo = process.env.DEMO_MODE === 'true';
  
  let origins;
  if (fromEnv) {
    origins = fromEnv.split(',').map(s => s.trim()).filter(Boolean);
  } else if (isProd) {
    // Em produção SEM CORS_ORIGINS configurado, usar lista padrão restritiva
    logger.warn('⚠️  CORS_ORIGINS não configurado em produção. Usando lista padrão restritiva.');
    origins = [
      'https://kanghoo.com',
      'https://www.kanghoo.com'
    ];
    // Se estivermos em modo demo, permitir também localhost para apresentações locais
    if (isDemo) {
      origins.push('http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001');
      logger.info('DEMO_MODE ativo: habilitando origens localhost para CORS');
    }
  } else {
    // Desenvolvimento: permitir localhost e IPs locais
    origins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5000'
    ];
  }

  const originFn = (ctx) => {
    const reqOrigin = ctx.get('Origin') || '';
    
    // Em desenvolvimento, sempre permitir (incluindo requisições sem origem)
    // Também permitir em modo demo quando explicitamente habilitado
    if (!isProd || isDemo) {
      // Se não há origem (requisição direta do navegador), permitir
      if (!reqOrigin || reqOrigin === '') {
        return '*';
      }
      // Permitir se estiver na lista ou se for localhost
      if (origins.includes('*') || origins.includes(reqOrigin) || 
          (reqOrigin && (reqOrigin.includes('localhost') || reqOrigin.includes('127.0.0.1')))) {
        return reqOrigin;
      }
      // Em desenvolvimento, permitir por padrão
      return '*';
    }
    
    // Em produção, validar origem
    if (reqOrigin && origins.includes(reqOrigin)) {
      return reqOrigin;
    }
    
    // Bloquear se não estiver na lista (apenas em produção)
    if (isProd && reqOrigin) {
      logger.warn(`CORS bloqueado para origem: ${reqOrigin}`, {
        ip: ctx.ip,
        path: ctx.path
      });
      return null; // Bloqueia
    }
    
    // Em produção sem origem, não permitir
    return null;
  };

  return {
    origin: originFn,
    allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowHeaders: ['Content-Type','Authorization','Accept'],
    credentials: true,
    maxAge: 86400 // 24 horas
  };
}

app.use(cors(buildCorsOptions()));

<<<<<<< HEAD
=======
// Estáticos
const staticCandidates = [
  path.join(__dirname, '../frontend/public'),
  path.join(__dirname, '../frontend'),
  path.join(__dirname, './frontend/public'),
  path.join(__dirname, './frontend'),
  path.join(__dirname, './public'),
  '/app/frontend/public', // Docker path
  '/app/frontend',
];

staticCandidates.forEach((dir) => {
  if (fs.existsSync(dir)) {
    logger.info(`Serving static files from: ${dir}`);
    app.use(serve(dir, {
      maxage: process.env.NODE_ENV === 'production' ? 1000 * 60 * 60 * 24 * 7 : 0, // 7 days cache in production
      gzip: true,
      brotli: true
    }));
  }
});

>>>>>>> 7e3033439b6ddb76a0413d080f32ee1cb52d2502
// Body + JSON pretty (dev)
app.use(bodyParser());
app.use(json());

// Rate limiting (no-op se Redis não configurado)
if (securityMiddleware && securityMiddleware.generalRateLimit) {
  app.use(securityMiddleware.generalRateLimit());
}

// Rate limiting específico para API (apenas /api/*)
if (securityMiddleware && securityMiddleware.apiRateLimit) {
  const apiLimiter = securityMiddleware.apiRateLimit();
  app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/api/')) {
      return apiLimiter(ctx, next);
    }
    return next();
  });
}

// Rota raiz - servir frontend por padrão, API apenas se solicitado explicitamente
app.use(async (ctx, next) => {
  // Interceptar apenas GET / se for uma requisição de API explícita
  if (ctx.path === '/' && ctx.method === 'GET') {
    const acceptHeader = ctx.get('Accept') || '';
    // Verificar se é uma requisição de API (query params ou Accept header específico)
    const isApiRequest = ctx.query.format === 'json' ||
                         ctx.query.api === 'true' ||
                         (acceptHeader.includes('application/json') && !acceptHeader.includes('text/html'));
    
    if (isApiRequest) {
      ctx.body = {
        success: true,
        message: 'API do Sistema de Transporte Escolar',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth/login',
          publicTransportes: '/api/public/transportes',
          docs: 'Consulte a documentação da API'
        },
        timestamp: new Date().toISOString()
      };
      ctx.type = 'application/json';
      return;
    }
    // Caso contrário, continuar para servir o frontend (index.html)
  }
  await next();
});

// Estáticos - DEPOIS da rota raiz
const staticCandidates = [
  path.join(__dirname, '../frontend/public'),
  path.join(__dirname, '../frontend'),
  path.join(__dirname, './frontend/public'),
  path.join(__dirname, './frontend'),
  path.join(__dirname, './public'),
];

// Encontrar o diretório do frontend
let frontendDir = null;
for (const dir of staticCandidates) {
  if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
    frontendDir = dir;
    break;
  }
}

// Servir arquivos estáticos
if (frontendDir) {
  app.use(serve(frontendDir, {
    index: 'index.html',
    defer: false
  }));
  
  // Middleware para servir index.html em rotas não encontradas (SPA fallback)
  app.use(async (ctx, next) => {
    await next();
    
    // Se não encontrou arquivo e não é uma rota de API, servir index.html
    if (ctx.status === 404 && !ctx.path.startsWith('/api')) {
      const indexPath = path.join(frontendDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        ctx.type = 'text/html';
        ctx.body = fs.createReadStream(indexPath);
        ctx.status = 200;
      }
    }
  });
} else {
  logger.warn('⚠️  Diretório do frontend não encontrado. Arquivos estáticos não serão servidos.');
}

// Health check básico
const health = new Router();
health.get('/api/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  };
});
app.use(health.routes());

// Montar sub-rotas existentes
const rootRouter = mountRoutes();
app.use(rootRouter.routes()).use(rootRouter.allowedMethods());

// Tratamento de rotas não encontradas (404) - removido, agora tratado no errorHandler

// Endpoint de métricas Prometheus (se prom-client disponível)
try {
  const metrics = require('./utils/metrics');
  const metricsRouter = new Router();
  metricsRouter.get('/metrics', async (ctx) => {
    ctx.set('Content-Type', metrics.contentType);
    ctx.body = await metrics.getMetrics();
  });
  app.use(metricsRouter.routes());
} catch (_err) {
  // prom-client não instalado; ignorar
}

// Job diário de limpeza de uploads (24h)
const DAY_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  try { cleanupOldFiles(24); } catch(e) { /* noop */ }
}, DAY_MS);

module.exports = app;
