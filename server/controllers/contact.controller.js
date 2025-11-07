const { validationError, success, send } = require('../utils/api-response');
const logger = require('../utils/logger');
const contactRepo = require('../repositories/contact.repository');

async function createContact(ctx) {
  try {
    const { nome, email, telefone, assunto, mensagem, website } = ctx.validatedData;
    // Honeypot simples
    if (website) {
      return send(ctx, success({ ok: true }, 'OK'));
    }
    const id = await contactRepo.insert({ nome, email, telefone, assunto, mensagem, origem: 'site' });
    ctx.status = 201;
    return send(ctx, success({ id }, 'Mensagem enviada com sucesso'));
  } catch (error) {
    logger.error('Erro ao salvar contato:', error);
    ctx.status = 500;
    return send(ctx, { statusCode: 500, success: false, message: 'Erro ao processar sua mensagem.' });
  }
}

module.exports = { createContact };

