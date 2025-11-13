const repo = require('../repositories/responsavel.repository');
const { success, error, send } = require('../utils/api-response');
const logger = require('../utils/logger');

async function getFirstChild(ctx) {
  try {
    const responsavelId = ctx.user.id;
    const child = await repo.getFirstChildByResponsavelId(responsavelId);
    if (!child) {
      ctx.status = 404;
      return send(ctx, error('Nenhuma criança encontrada para este responsável', 404));
    }
    return send(ctx, success(child));
  } catch (e) {
    logger.error('Erro getFirstChild:', e);
    ctx.status = 500;
    return send(ctx, error('Erro interno do servidor', 500));
  }
}

async function getChildById(ctx) {
  try {
    const responsavelId = ctx.user.id;
    const criancaId = ctx.params.id;
    const child = await repo.getChildByIdForResponsavel(criancaId, responsavelId);
    if (!child) {
      ctx.status = 404;
      return send(ctx, error('Criança não encontrada', 404));
    }
    return send(ctx, { statusCode: 200, success: true, crianca: child });
  } catch (e) {
    logger.error('Erro getChildById:', e);
    ctx.status = 500;
    return send(ctx, error('Erro interno do servidor', 500));
  }
}

async function updateChild(ctx) {
  try {
    const criancaId = ctx.params.id;
    const responsavelId = ctx.user.id;
    const { endereco_residencial, escola, endereco_escola } = ctx.validatedData;

    const owns = await repo.checkChildOwnership(criancaId, responsavelId);
    if (!owns) {
      ctx.status = 404;
      return send(ctx, error('Criança não encontrada', 404));
    }
    const upd = await repo.updateChildData(criancaId, responsavelId, { endereco_residencial, escola, endereco_escola });
    return send(ctx, { statusCode: 200, success: true, mensagem: 'Informações da criança atualizadas com sucesso', crianca: upd });
  } catch (e) {
    logger.error('Erro updateChild:', e);
    ctx.status = 500;
    return send(ctx, error('Erro interno do servidor', 500));
  }
}

module.exports = { getFirstChild, getChildById, updateChild };

