const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  // Para autenticação do Windows
  ssl: false,
  connectionTimeoutMillis: 5000,
});

// Função para criar TODAS as tabelas necessárias
const criarTabelas = async () => {
  const criarTabelaUsuariosQuery = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    celular VARCHAR(20),
    data_nascimento DATE,
    tipo_cadastro VARCHAR(50), -- <-- ADICIONE ESTA LINHA
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

  // Adicione outras tabelas como 'veiculos', 'empresas', etc., conforme sua necessidade.
  // Exemplo para veículos:
  const criarTabelaVeiculosQuery = `
    CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        placa VARCHAR(10) NOT NULL,
        renavam VARCHAR(20) NOT NULL,
        lotacao_maxima INTEGER,
        -- Adicione todos os outros campos do formulário do veículo aqui
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
 // NOVA TABELA PARA DADOS DA EMPRESA
  const criarTabelaEmpresasQuery = `
    CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        razao_social VARCHAR(255) NOT NULL,
        nome_fantasia VARCHAR(255),
        cnpj VARCHAR(20) UNIQUE NOT NULL,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  // Tabela para mensagens de contato do site
  const criarTabelaContatosQuery = `
    CREATE TABLE IF NOT EXISTS contatos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        telefone VARCHAR(30),
        assunto VARCHAR(255),
        mensagem TEXT NOT NULL,
        origem VARCHAR(50),
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabela para crianças cadastradas
  const criarTabelaCriancasQuery = `
    CREATE TABLE IF NOT EXISTS criancas (
        id SERIAL PRIMARY KEY,
        nome_completo VARCHAR(255) NOT NULL,
        data_nascimento DATE NOT NULL,
        endereco_residencial TEXT NOT NULL,
        escola VARCHAR(255) NOT NULL,
        endereco_escola TEXT NOT NULL,
        responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        motorista_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        rota_id INTEGER,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabela para rotas de transporte
  const criarTabelaRotasQuery = `
    CREATE TABLE IF NOT EXISTS rotas (
        id SERIAL PRIMARY KEY,
        motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nome_rota VARCHAR(255) NOT NULL,
        descricao TEXT,
        horario_inicio TIME NOT NULL,
        horario_fim TIME,
        dias_semana VARCHAR(20) NOT NULL, -- Ex: "1,2,3,4,5" para seg-sex
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabela para pontos de parada das rotas
  const criarTabelaPontosParadaQuery = `
    CREATE TABLE IF NOT EXISTS pontos_parada (
        id SERIAL PRIMARY KEY,
        rota_id INTEGER REFERENCES rotas(id) ON DELETE CASCADE,
        endereco TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        horario_previsto TIME,
        ordem_parada INTEGER NOT NULL,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabela para histórico de transportes
  const criarTabelaHistoricoTransportesQuery = `
    CREATE TABLE IF NOT EXISTS historico_transportes (
        id SERIAL PRIMARY KEY,
        crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
        motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        rota_id INTEGER REFERENCES rotas(id) ON DELETE CASCADE,
        data_transporte DATE NOT NULL,
        horario_embarque TIMESTAMP WITH TIME ZONE,
        horario_desembarque TIMESTAMP WITH TIME ZONE,
        local_embarque TEXT,
        local_desembarque TEXT,
        latitude_embarque DECIMAL(10, 8),
        longitude_embarque DECIMAL(11, 8),
        latitude_desembarque DECIMAL(10, 8),
        longitude_desembarque DECIMAL(11, 8),
        status VARCHAR(50) DEFAULT 'agendado', -- agendado, em_andamento, concluido, cancelado
        observacoes TEXT,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabela para rastreamento em tempo real
  const criarTabelaRastreamentoQuery = `
    CREATE TABLE IF NOT EXISTS rastreamento (
        id SERIAL PRIMARY KEY,
        motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        rota_id INTEGER REFERENCES rotas(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        velocidade DECIMAL(5, 2),
        direcao INTEGER,
        timestamp_localizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ativo BOOLEAN DEFAULT true
    );
  `;
  
  try {
    await pool.query(criarTabelaUsuariosQuery);
    await pool.query(criarTabelaVeiculosQuery);
    await pool.query(criarTabelaEmpresasQuery);
    await pool.query(criarTabelaContatosQuery);
    await pool.query(criarTabelaCriancasQuery);
    await pool.query(criarTabelaRotasQuery);
    await pool.query(criarTabelaPontosParadaQuery);
    await pool.query(criarTabelaHistoricoTransportesQuery);
    await pool.query(criarTabelaRastreamentoQuery);
    console.log('Tabelas verificadas/criadas com sucesso.');
  } catch (error) {
    console.error('Erro ao criar as tabelas:', error);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  criarTabelas,
};