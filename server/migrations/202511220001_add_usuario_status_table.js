/**
 * Tabela de status dos usuários (responsáveis e motoristas)
 * Controla ativações/desativações com histórico básico de origem.
 */

exports.up = async function up(knex) {
  const tableName = 'usuarios_status';

  const exists = await knex.schema.hasTable(tableName);
  if (!exists) {
    await knex.schema.createTable(tableName, (t) => {
      t.increments('id').primary();
      t
        .integer('usuario_id')
        .notNullable()
        .references('id')
        .inTable('usuarios')
        .onDelete('CASCADE');
      t.string('tipo_usuario', 50).notNullable();
      t.boolean('ativo').defaultTo(true);
      t.string('origem', 50).defaultTo('manual'); // plano, manual, importacao
      t.text('motivo');
      t
        .integer('atualizado_por')
        .references('id')
        .inTable('usuarios')
        .onDelete('SET NULL');
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
      t.timestamp('atualizado_em', { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.schema.alterTable(tableName, (t) => {
      t.unique(['usuario_id']);
      t.index(['usuario_id', 'ativo']);
      t.index(['tipo_usuario']);
    });
  }
};

exports.down = async function down(knex) {
  const tableName = 'usuarios_status';
  const exists = await knex.schema.hasTable(tableName);
  if (exists) {
    await knex.schema.dropTable(tableName);
  }
};
