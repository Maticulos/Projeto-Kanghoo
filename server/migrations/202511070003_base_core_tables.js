/**
 * Base de tabelas essenciais para operações do responsável e motorista.
 */

exports.up = async function up(knex) {
  // usuarios
  if (!(await knex.schema.hasTable('usuarios'))) {
    await knex.schema.createTable('usuarios', (t) => {
      t.increments('id').primary();
      t.string('nome_completo', 255).notNullable();
      t.string('email', 255).notNullable().unique();
      t.string('senha', 255).notNullable();
      t.string('celular', 20);
      t.date('data_nascimento');
      t.string('tipo_cadastro', 50);
      t.string('tipo_usuario', 50); // escolar, excursao, etc.
      t.text('endereco_completo');
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('usuarios', (t) => {
      t.index(['tipo_usuario']);
      t.index(['email']);
    });
  }

  // rotas
  if (!(await knex.schema.hasTable('rotas'))) {
    await knex.schema.createTable('rotas', (t) => {
      t.increments('id').primary();
      t.integer('motorista_id').references('id').inTable('usuarios').onDelete('CASCADE');
      t.string('nome_rota', 255).notNullable();
      t.text('descricao');
      t.time('horario_inicio').notNullable();
      t.time('horario_fim');
      t.string('dias_semana', 20).notNullable(); // ex: "1,2,3,4,5"
      t.boolean('ativo').defaultTo(true);
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('rotas', (t) => {
      t.index(['motorista_id']);
      t.index(['ativo']);
    });
  }

  // criancas
  if (!(await knex.schema.hasTable('criancas'))) {
    await knex.schema.createTable('criancas', (t) => {
      t.increments('id').primary();
      t.string('nome_completo', 255).notNullable();
      t.date('data_nascimento').notNullable();
      t.text('endereco_residencial').notNullable();
      t.string('escola', 255).notNullable();
      t.text('endereco_escola').notNullable();
      t.integer('responsavel_id').references('id').inTable('usuarios').onDelete('CASCADE');
      t.integer('motorista_id').references('id').inTable('usuarios').onDelete('SET NULL');
      t.integer('rota_id').references('id').inTable('rotas').onDelete('SET NULL');
      t.boolean('ativo').defaultTo(true);
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
      t.timestamp('atualizado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('criancas', (t) => {
      t.index(['responsavel_id']);
      t.index(['motorista_id', 'ativo']);
      t.index(['rota_id']);
    });
  }
};

exports.down = async function down(knex) {
  const dropIf = async (table) => {
    if (await knex.schema.hasTable(table)) await knex.schema.dropTable(table);
  };
  await dropIf('criancas');
  await dropIf('rotas');
  await dropIf('usuarios');
};

