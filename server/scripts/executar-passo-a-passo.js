const db = require('../config/db');

async function executarPassoAPasso() {
  try {
    console.log('🔄 Executando melhorias passo a passo...');
    
    // Passo 1: Criar tabela planos_assinatura
    console.log('\n📋 Passo 1: Criando tabela planos_assinatura...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS planos_assinatura (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          tipo_plano VARCHAR(50) NOT NULL DEFAULT 'basico',
          limite_rotas INTEGER DEFAULT 3,
          limite_usuarios INTEGER DEFAULT 50,
          data_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          data_fim TIMESTAMP WITH TIME ZONE,
          ativo BOOLEAN DEFAULT true,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela planos_assinatura criada');
    
    // Passo 2: Criar índices para planos_assinatura
    console.log('\n📋 Passo 2: Criando índices para planos_assinatura...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_planos_usuario ON planos_assinatura(usuario_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_planos_ativo ON planos_assinatura(ativo)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_planos_tipo ON planos_assinatura(tipo_plano)');
    console.log('✅ Índices criados');
    
    // Passo 3: Criar tabela criancas_rotas
    console.log('\n📋 Passo 3: Criando tabela criancas_rotas...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS criancas_rotas (
          id SERIAL PRIMARY KEY,
          crianca_id INTEGER NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
          rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
          endereco_embarque TEXT NOT NULL,
          endereco_desembarque TEXT NOT NULL,
          latitude_embarque DECIMAL(10, 8),
          longitude_embarque DECIMAL(11, 8),
          latitude_desembarque DECIMAL(10, 8),
          longitude_desembarque DECIMAL(11, 8),
          horario_embarque TIME,
          horario_desembarque TIME,
          observacoes TEXT,
          data_inicio DATE DEFAULT CURRENT_DATE,
          data_fim DATE,
          ativo BOOLEAN DEFAULT true,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(crianca_id, rota_id)
      )
    `);
    console.log('✅ Tabela criancas_rotas criada');
    
    // Passo 4: Criar índices para criancas_rotas
    console.log('\n📋 Passo 4: Criando índices para criancas_rotas...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_criancas_rotas_crianca ON criancas_rotas(crianca_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_criancas_rotas_rota ON criancas_rotas(rota_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_criancas_rotas_ativo ON criancas_rotas(ativo)');
    console.log('✅ Índices criados');
    
    // Passo 5: Criar tabela veiculos
    console.log('\n📋 Passo 5: Criando tabela veiculos...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS veiculos (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          placa VARCHAR(10) NOT NULL UNIQUE,
          modelo VARCHAR(100) NOT NULL,
          ano INTEGER,
          cor VARCHAR(50),
          capacidade INTEGER NOT NULL DEFAULT 1,
          tipo_veiculo VARCHAR(50) DEFAULT 'van',
          ativo BOOLEAN DEFAULT true,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela veiculos criada');
    
    // Passo 6: Criar índices para veículos
    console.log('\n📋 Passo 6: Criando índices para veículos...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_veiculos_usuario ON veiculos(usuario_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo)');
    console.log('✅ Índices criados');
    
    // Passo 7: Inserir planos básicos
    console.log('\n📋 Passo 7: Inserindo planos básicos para usuários...');
    const result = await db.query(`
      INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios)
      SELECT id, 'basico', 3, 50
      FROM usuarios 
      WHERE id NOT IN (SELECT usuario_id FROM planos_assinatura)
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    console.log(`✅ ${result.rowCount} planos inseridos`);
    
    console.log('\n🎉 Todas as tabelas criadas com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

executarPassoAPasso();