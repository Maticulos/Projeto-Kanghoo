exports.up = function(knex) {
  return knex.schema.table('usuarios', function(table) {
    table.string('cep', 10).nullable();
    // table.timestamp('atualizado_em').defaultTo(knex.fn.now()); // Already exists
  });
};

exports.down = function(knex) {
  return knex.schema.table('usuarios', function(table) {
    table.dropColumn('cep');
    // table.dropColumn('atualizado_em');
  });
};
