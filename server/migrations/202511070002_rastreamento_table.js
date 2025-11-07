/**
 * Tabela de rastreamento (posições correntes por motorista/rota).
 */

exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable('rastreamento'))) {
    await knex.schema.createTable('rastreamento', (t) => {
      t.increments('id').primary();
      t.integer('motorista_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
      t.integer('rota_id').nullable().references('id').inTable('rotas').onDelete('CASCADE');
      t.decimal('latitude', 10, 8).notNullable();
      t.decimal('longitude', 11, 8).notNullable();
      t.decimal('velocidade', 5, 2);
      t.integer('direcao');
      t.timestamp('timestamp_localizacao', { useTz: true }).defaultTo(knex.fn.now());
      t.boolean('ativo').defaultTo(true);
    });
    await knex.schema.alterTable('rastreamento', (t) => {
      t.index(['motorista_id']);
      t.index(['rota_id']);
      t.index(['timestamp_localizacao']);
      t.index(['ativo']);
    });
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasTable('rastreamento')) {
    await knex.schema.dropTable('rastreamento');
  }
};

