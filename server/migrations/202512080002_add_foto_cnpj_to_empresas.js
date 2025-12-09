exports.up = function(knex) {
  return knex.schema.table('empresas', function(table) {
    table.string('foto_cnpj').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('empresas', function(table) {
    table.dropColumn('foto_cnpj');
  });
};
