exports.up = function(knex) {
  return knex.schema
    .table('usuarios', function(table) {
      table.string('tipo_pessoa', 20).nullable(); // fisica, juridica
      table.string('foto_perfil', 255).nullable();
      table.string('nome_emergencia', 100).nullable();
      table.string('telefone_emergencia', 20).nullable();
      table.string('cnh', 20).nullable();
      table.string('categoria_cnh', 5).nullable();
      table.date('validade_cnh').nullable();
      table.string('foto_cnh', 255).nullable();
      table.string('foto_antecedentes', 255).nullable();
      table.string('foto_curso', 255).nullable();
      // Address fields split
      table.string('rua', 255).nullable();
      table.string('numero', 20).nullable();
      table.string('complemento', 100).nullable();
    })
    .table('veiculos', function(table) {
      table.integer('ano_modelo').nullable();
      // ar_condicionado, wifi, acessibilidade_pcd are in caracteristicas_veiculos table
      table.string('seguradora', 100).nullable();
      table.string('apolice', 50).nullable();
      table.date('validade_seguro').nullable();
      table.string('foto_crlv', 255).nullable();
    })
    .table('empresas', function(table) {
      table.string('telefone', 20).nullable();
      table.string('cep', 10).nullable();
      table.string('rua', 255).nullable();
      table.string('numero', 20).nullable();
      table.string('complemento', 100).nullable();
      table.string('bairro', 100).nullable();
      table.string('cidade', 100).nullable();
      table.string('estado', 2).nullable();
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('usuarios', function(table) {
      table.dropColumn('tipo_pessoa');
      table.dropColumn('foto_perfil');
      table.dropColumn('nome_emergencia');
      table.dropColumn('telefone_emergencia');
      table.dropColumn('cnh');
      table.dropColumn('categoria_cnh');
      table.dropColumn('validade_cnh');
      table.dropColumn('foto_cnh');
      table.dropColumn('foto_antecedentes');
      table.dropColumn('foto_curso');
      table.dropColumn('rua');
      table.dropColumn('numero');
      table.dropColumn('complemento');
    })
    .table('veiculos', function(table) {
      table.dropColumn('ano_modelo');
      table.dropColumn('seguradora');
      table.dropColumn('apolice');
      table.dropColumn('validade_seguro');
      table.dropColumn('foto_crlv');
    })
    .table('empresas', function(table) {
      table.dropColumn('telefone');
      table.dropColumn('cep');
      table.dropColumn('rua');
      table.dropColumn('numero');
      table.dropColumn('complemento');
      table.dropColumn('bairro');
      table.dropColumn('cidade');
      table.dropColumn('estado');
    });
};
