const Router = require('koa-router');
const { DEMO_MODE, API_BASE_PATH } = require('../config/app-config');

const router = new Router();

// Retorna JSON de configuração
router.get('/config', (ctx) => {
  ctx.body = {
    success: true,
    data: {
      demoMode: DEMO_MODE,
      apiBasePath: API_BASE_PATH
    }
  };
});

// Retorna configuração em formato JS para ser incluída direto no frontend
router.get('/config.js', (ctx) => {
  ctx.type = 'application/javascript';
  ctx.body = `window.APP_CONFIG = window.APP_CONFIG || {}; window.APP_CONFIG.demoMode = ${DEMO_MODE}; window.APP_CONFIG.apiBasePath = '${API_BASE_PATH}';`;
});

module.exports = router;
