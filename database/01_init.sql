-- Setup inicial do banco
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo_cadastro VARCHAR(50) NOT NULL,
    telefone VARCHAR(20),
    celular VARCHAR(20),
    endereco TEXT,
    tipo_usuario VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planos_assinatura (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
    tipo_plano VARCHAR(50) DEFAULT 'basico',
    limite_rotas INTEGER DEFAULT 3,
    limite_usuarios INTEGER DEFAULT 50,
    data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS criancas (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    data_nascimento DATE,
    endereco_residencial TEXT,
    escola VARCHAR(255),
    endereco_escola TEXT,
    responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    cpf VARCHAR(14) UNIQUE,
    idade INTEGER,
    nome_responsavel VARCHAR(255),
    telefone_responsavel VARCHAR(20),
    email_responsavel VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rotas_escolares (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_rota VARCHAR(255) NOT NULL,
    descricao TEXT,
    escola_destino TEXT,
    turno VARCHAR(50),
    horario_ida TIME,
    horario_volta TIME,
    dias_semana VARCHAR(50),
    preco_mensal DECIMAL(10,2),
    vagas_disponiveis INTEGER,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS criancas_rotas (
    id SERIAL PRIMARY KEY,
    crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
    rota_id INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    endereco_embarque TEXT,
    endereco_desembarque TEXT,
    latitude_embarque DECIMAL(10,8),
    longitude_embarque DECIMAL(11,8),
    latitude_desembarque DECIMAL(10,8),
    longitude_desembarque DECIMAL(11,8),
    horario_embarque_previsto TIME,
    horario_desembarque_previsto TIME,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(crianca_id, rota_id)
);
