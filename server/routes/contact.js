const Router = require('koa-router');
const { validate, validators } = require('../middleware/validation');
const { createContact } = require('../controllers/contact.controller');

const router = new Router();

const contactSchema = {
  nome: { required: true, minLength: 2, maxLength: 255 },
  email: { required: true, validator: validators.isEmail },
  telefone: { required: false },
  assunto: { required: false },
  mensagem: { required: true, minLength: 3, maxLength: 2000 },
  website: { required: false } // honeypot
};

router.post('/api/contact', validate(contactSchema), createContact);

module.exports = router;

