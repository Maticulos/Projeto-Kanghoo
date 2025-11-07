/**
 * Inicial: tabelas relacionadas a tracking/viagens.
 * Mantém compatibilidade com o modelo atual (usuarios, criancas, rotas, rastreamento já existentes).
 */

exports.up = async function (knex) {
  const hasViagens = await knex.schema.hasTable('viagens');
  if (!hasViagens) {
    await knex.schema.createTable('viagens', (t) => {
      t.increments('id').primary();
      t.integer('motorista_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
      t.integer('rota_id').nullable().references('id').inTable('rotas').onDelete('SET NULL');
      t.string('tipo_viagem', 20).notNullable().defaultTo('ida');
      t.string('status', 20).notNullable().defaultTo('iniciada');
      t.timestamp('horario_inicio', { useTz: true }).defaultTo(knex.fn.now());
      t.timestamp('horario_fim', { useTz: true });
      t.decimal('distancia_total', 10, 2);
      t.integer('tempo_total');
      t.text('observacoes');
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('viagens', (t) => {
      t.index(['motorista_id']);
      t.index(['rota_id']);
      t.index(['status']);
    });
  }

  const hasCriancasViagens = await knex.schema.hasTable('criancas_viagens');
  if (!hasCriancasViagens) {
    await knex.schema.createTable('criancas_viagens', (t) => {
      t.increments('id').primary();
      t.integer('viagem_id').notNullable().references('id').inTable('viagens').onDelete('CASCADE');
      t.integer('crianca_id').notNullable().references('id').inTable('criancas').onDelete('CASCADE');
      t.timestamp('criado_em', { useTz: true }).defaultTo(knex.fn.now());
      t.unique(['viagem_id', 'crianca_id']);
    });
    await knex.schema.alterTable('criancas_viagens', (t) => {
      t.index(['viagem_id']);
      t.index(['crianca_id']);
    });
  }

  const hasLocalizacoes = await knex.schema.hasTable('localizacoes');
  if (!hasLocalizacoes) {
    await knex.schema.createTable('localizacoes', (t) => {
      t.increments('id').primary();
      t.integer('viagem_id').nullable().references('id').inTable('viagens').onDelete('SET NULL');
      t.integer('motorista_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
      t.integer('rota_id').nullable().references('id').inTable('rotas').onDelete('SET NULL');
      t.decimal('latitude', 10, 8).notNullable();
      t.decimal('longitude', 11, 8).notNullable();
      t.decimal('velocidade', 5, 2);
      t.integer('direcao');
      t.timestamp('timestamp', { useTz: true }).defaultTo(knex.fn.now());
    });
    await knex.schema.alterTable('localizacoes', (t) => {
      t.index(['motorista_id']);
      t.index(['viagem_id']);
      t.index(['timestamp']);
    });
  }

  const hasEventos = await knex.schema.hasTable('eventos_viagem');
  if (!hasEventos) {
    await knex.schema.createTable('eventos_viagem', (t) => {
      t.increments('id').primary();
      t.integer('viagem_id').notNullable().references('id').inTable('viagens').onDelete('CASCADE');
      t.integer('crianca_id').notNullable().references('id').inTable('criancas').onDelete('CASCADE');
      t.string('tipo_evento', 20).notNullable(); // embarque|desembarque
      t.decimal('latitude', 10, 8).notNullable();
      t.decimal('longitude', 11, 8).notNullable();
      t.timestamp('timestamp', { useTz: true }).defaultTo(knex.fn.now());
      t.text('observacoes');
    });
    await knex.schema.alterTable('eventos_viagem', (t) => {
      t.index(['viagem_id']);
      t.index(['crianca_id']);
      t.index(['tipo_evento']);
    });
  }
};

exports.down = async function (knex) {
  const dropIfExists = async (table) => {
    const has = await knex.schema.hasTable(table);
    if (has) await knex.schema.dropTable(table);
  };

  await dropIfExists('eventos_viagem');
  await dropIfExists('localizacoes');
  await dropIfExists('criancas_viagens');
  await dropIfExists('viagens');
};
