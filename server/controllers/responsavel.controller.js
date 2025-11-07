const db = require('../config/db');
const { success, error, send } = require('../utils/api-response');
const logger = require('../utils/logger');

async function getFirstChild(ctx) {
  try {
    const responsavelId = ctx.user.id;
    const q = `SELECT c.id, c.nome_completo, c.data_nascimento, c.endereco_residencial,
                      c.escola, c.endereco_escola, c.rota_id,
                      r.nome_rota, r.descricao AS descricao_rota,
                      c.ativo, c.criado_em,
                      u.nome_completo AS nome_motorista, u.celular AS telefone_motorista, u.email AS email_motorista
               FROM criancas c
               LEFT JOIN rotas r ON c.rota_id = r.id
               LEFT JOIN usuarios u ON c.motorista_id = u.id
               WHERE c.responsavel_id = $1 AND c.ativo = true
               ORDER BY c.criado_em DESC LIMIT 1`;
    const res = await db.query(q, [responsavelId]);
    if (res.rows.length === 0) {
      ctx.status = 404;
      return send(ctx, error('Nenhuma criança encontrada para este responsável', 404));
    }
    return send(ctx, success(res.rows[0]));
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
    const q = `SELECT c.id, c.nome_completo, c.data_nascimento, c.endereco_residencial,
                      c.escola, c.endereco_escola, c.rota_id,
                      r.nome_rota AS nome_rota, r.descricao AS descricao_rota,
                      c.ativo, c.criado_em,
                      u.nome_completo AS nome_motorista, u.celular AS telefone_motorista, u.email AS email_motorista
               FROM criancas c
               LEFT JOIN rotas r ON c.rota_id = r.id
               LEFT JOIN usuarios u ON c.motorista_id = u.id
               WHERE c.id = $1 AND c.responsavel_id = $2`;
    const res = await db.query(q, [criancaId, responsavelId]);
    if (res.rows.length === 0) {
      ctx.status = 404;
      return send(ctx, error('Criança não encontrada', 404));
    }
    return send(ctx, { statusCode: 200, success: true, crianca: res.rows[0] });
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

    const check = await db.query('SELECT id FROM criancas WHERE id = $1 AND responsavel_id = $2', [criancaId, responsavelId]);
    if (check.rows.length === 0) {
      ctx.status = 404;
      return send(ctx, error('Criança não encontrada', 404));
    }
    const upd = await db.query(`UPDATE criancas
                                 SET endereco_residencial=$1, escola=$2, endereco_escola=$3, atualizado_em=NOW()
                                 WHERE id=$4 AND responsavel_id=$5
                                 RETURNING id, nome_completo`,
                               [endereco_residencial, escola, endereco_escola, criancaId, responsavelId]);
    return send(ctx, { statusCode: 200, success: true, mensagem: 'Informações da criança atualizadas com sucesso', crianca: upd.rows[0] });
  } catch (e) {
    logger.error('Erro updateChild:', e);
    ctx.status = 500;
    return send(ctx, error('Erro interno do servidor', 500));
  }
}

module.exports = { getFirstChild, getChildById, updateChild };

