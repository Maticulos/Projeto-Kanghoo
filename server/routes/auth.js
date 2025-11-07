const Router = require('koa-router');
let securityMiddleware;
try {
  securityMiddleware = require('../middleware/security-middleware');
} catch (_) {
  securityMiddleware = null;
}
const { login } = require('../controllers/auth.controller');

const router = new Router();

// Rate limit específico de login, quando disponível
if (securityMiddleware && securityMiddleware.loginRateLimit) {
  router.post('/login', securityMiddleware.loginRateLimit(), login);
} else {
  router.post('/login', login);
}

module.exports = router;

