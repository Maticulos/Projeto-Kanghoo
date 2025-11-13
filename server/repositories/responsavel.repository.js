const db = require('../config/db');

async function getFirstChildByResponsavelId(responsavelId) {
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
  return res.rows[0] || null;
}

async function getChildByIdForResponsavel(criancaId, responsavelId) {
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
  return res.rows[0] || null;
}

async function checkChildOwnership(criancaId, responsavelId) {
  const res = await db.query('SELECT 1 FROM criancas WHERE id = $1 AND responsavel_id = $2', [criancaId, responsavelId]);
  return res.rowCount > 0;
}

async function updateChildData(criancaId, responsavelId, { endereco_residencial, escola, endereco_escola }) {
  const upd = await db.query(
    `UPDATE criancas
       SET endereco_residencial=$1, escola=$2, endereco_escola=$3, atualizado_em=NOW()
     WHERE id=$4 AND responsavel_id=$5
     RETURNING id, nome_completo`,
    [endereco_residencial, escola, endereco_escola, criancaId, responsavelId]
  );
  return upd.rows[0] || null;
}

module.exports = {
  getFirstChildByResponsavelId,
  getChildByIdForResponsavel,
  checkChildOwnership,
  updateChildData
};

