exports.up = async function up(knex) {
  const has = await knex.schema.hasTable('contatos');
  if (!has) {
    await knex.schema.createTable('contatos', (t) => {
      t.increments('id').primary();
      t.string('nome', 255).notNullable();
      t.string('email', 255).notNullable();
      t.string('telefone', 30);
      t.string('assunto', 255);
      t.text('mensagem').notNullable();
      t.string('origem', 50);
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('contatos', (t) => {
      t.index(['email']);
      t.index(['criado_em']);
    });
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasTable('contatos')) {
    await knex.schema.dropTable('contatos');
  }
};

