const db = require('../config/db');

/**
 * Obtém status de um usuário (ou null se não houver registro).
 * @param {number} usuarioId
 * @returns {Promise<Object|null>}
 */
async function getStatus(usuarioId) {
  const res = await db.query(
    'SELECT id, usuario_id, tipo_usuario, ativo, origem, motivo, atualizado_em FROM usuarios_status WHERE usuario_id = $1',
    [usuarioId]
  );
  return res.rows[0] || null;
}

/**
 * Insere ou atualiza status do usuário.
 * @param {Object} params
 * @param {number} params.usuarioId
 * @param {string} params.tipoUsuario
 * @param {boolean} params.ativo
 * @param {string} [params.origem]
 * @param {string|null} [params.motivo]
 * @param {number|null} [params.atualizadoPor]
 * @returns {Promise<Object>} status atualizado
 */
async function upsertStatus({ usuarioId, tipoUsuario, ativo, origem = 'manual', motivo = null, atualizadoPor = null }) {
  const res = await db.query(
    `
      INSERT INTO usuarios_status (
        usuario_id, tipo_usuario, ativo, origem, motivo, atualizado_por, criado_em, atualizado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (usuario_id)
      DO UPDATE SET
        tipo_usuario = EXCLUDED.tipo_usuario,
        ativo = EXCLUDED.ativo,
        origem = EXCLUDED.origem,
        motivo = EXCLUDED.motivo,
        atualizado_por = EXCLUDED.atualizado_por,
        atualizado_em = NOW()
      RETURNING id, usuario_id, tipo_usuario, ativo, origem, motivo, atualizado_em
    `,
    [usuarioId, tipoUsuario, !!ativo, origem || 'manual', motivo || null, atualizadoPor]
  );
  return res.rows[0];
}

module.exports = {
  getStatus,
  upsertStatus
};
