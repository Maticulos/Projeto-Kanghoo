const { Pool } = require('pg');
const path = require('path');
const logger = require('../utils/logger');

// Configuração do pool de conexões
let poolConfig;

if (process.env.DATABASE_URL) {
  // Se DATABASE_URL estiver disponível, use-a
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
    tipo_cadastro VARCHAR(50),
    tipo_usuario VARCHAR(50), -- escolar, excursao, etc.
    endereco_completo TEXT,
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
        ano_fabricacao INTEGER,
        cor VARCHAR(50),
        modelo VARCHAR(100),
        marca VARCHAR(100),
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

  // Tabela para características dos veículos
  const criarTabelaCaracteristicasVeiculosQuery = `
    CREATE TABLE IF NOT EXISTS caracteristicas_veiculos (
        id SERIAL PRIMARY KEY,
        veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE CASCADE,
        ar_condicionado BOOLEAN DEFAULT false,
        wifi BOOLEAN DEFAULT false,
        acessibilidade_pcd BOOLEAN DEFAULT false,
        gps_rastreamento BOOLEAN DEFAULT false,
        banheiro BOOLEAN DEFAULT false,
        tv_dvd BOOLEAN DEFAULT false,
        frigobar BOOLEAN DEFAULT false,
        poltronas_reclinaveis BOOLEAN DEFAULT false,
        cinto_seguranca BOOLEAN DEFAULT true,
        extintor BOOLEAN DEFAULT true,
        kit_primeiros_socorros BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabela para rotas escolares
  const criarTabelaRotasEscolaresQuery = `
    CREATE TABLE IF NOT EXISTS rotas_escolares (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nome_rota VARCHAR(255) NOT NULL,
        escola_destino VARCHAR(255),
        turno VARCHAR(20), -- manha, tarde, noite
        descricao TEXT,
        horario_ida TIME,
        horario_volta TIME,
        dias_semana VARCHAR(20) DEFAULT 'seg-sex', -- seg-sex, seg-sab, personalizado
        valor_mensal DECIMAL(10, 2),
        preco_mensal DECIMAL(10, 2),
        vagas_disponiveis INTEGER DEFAULT 0,
        ativa BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabela para pacotes de excursão
  const criarTabelaPacotesExcursaoQuery = `
    CREATE TABLE IF NOT EXISTS pacotes_excursao (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nome_pacote VARCHAR(255) NOT NULL,
        descricao TEXT,
        destino VARCHAR(255),
        data_saida DATE,
        data_retorno DATE,
        data_inicio DATE,
        data_fim DATE,
        duracao_dias INTEGER,
        horario_saida TIME,
        horario_retorno TIME,
        valor_por_pessoa DECIMAL(10, 2),
        preco_por_pessoa DECIMAL(10, 2),
        vagas_disponiveis INTEGER DEFAULT 0,
        inclui_alimentacao BOOLEAN DEFAULT false,
        inclui_hospedagem BOOLEAN DEFAULT false,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabela para avaliações
  const criarTabelaAvaliacoesQuery = `
    CREATE TABLE IF NOT EXISTS avaliacoes (
        id SERIAL PRIMARY KEY,
        avaliador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        avaliado_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nota INTEGER CHECK (nota >= 1 AND nota <= 5) NOT NULL,
        comentario TEXT,
        anonimo BOOLEAN DEFAULT false,
        aprovado BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    await pool.query(criarTabelaCaracteristicasVeiculosQuery);
    await pool.query(criarTabelaEmpresasQuery);
    await pool.query(criarTabelaContatosQuery);
    await pool.query(criarTabelaCriancasQuery);
    await pool.query(criarTabelaRotasEscolaresQuery);
    await pool.query(criarTabelaPacotesExcursaoQuery);
    await pool.query(criarTabelaAvaliacoesQuery);
    await pool.query(criarTabelaRotasQuery);
    await pool.query(criarTabelaPontosParadaQuery);
    await pool.query(criarTabelaHistoricoTransportesQuery);
    await pool.query(criarTabelaRastreamentoQuery);
    logger.info('Tabelas verificadas/criadas com sucesso.');
  } catch (error) {
    logger.error('Erro ao criar as tabelas:', error);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  criarTabelas,
};