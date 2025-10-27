-- PARTE 1: Criação das novas tabelas
-- Script de melhorias para o sistema de rotas escolares

-- 1. Criar tabela de planos de assinatura
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
);

-- Índices para planos_assinatura
CREATE INDEX IF NOT EXISTS idx_planos_usuario ON planos_assinatura(usuario_id);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON planos_assinatura(ativo);
CREATE INDEX IF NOT EXISTS idx_planos_tipo ON planos_assinatura(tipo_plano);

-- 2. Criar tabela de relacionamento crianças-rotas
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
);

-- Índices para criancas_rotas
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_crianca ON criancas_rotas(crianca_id);
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_rota ON criancas_rotas(rota_id);
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_ativo ON criancas_rotas(ativo);

-- 3. Criar tabela de veículos
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
);

-- Índices para veículos
CREATE INDEX IF NOT EXISTS idx_veiculos_usuario ON veiculos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo);

-- Inserir planos básicos para usuários existentes que não têm plano
INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios)
SELECT id, 'basico', 3, 50
FROM usuarios 
WHERE id NOT IN (SELECT usuario_id FROM planos_assinatura)
ON CONFLICT DO NOTHING;

COMMIT;