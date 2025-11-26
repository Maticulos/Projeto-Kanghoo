const { expect } = require('chai');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app'); // Import the Koa app
const db = require('../config/db'); // Import the database connection

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

describe('Integração: Rotas de Viagens', function () {
  this.timeout(10000);

  let server;
  let request;
  let driverToken;
  let testData = {};

  before(async () => {
    // Start the server
    server = app.listen();
    request = supertest(server);

    // --- Create Test Data ---

    // 1. Create Driver
    const driverRes = await db.query(
      `INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario)
       VALUES ('Motorista de Teste Viagem', 'motorista.viagem@test.com', 'senha123', 'motorista_escolar')
       ON CONFLICT (email) DO UPDATE SET nome_completo = 'Motorista de Teste Viagem' RETURNING id, tipo_usuario;`
    );
    testData.driverId = driverRes.rows[0].id;

    // 2. Create Vehicle
    const vehicleRes = await db.query(
      `INSERT INTO veiculos (motorista_id, placa, modelo, ano, capacidade)
       VALUES ($1, 'TEST-001', 'Van Teste', 2023, 15) RETURNING id;`,
      [testData.driverId]
    );
    testData.vehicleId = vehicleRes.rows[0].id;
    
    // 3. Create Route
    const routeRes = await db.query(
      `INSERT INTO rotas_escolares (usuario_id, nome_rota, ativa)
       VALUES ($1, 'Rota de Teste Viagem', true) RETURNING id;`,
      [testData.driverId]
    );
    testData.routeId = routeRes.rows[0].id;
    
    // 4. Create a Parent and Child
     const parentRes = await db.query(
      `INSERT INTO usuarios (nome_completo, email, senha, tipo_usuario)
       VALUES ('Pai de Teste Viagem', 'pai.viagem@test.com', 'senha123', 'responsavel')
       ON CONFLICT (email) DO UPDATE SET nome_completo = 'Pai de Teste Viagem' RETURNING id;`
    );
    testData.parentId = parentRes.rows[0].id;
    testData.parentName = 'Pai de Teste Viagem';

    const childRes = await db.query(
        `INSERT INTO criancas (nome_completo, responsavel_id, data_nascimento, escola, cpf, idade, nome_responsavel, endereco_residencial, endereco_escola)
         VALUES ('Filho de Teste Viagem', $1, '2015-01-01', 'Escola Teste', '99999999999', 8, 'Pai de Teste Viagem', 'Rua Teste, 123', 'Escola Teste, 456') 
         ON CONFLICT (cpf) DO NOTHING
         RETURNING id;`,
        [testData.parentId]
    );
    if (childRes.rows.length > 0) {
        testData.childId = childRes.rows[0].id;
    } else {
        const fallbackRes = await db.query("SELECT id FROM criancas WHERE cpf = '99999999999'");
        testData.childId = fallbackRes.rows[0].id;
    }

    // Generate JWT for the driver
    driverToken = jwt.sign({ userId: testData.driverId, tipo: driverRes.rows[0].tipo_usuario }, JWT_SECRET, { expiresIn: '1h' });
  });

  after(async () => {
    // --- Clean Up Test Data ---
    // Must delete in order to avoid foreign key violations
    if (db && testData.childId) {
      await db.query('DELETE FROM criancas WHERE id = $1', [testData.childId]);
    }
    if (db && testData.routeId) {
      await db.query('DELETE FROM rotas_escolares WHERE id = $1', [testData.routeId]);
    }
    if (db && testData.vehicleId) {
      await db.query('DELETE FROM veiculos WHERE id = $1', [testData.vehicleId]);
    }
    if (db && testData.parentId) {
      await db.query('DELETE FROM usuarios WHERE id = $1', [testData.parentId]);
    }
    if (db && testData.driverId) {
      await db.query('DELETE FROM usuarios WHERE id = $1', [testData.driverId]);
    }
    
    if (db && db.pool) {
      await db.pool.end();
    }
    if (server) {
      server.close();
    }
  });

  it('deve iniciar uma nova viagem', async () => {
    const res = await request
      .post('/api/viagens/iniciar')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        rota_id: testData.routeId,
        veiculo_id: testData.vehicleId,
        odometro_inicial: null,
      })
      .expect(200);

    expect(res.body.success).to.be.true;
    expect(res.body.data).to.have.property('id');
    expect(res.body.data.status).to.equal('em_andamento');
    
    // Save for next tests
    testData.tripId = res.body.data.id;
  });

  it('deve registrar uma conferência de criança', async () => {
    expect(testData.tripId, 'ID da viagem não definido no teste anterior').to.exist;
    
    const res = await request
      .post(`/api/viagens/${testData.tripId}/conferencia`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        crianca_id: testData.childId,
        tipo_conferencia: 'embarque_ida',
        latitude: -23.55,
        longitude: -46.63
      })
      .expect(200);

    expect(res.body.success).to.be.true;
    expect(res.body.data).to.have.property('id');
    expect(res.body.data.crianca_id).to.equal(testData.childId);
    expect(res.body.data.tipo_conferencia).to.equal('embarque_ida');
  });

  it('deve finalizar a viagem', async () => {
    expect(testData.tripId, 'ID da viagem não definido no primeiro teste').to.exist;

    const res = await request
      
.post(`/api/viagens/${testData.tripId}/finalizar`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ odometro_final: 12345 })
      .expect(200);

    expect(res.body.success).to.be.true;
    expect(res.body.data).to.have.property('id');
    expect(res.body.data.status).to.equal('concluida');
  });

  it('responsavel deve ser bloqueado de acessar rotas de motorista', async () => {
    // Gerar token para o usuário pai/responsável
    const parentToken = jwt.sign({ userId: testData.parentId, tipo: 'responsavel' }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request
      .get('/api/rotas-escolares/motorista')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);
    
    expect(res.body.success).to.be.false;
    expect(res.body.message).to.include('Acesso negado');
  });

});
