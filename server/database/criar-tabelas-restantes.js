const db = require('./config/db');

async function criarTabelasRestantes() {
  try {
    console.log('Iniciando criação das tabelas...');
    
    // 1. Tabela rotas_escolares
    console.log('Criando tabela rotas_escolares...');
    const rotasEscolaresQuery = `
      CREATE TABLE IF NOT EXISTS rotas_escolares (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        origem VARCHAR(255),
        destino VARCHAR(255),
        horario_ida TIME,
        horario_volta TIME,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_rotas_escolares_usuario ON rotas_escolares(usuario_id);
    `;
    
    await db.query(rotasEscolaresQuery);
    console.log('✅ Tabela rotas_escolares criada');
    
    // 2. Tabela rota_criancas
    console.log('Criando tabela rota_criancas...');
    const rotaCriancasQuery = `
      CREATE TABLE IF NOT EXISTS rota_criancas (
        id SERIAL PRIMARY KEY,
        rota_id INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
        crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
        ordem_parada INTEGER,
        endereco_embarque TEXT,
        endereco_desembarque TEXT,
        horario_embarque TIME,
        horario_desembarque TIME,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rota_id, crianca_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_rota_criancas_rota ON rota_criancas(rota_id);
      CREATE INDEX IF NOT EXISTS idx_rota_criancas_crianca ON rota_criancas(crianca_id);
    `;
    
    await db.query(rotaCriancasQuery);
    console.log('✅ Tabela rota_criancas criada');
    
    // 3. Tabela conferencias
    console.log('Criando tabela conferencias...');
    const conferenciasQuery = `
      CREATE TABLE IF NOT EXISTS conferencias (
        id SERIAL PRIMARY KEY,
        rota_id INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(20) DEFAULT 'ida',
        status VARCHAR(20) DEFAULT 'em_andamento',
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        finalizado_em TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX IF NOT EXISTS idx_conferencias_rota ON conferencias(rota_id);
      CREATE INDEX IF NOT EXISTS idx_conferencias_usuario ON conferencias(usuario_id);
    `;
    
    await db.query(conferenciasQuery);
    console.log('✅ Tabela conferencias criada');
    
    // 4. Tabela assinaturas
    console.log('Criando tabela assinaturas...');
    const assinaturasQuery = `
      CREATE TABLE IF NOT EXISTS assinaturas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        plano_id INTEGER,
        status VARCHAR(20) DEFAULT 'ativa',
        data_inicio DATE DEFAULT CURRENT_DATE,
        data_vencimento DATE,
        valor DECIMAL(10, 2),
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_assinaturas_usuario ON assinaturas(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
    `;
    
    await db.query(assinaturasQuery);
    console.log('✅ Tabela assinaturas criada');
    
    // 5. Tabela planos_assinatura
    console.log('Criando tabela planos_assinatura...');
    const planosQuery = `
      CREATE TABLE IF NOT EXISTS planos_assinatura (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        preco DECIMAL(10, 2) NOT NULL,
        recursos JSONB,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await db.query(planosQuery);
    console.log('✅ Tabela planos_assinatura criada');
    
    // 6. Inserir alguns planos básicos
    console.log('Inserindo planos básicos...');
    const inserirPlanosQuery = `
      INSERT INTO planos_assinatura (nome, descricao, preco, recursos, ativo)
      VALUES 
        ('Básico', 'Plano básico com funcionalidades essenciais', 29.90, '["rastreamento", "notificacoes"]'::jsonb, true),
        ('Premium', 'Plano premium com todas as funcionalidades', 59.90, '["rastreamento", "notificacoes", "relatorios", "geofencing"]'::jsonb, true),
        ('Empresarial', 'Plano para empresas com múltiplos veículos', 99.90, '["rastreamento", "notificacoes", "relatorios", "geofencing", "multiplos_veiculos"]'::jsonb, true)
      ON CONFLICT DO NOTHING;
    `;
    
    await db.query(inserirPlanosQuery);
    console.log('✅ Planos básicos inseridos');
    
    console.log('\n🎉 Todas as tabelas foram criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

criarTabelasRestantes();