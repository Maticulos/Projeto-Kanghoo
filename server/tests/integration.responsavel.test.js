/* eslint-env mocha */
const assert = require('assert');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

describe('Integração: rotas do responsável', function () {
  this.timeout(20000);

  const TEST_PORT = process.env.TEST_PORT || '3125';
  const JWT_SECRET = process.env.JWT_SECRET || 'dev_local_secret_change_me';
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kanghoo_db_prod';
  let pool;
  let api;

  before(async function () {
    // Verificar disponibilidade do banco
    try {
      pool = new Pool({ connectionString: databaseUrl });
      await pool.query('SELECT 1');
    } catch (e) {
      // Sem DB disponível: pular testes de integração
      // eslint-disable-next-line no-console
      console.warn('DB indisponível, pulando integração de responsável. Detalhe:', e.message);
      this.skip();
      return;
    }

    // Criar tabelas mínimas (se não existirem) para o cenário de teste
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome_completo VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        celular VARCHAR(20),
        data_nascimento DATE,
        tipo_cadastro VARCHAR(50),
        tipo_usuario VARCHAR(50),
        endereco_completo TEXT,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rotas (
        id SERIAL PRIMARY KEY,
        motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nome_rota VARCHAR(255) NOT NULL,
        descricao TEXT,
        horario_inicio TIME NOT NULL,
        horario_fim TIME,
        dias_semana VARCHAR(20) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Garantir colunas obrigatórias quando tabela já existia
    await pool.query("ALTER TABLE rotas ADD COLUMN IF NOT EXISTS nome_rota VARCHAR(255);");
    await pool.query("ALTER TABLE rotas ADD COLUMN IF NOT EXISTS descricao TEXT;");
    await pool.query("ALTER TABLE rotas ADD COLUMN IF NOT EXISTS horario_inicio TIME;");
    await pool.query("ALTER TABLE rotas ADD COLUMN IF NOT EXISTS horario_fim TIME;");
    await pool.query("ALTER TABLE rotas ADD COLUMN IF NOT EXISTS dias_semana VARCHAR(20);");
    await pool.query("ALTER TABLE rotas ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;");
    await pool.query("ALTER TABLE rotas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS criancas (
        id SERIAL PRIMARY KEY,
        nome_completo VARCHAR(255) NOT NULL,
        data_nascimento DATE NOT NULL,
        endereco_residencial TEXT NOT NULL,
        escola VARCHAR(255) NOT NULL,
        endereco_escola TEXT NOT NULL,
        responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        motorista_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        rota_id INTEGER REFERENCES rotas(id) ON DELETE SET NULL,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Preparar dados mínimos
    await pool.query('BEGIN');
    try {
      // Criar usuários: responsável e motorista
      const r1 = await pool.query(
        `INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario)
         VALUES ('Ana Responsável', 'ana.resp@test.com', 'x', 'responsavel') RETURNING id`
      );
      const responsavelId = r1.rows[0].id;
      const r2 = await pool.query(
        `INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario, celular)
         VALUES ('Carlos Motorista', 'carlos.motorista@test.com', 'x', 'motorista_escolar', '(11) 99999-9999') RETURNING id, nome_completo, email, celular`
      );
      const motoristaId = r2.rows[0].id;

      const rota = await pool.query(
        `INSERT INTO rotas (motorista_id, nome_rota, descricao, horario_inicio, dias_semana, ativo)
         VALUES ($1, 'Rota Centro', 'Rota teste', '07:00', '1,2,3,4,5', true)
         RETURNING id, nome_rota, descricao`, [motoristaId]
      );
      const rotaId = rota.rows[0].id;

      // Verificar se há coluna cpf e ajustar INSERT conforme necessário
      const cpfCol = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='criancas' AND column_name='cpf'");
      const idadeCol = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='criancas' AND column_name='idade'");
      const nomeRespCol = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='criancas' AND column_name='nome_responsavel'");
      const emailRespCol = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='criancas' AND column_name='email_responsavel'");
      const cols = ['nome_completo','data_nascimento','endereco_residencial','escola','endereco_escola','responsavel_id','motorista_id','rota_id','ativo'];
      const vals = [`'Joaozinho'`, `'2015-05-15'`, `'Rua X, 123'`, `'EM Teste'`, `'Av Y, 456'`, '$1', '$2', '$3', 'true'];
      if (cpfCol.rows.length > 0) { cols.push('cpf'); vals.push(`'00000000000'`); }
      if (idadeCol.rows.length > 0) { cols.push('idade'); vals.push(`9`); }
      if (nomeRespCol.rows.length > 0) { cols.push('nome_responsavel'); vals.push(`'Ana Responsável'`); }
      if (emailRespCol.rows.length > 0) { cols.push('email_responsavel'); vals.push(`'ana.resp@test.com'`); }
      await pool.query(
        `INSERT INTO criancas (${cols.join(',')}) VALUES (${vals.join(',')})`,
        [responsavelId, motoristaId, rotaId]
      );

      await pool.query('COMMIT');

      // Subir servidor
      process.env.PORT = TEST_PORT;
      process.env.AUTO_CREATE_TABLES = 'false';
      process.env.JWT_SECRET = JWT_SECRET;
      require('../server.js');
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }

    api = supertest(`http://localhost:${TEST_PORT}`);
  });

  after(async function () {
    if (pool) await pool.end().catch(() => {});
  });

  it('GET /api/responsavel/criancas/:id responde 200 com dados', async function () {
    // Obter uma criança para teste
    const crianca = await pool.query('SELECT id FROM criancas ORDER BY id DESC LIMIT 1');
    assert.ok(crianca.rows.length === 1, 'Sem criança de teste');
    const criancaId = crianca.rows[0].id;

    // Gerar token JWT de responsável (id/email/tipo)
    const userRow = await pool.query("SELECT id, email FROM usuarios WHERE tipo_usuario='responsavel' ORDER BY id DESC LIMIT 1");
    const token = jwt.sign({ userId: userRow.rows[0].id, email: userRow.rows[0].email, tipo: 'responsavel' }, JWT_SECRET, { expiresIn: '1h' });

    const res = await api
      .get(`/api/responsavel/criancas/${criancaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.equal(res.body.sucesso, true);
    assert.equal(res.body.crianca.id, criancaId);
  });
});
