/**
 * Cria tabelas utilitárias que estavam apenas em criação runtime.
 */

exports.up = async function up(knex) {
  // veiculos
  if (!(await knex.schema.hasTable('veiculos'))) {
    await knex.schema.createTable('veiculos', (t) => {
      t.increments('id').primary();
      t.integer('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
      t.string('placa', 10).notNullable();
      t.string('renavam', 20).notNullable();
      t.integer('lotacao_maxima');
      t.integer('ano_fabricacao');
      t.string('cor', 50);
      t.string('modelo', 100);
      t.string('marca', 100);
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('veiculos', (t) => {
      t.index(['usuario_id']);
      t.index(['placa']);
    });
  }

  // empresas
  if (!(await knex.schema.hasTable('empresas'))) {
    await knex.schema.createTable('empresas', (t) => {
      t.increments('id').primary();
      t.integer('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
      t.string('razao_social', 255).notNullable();
      t.string('nome_fantasia', 255);
      t.string('cnpj', 20).unique().notNullable();
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
  }

  // contatos (form de contato)
  if (!(await knex.schema.hasTable('contatos'))) {
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
  }

  // pontos_parada
  if (!(await knex.schema.hasTable('pontos_parada'))) {
    await knex.schema.createTable('pontos_parada', (t) => {
      t.increments('id').primary();
      t.integer('rota_id').references('id').inTable('rotas').onDelete('CASCADE');
      t.text('endereco').notNullable();
      t.decimal('latitude', 10, 8);
      t.decimal('longitude', 11, 8);
      t.time('horario_previsto');
      t.integer('ordem_parada').notNullable();
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('pontos_parada', (t) => {
      t.index(['rota_id']);
      t.index(['ordem_parada']);
    });
  }

  // historico_transportes
  if (!(await knex.schema.hasTable('historico_transportes'))) {
    await knex.schema.createTable('historico_transportes', (t) => {
      t.increments('id').primary();
      t.integer('crianca_id').references('id').inTable('criancas').onDelete('CASCADE');
      t.integer('motorista_id').references('id').inTable('usuarios').onDelete('CASCADE');
      t.integer('rota_id').references('id').inTable('rotas').onDelete('CASCADE');
      t.date('data_transporte').notNullable();
      t.timestamp('horario_embarque', { useTz: true });
      t.timestamp('horario_desembarque', { useTz: true });
      t.text('local_embarque');
      t.text('local_desembarque');
      t.decimal('latitude_embarque', 10, 8);
      t.decimal('longitude_embarque', 11, 8);
      t.decimal('latitude_desembarque', 10, 8);
      t.decimal('longitude_desembarque', 11, 8);
      t.string('status', 50).defaultTo('agendado');
      t.text('observacoes');
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
  }

  // caracteristicas_veiculos
  if (!(await knex.schema.hasTable('caracteristicas_veiculos'))) {
    await knex.schema.createTable('caracteristicas_veiculos', (t) => {
      t.increments('id').primary();
      t.integer('veiculo_id').references('id').inTable('veiculos').onDelete('CASCADE');
      t.boolean('ar_condicionado').defaultTo(false);
      t.boolean('wifi').defaultTo(false);
      t.boolean('acessibilidade_pcd').defaultTo(false);
      t.boolean('gps_rastreamento').defaultTo(false);
      t.boolean('banheiro').defaultTo(false);
      t.boolean('tv_dvd').defaultTo(false);
      t.boolean('frigobar').defaultTo(false);
      t.boolean('poltronas_reclinaveis').defaultTo(false);
      t.boolean('cinto_seguranca').defaultTo(true);
      t.boolean('extintor').defaultTo(true);
      t.boolean('kit_primeiros_socorros').defaultTo(true);
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
  }

  // rotas_escolares
  if (!(await knex.schema.hasTable('rotas_escolares'))) {
    await knex.schema.createTable('rotas_escolares', (t) => {
      t.increments('id').primary();
      t.integer('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
      t.string('nome_rota', 255).notNullable();
      t.string('escola_destino', 255);
      t.string('turno', 20);
      t.text('descricao');
      t.time('horario_ida');
      t.time('horario_volta');
      t.string('dias_semana', 20).defaultTo('seg-sex');
      t.decimal('valor_mensal', 10, 2);
      t.decimal('preco_mensal', 10, 2);
      t.integer('vagas_disponiveis').defaultTo(0);
      t.boolean('ativa').defaultTo(true);
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
  }

  // pacotes_excursao
  if (!(await knex.schema.hasTable('pacotes_excursao'))) {
    await knex.schema.createTable('pacotes_excursao', (t) => {
      t.increments('id').primary();
      t.integer('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
      t.string('nome_pacote', 255).notNullable();
      t.text('descricao');
      t.string('destino', 255);
      t.date('data_saida');
      t.date('data_retorno');
      t.date('data_inicio');
      t.date('data_fim');
      t.integer('duracao_dias');
      t.time('horario_saida');
      t.time('horario_retorno');
      t.decimal('valor_por_pessoa', 10, 2);
      t.decimal('preco_por_pessoa', 10, 2);
      t.integer('vagas_disponiveis').defaultTo(0);
      t.boolean('inclui_alimentacao').defaultTo(false);
      t.boolean('inclui_hospedagem').defaultTo(false);
      t.boolean('ativo').defaultTo(true);
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
  }

  // avaliacoes
  if (!(await knex.schema.hasTable('avaliacoes'))) {
    await knex.schema.createTable('avaliacoes', (t) => {
      t.increments('id').primary();
      t.integer('avaliador_id').references('id').inTable('usuarios').onDelete('SET NULL');
      t.integer('avaliado_id').references('id').inTable('usuarios').onDelete('CASCADE');
      t.integer('nota').notNullable();
      t.text('comentario');
      t.boolean('anonimo').defaultTo(false);
      t.boolean('aprovado').defaultTo(false);
      t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function down(knex) {
  const dropIf = async (table) => {
    if (await knex.schema.hasTable(table)) await knex.schema.dropTable(table);
  };
  await dropIf('avaliacoes');
  await dropIf('pacotes_excursao');
  await dropIf('rotas_escolares');
  await dropIf('caracteristicas_veiculos');
  await dropIf('historico_transportes');
  await dropIf('pontos_parada');
  await dropIf('contatos');
  await dropIf('empresas');
  await dropIf('veiculos');
};

