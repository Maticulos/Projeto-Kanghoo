const Koa = require('koa');
const path = require('path');
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

// CORS (pode ser refinado por env)
app.use(cors({ origin: '*', allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'], allowHeaders: ['Content-Type','Authorization','Accept'], credentials: true }));

// Estáticos
app.use(serve(path.join(__dirname, '../frontend/public')));
app.use(serve(path.join(__dirname, '../frontend')));

// Body + JSON pretty (dev)
app.use(bodyParser());
app.use(json());

// Rate limiting (no-op se Redis não configurado)
if (securityMiddleware && securityMiddleware.generalRateLimit) {
  app.use(securityMiddleware.generalRateLimit());
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

// Job diário de limpeza de uploads (24h)
const DAY_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  try { cleanupOldFiles(24); } catch(e) { /* noop */ }
}, DAY_MS);

module.exports = app;
