const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '../../.env' });

let poolConfig;

// Verificar se DATABASE_URL está disponível
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
} else {
  // Caso contrário, use as variáveis individuais
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const passwordString = String(dbPassword);
  
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: passwordString,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pool = new Pool(poolConfig);

async function adicionarColunas() {
  try {
    console.log('Adicionando colunas que estão faltando...');
    
    // Adicionar coluna tipo_usuario
    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR(50)
    `);
    console.log('✓ Coluna tipo_usuario adicionada');
    
    // Adicionar coluna endereco_completo
    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS endereco_completo TEXT
    `);
    console.log('✓ Coluna endereco_completo adicionada');
    
    // Adicionar colunas na tabela veiculos
    await pool.query(`
      ALTER TABLE veiculos 
      ADD COLUMN IF NOT EXISTS ano_fabricacao INTEGER
    `);
    console.log('✓ Coluna ano_fabricacao adicionada');
    
    await pool.query(`
      ALTER TABLE veiculos 
      ADD COLUMN IF NOT EXISTS cor VARCHAR(50)
    `);
    console.log('✓ Coluna cor adicionada');
    
    await pool.query(`
      ALTER TABLE veiculos 
      ADD COLUMN IF NOT EXISTS modelo VARCHAR(100)
    `);
    console.log('✓ Coluna modelo adicionada');
    
    await pool.query(`
      ALTER TABLE veiculos 
      ADD COLUMN IF NOT EXISTS marca VARCHAR(100)
    `);
    console.log('✓ Coluna marca adicionada');
    
    // Adicionar colunas à tabela caracteristicas_veiculos
    await pool.query(`
      ALTER TABLE caracteristicas_veiculos 
      ADD COLUMN IF NOT EXISTS acessibilidade_pcd BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS gps_rastreamento BOOLEAN DEFAULT false
    `);
    console.log('✓ Colunas acessibilidade_pcd e gps_rastreamento adicionadas');
    
    // Adicionar colunas à tabela rotas_escolares
    await pool.query(`
      ALTER TABLE rotas_escolares 
      ADD COLUMN IF NOT EXISTS escola_destino VARCHAR(255)
    `);
    console.log('✓ Coluna escola_destino adicionada');
    
    await pool.query(`
      ALTER TABLE rotas_escolares 
      ADD COLUMN IF NOT EXISTS turno VARCHAR(20)
    `);
    console.log('✓ Coluna turno adicionada');
    
    await pool.query(`
      ALTER TABLE rotas_escolares 
      ADD COLUMN IF NOT EXISTS preco_mensal DECIMAL(10, 2)
    `);
    console.log('✓ Coluna preco_mensal adicionada');
    
    await pool.query(`
      ALTER TABLE rotas_escolares 
      ADD COLUMN IF NOT EXISTS vagas_disponiveis INTEGER DEFAULT 0
    `);
    console.log('✓ Coluna vagas_disponiveis adicionada');
    
    // Adicionar colunas à tabela pacotes_excursao
    await pool.query(`
      ALTER TABLE pacotes_excursao 
      ADD COLUMN IF NOT EXISTS data_inicio DATE
    `);
    console.log('✓ Coluna data_inicio adicionada');
    
    await pool.query(`
      ALTER TABLE pacotes_excursao 
      ADD COLUMN IF NOT EXISTS data_fim DATE
    `);
    console.log('✓ Coluna data_fim adicionada');
    
    await pool.query(`
      ALTER TABLE pacotes_excursao 
      ADD COLUMN IF NOT EXISTS duracao_dias INTEGER
    `);
    console.log('✓ Coluna duracao_dias adicionada');
    
    await pool.query(`
      ALTER TABLE pacotes_excursao 
      ADD COLUMN IF NOT EXISTS preco_por_pessoa DECIMAL(10, 2)
    `);
    console.log('✓ Coluna preco_por_pessoa adicionada');
    
    console.log('Todas as colunas foram adicionadas com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar colunas:', error);
  } finally {
    await pool.end();
  }
}

adicionarColunas();