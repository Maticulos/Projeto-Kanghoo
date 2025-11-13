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
  app.use(securityMiddleware.securityHeaders());
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
  const isProd = process.env.NODE_ENV === 'production';
  // Permite lista separada por vírgula, ou único domínio
  const fromEnv = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '').trim();
  const origins = fromEnv
    ? fromEnv.split(',').map(s => s.trim()).filter(Boolean)
    : (isProd ? [] : ['*']);

  const originFn = (ctx) => {
    if (!isProd) return '*';
    const reqOrigin = ctx.get('Origin');
    if (origins.includes(reqOrigin)) return reqOrigin;
    return ''; // bloqueia se não estiver na lista
  };

  return {
    origin: originFn,
    allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowHeaders: ['Content-Type','Authorization','Accept'],
    credentials: true
  };
}

app.use(cors(buildCorsOptions()));

// Estáticos
const staticCandidates = [
  path.join(__dirname, '../frontend/public'),
  path.join(__dirname, '../frontend'),
  path.join(__dirname, './frontend/public'),
  path.join(__dirname, './frontend'),
  path.join(__dirname, './public'),
];

staticCandidates.forEach((dir) => {
  if (fs.existsSync(dir)) {
    app.use(serve(dir));
  }
});

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
