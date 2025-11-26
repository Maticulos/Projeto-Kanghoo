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
const FRONTEND_STATIC_DIR = process.env.FRONTEND_STATIC_PATH || path.resolve(__dirname, '..', 'frontend', 'public');
const SERVER_PUBLIC_DIR = path.resolve(__dirname, 'public');
const STATIC_MAX_AGE = parseInt(process.env.STATIC_MAX_AGE || '0', 10);

// Erros primeiro
app.use(errorHandler);

// Security headers via Helmet (fallback para headers manuais)
if (securityMiddleware && securityMiddleware.securityHeaders) {
  const headersMiddleware = securityMiddleware.securityHeaders();
  // Verificar se retornou uma funÃ§Ã£o vÃ¡lida (nÃ£o null)
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

// CompressÃ£o
app.use(compress({
  filter(ct) { return /text|javascript|json|xml|svg/.test(ct); },
  threshold: 1024,
  br: false
}));

// CORS por ambiente (restrito em produÃ§Ã£o)
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
    // Em produÃ§Ã£o SEM CORS_ORIGINS configurado, usar lista padrÃ£o restritiva
    logger.warn('âš ï¸  CORS_ORIGINS nÃ£o configurado em produÃ§Ã£o. Usando lista padrÃ£o restritiva.');
    origins = [
      'https://kanghoo.com',
      'https://www.kanghoo.com'
    ];
    // Se estivermos em modo demo, permitir tambÃ©m localhost para apresentaÃ§Ãµes locais
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
    
    // Em desenvolvimento, sempre permitir (incluindo requisiÃ§Ãµes sem origem)
    // TambÃ©m permitir em modo demo quando explicitamente habilitado
    if (!isProd || isDemo) {
      // Se nÃ£o hÃ¡ origem (requisiÃ§Ã£o direta do navegador), permitir
      if (!reqOrigin || reqOrigin === '') {
        return '*';
      }
      // Permitir se estiver na lista ou se for localhost
      if (origins.includes('*') || origins.includes(reqOrigin) || 
          (reqOrigin && (reqOrigin.includes('localhost') || reqOrigin.includes('127.0.0.1')))) {
        return reqOrigin;
      }
      // Em desenvolvimento, permitir por padrÃ£o
      return '*';
    }
    
    // Em produÃ§Ã£o, validar origem
    if (reqOrigin && origins.includes(reqOrigin)) {
      return reqOrigin;
    }
    
    // Bloquear se nÃ£o estiver na lista (apenas em produÃ§Ã£o)
    if (isProd && reqOrigin) {
      logger.warn(`CORS bloqueado para origem: ${reqOrigin}`, {
        ip: ctx.ip,
        path: ctx.path
      });
      return null; // Bloqueia
    }
    
    // Em produÃ§Ã£o sem origem, nÃ£o permitir
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

// Servir arquivos estaticos
[
  { dir: SERVER_PUBLIC_DIR, label: 'server/public' },
  { dir: FRONTEND_STATIC_DIR, label: 'frontend/public' }
].forEach(({ dir, label }) => {
  if (fs.existsSync(dir)) {
    logger.info(`[STATIC] Servindo arquivos de ${label} em ${dir}`);
    app.use(serve(dir, {
      maxage: Number.isFinite(STATIC_MAX_AGE) ? STATIC_MAX_AGE : 0,
      gzip: true,
      brotli: false
    }));
  } else {
    logger.warn(`[STATIC] Caminho ${dir} nao encontrado (label=${label})`);
  }
});


// Health check bÃ¡sico
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

// Tratamento de rotas nÃ£o encontradas (404) - removido, agora tratado no errorHandler

// Endpoint de mÃ©tricas Prometheus (se prom-client disponÃ­vel)
try {
  const metrics = require('./utils/metrics');
  const metricsRouter = new Router();
  metricsRouter.get('/metrics', async (ctx) => {
    ctx.set('Content-Type', metrics.contentType);
    ctx.body = await metrics.getMetrics();
  });
  app.use(metricsRouter.routes());
} catch (_err) {
  // prom-client nÃ£o instalado; ignorar
}


// Fallback para servir index.html em rotas nao API
const INDEX_HTML_PATH = path.join(FRONTEND_STATIC_DIR, 'index.html');
if (fs.existsSync(INDEX_HTML_PATH)) {
  app.use(async (ctx, next) => {
    await next();
    const isApiRoute = ctx.path.startsWith('/api') || ctx.path.startsWith('/metrics') || ctx.path.startsWith('/ws');
    const hasExtension = Boolean(path.extname(ctx.path));
    if (ctx.status === 404 && ctx.method === 'GET' && !isApiRoute && !hasExtension) {
      ctx.type = 'html';
      ctx.status = 200;
      ctx.body = fs.createReadStream(INDEX_HTML_PATH);
    }
  });
} else {
  logger.warn(`[STATIC] index.html nao encontrado em ${INDEX_HTML_PATH}`);
}

// Job diÃ¡rio de limpeza de uploads (24h)
const DAY_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  try { cleanupOldFiles(24); } catch(e) { /* noop */ }
}, DAY_MS);

module.exports = app;

