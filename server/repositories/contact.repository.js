const db = require('../config/db');

async function insert({ nome, email, telefone, assunto, mensagem, origem }) {
  const res = await db.query(
    `INSERT INTO contatos (nome, email, telefone, assunto, mensagem, origem)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [nome, email, telefone || null, assunto || null, mensagem, origem || 'site']
  );
  return res.rows[0].id;
}

module.exports = { insert };

