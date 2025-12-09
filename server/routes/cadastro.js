const Router = require('koa-router');
const { cadastrar } = require('../controllers/cadastro.controller');
const { createSecureUpload } = require('../middleware/upload-security');

const router = new Router({ prefix: '/cadastro' });

// Configuração de upload para documentos
const upload = createSecureUpload('documents', { maxFiles: 5 });

// Rota de cadastro
// Aceita multipart/form-data para arquivos e campos de texto
router.post('/cadastrar', upload.any(), cadastrar);

module.exports = router;
