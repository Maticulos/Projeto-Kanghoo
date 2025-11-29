const Router = require('koa-router');
let securityMiddleware;
try {
  securityMiddleware = require('../middleware/security-middleware');
} catch (_) {
  securityMiddleware = null;
}
const { login } = require('../controllers/auth.controller');

const router = new Router();

// Rate limit desabilitado temporariamente para testes
router.post('/login', login);

module.exports = router;

