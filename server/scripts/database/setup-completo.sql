-- Script de configuração completa do banco de dados
DO $$
BEGIN
    -- Criar o banco de dados se não existir
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'transporte_escolar_prod') THEN
        CREATE DATABASE transporte_escolar_prod;
    END IF;
END
$$;

-- Conectar ao banco de dados
\c transporte_escolar_prod;

-- Criar o usuário se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'transporte_user') THEN
        CREATE USER transporte_user WITH PASSWORD 'SENHA_FORTE_AQUI';
    ELSE
        ALTER USER transporte_user WITH PASSWORD 'SENHA_FORTE_AQUI';
    END IF;
END
$$;

-- Garantir permissões
GRANT CONNECT ON DATABASE transporte_escolar_prod TO transporte_user;
GRANT USAGE ON SCHEMA public TO transporte_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO transporte_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO transporte_user;

-- Criar tabelas
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
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(20),
    inscricao_estadual VARCHAR(20),
    inscricao_municipal VARCHAR(20),
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(255),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rotas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    motorista_id INTEGER REFERENCES usuarios(id),
    nome_rota VARCHAR(255) NOT NULL,
    origem VARCHAR(255),
    destino VARCHAR(255),
    horario_ida TIME,
    horario_volta TIME,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS criancas (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email_responsavel VARCHAR(255) NOT NULL,
    responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    motorista_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    rota_id INTEGER REFERENCES rotas(id) ON DELETE SET NULL,
    idade VARCHAR(10),
    escola VARCHAR(255),
    endereco_embarque TEXT,
    endereco_desembarque TEXT,
    observacoes TEXT,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS viagens (
    id SERIAL PRIMARY KEY,
    motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    rota_id INTEGER REFERENCES rotas(id) ON DELETE CASCADE,
    data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
    horario_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    horario_fim TIMESTAMP WITH TIME ZONE,
    tipo_viagem VARCHAR(50) DEFAULT 'ida',
    status VARCHAR(50) DEFAULT 'iniciada',
    distancia_total DECIMAL(8, 2),
    tempo_total INTEGER,
    combustivel_inicial DECIMAL(5, 2),
    combustivel_final DECIMAL(5, 2),
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS localizacoes (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
    motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude DECIMAL(8, 2),
    velocidade DECIMAL(5, 2),
    direcao INTEGER,
    precisao DECIMAL(5, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    endereco TEXT,
    tipo_ponto VARCHAR(50) DEFAULT 'tracking',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS criancas_viagens (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
    crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
    horario_embarque TIMESTAMP WITH TIME ZONE,
    horario_desembarque TIMESTAMP WITH TIME ZONE,
    status_embarque VARCHAR(50),
    status_desembarque VARCHAR(50),
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planos_assinatura (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_plano VARCHAR(50) NOT NULL,
    limite_rotas INTEGER,
    limite_usuarios INTEGER,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_viagens_motorista_data ON viagens(motorista_id, data_viagem);
CREATE INDEX IF NOT EXISTS idx_viagens_status ON viagens(status);
CREATE INDEX IF NOT EXISTS idx_localizacoes_viagem ON localizacoes(viagem_id);
CREATE INDEX IF NOT EXISTS idx_localizacoes_timestamp ON localizacoes(timestamp);
CREATE INDEX IF NOT EXISTS idx_localizacoes_motorista ON localizacoes(motorista_id);
CREATE INDEX IF NOT EXISTS idx_criancas_responsavel ON criancas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_criancas_email ON criancas(email_responsavel);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo_cadastro);
CREATE INDEX IF NOT EXISTS idx_rotas_motorista ON rotas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_rotas_ativa ON rotas(ativa);

-- Conceder permissões nas novas tabelas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO transporte_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO transporte_user;