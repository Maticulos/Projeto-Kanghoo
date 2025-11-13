/**
 * Adiciona coluna data_viagem à tabela viagens para compatibilidade
 * com rotas legadas que filtram por data.
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('viagens');
  if (hasTable) {
    const hasCol = await knex.schema.hasColumn('viagens', 'data_viagem');
    if (!hasCol) {
      await knex.schema.alterTable('viagens', (t) => {
        t.date('data_viagem').defaultTo(knex.raw('CURRENT_DATE'));
      });
      await knex.schema.alterTable('viagens', (t) => {
        t.index(['data_viagem']);
      });
    }
  }
};

exports.down = async function down(knex) {
  const hasTable = await knex.schema.hasTable('viagens');
  if (hasTable) {
    const hasCol = await knex.schema.hasColumn('viagens', 'data_viagem');
    if (hasCol) {
      await knex.schema.alterTable('viagens', (t) => {
        t.dropColumn('data_viagem');
      });
    }
  }
};

