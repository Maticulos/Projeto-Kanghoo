exports.up = function(knex) {
  return knex.schema.table('empresas', function(table) {
    table.renameColumn('foto_cnpj', 'foto_representante');
  });
};

exports.down = function(knex) {
  return knex.schema.table('empresas', function(table) {
    table.renameColumn('foto_representante', 'foto_cnpj');
  });
};
