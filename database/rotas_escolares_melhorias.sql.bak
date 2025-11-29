-- MELHORIAS SISTEMA DE ROTAS ESCOLARES
-- Script para implementar todas as funcionalidades do plano de melhorias

-- =====================================================
-- 1. TABELA DE PLANOS DE ASSINATURA
-- =====================================================

CREATE TABLE IF NOT EXISTS planos_assinatura (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_plano VARCHAR(20) NOT NULL CHECK (tipo_plano IN ('basic', 'premium', 'enterprise')),
    limite_rotas INTEGER NOT NULL,
    limite_usuarios INTEGER NOT NULL,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_planos_usuario ON planos_assinatura(usuario_id);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON planos_assinatura(ativo);
CREATE INDEX IF NOT EXISTS idx_planos_tipo ON planos_assinatura(tipo_plano);

-- =====================================================
-- 2. ATUALIZAÇÃO DA TABELA ROTAS_ESCOLARES
-- =====================================================

-- Adicionar novos campos necessários
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS tipo_rota VARCHAR(10) CHECK (tipo_rota IN ('ida', 'volta'));
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS rota_ida_id INTEGER REFERENCES rotas_escolares(id);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS endereco_origem TEXT;
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS endereco_destino TEXT;
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS latitude_origem DECIMAL(10, 8);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS longitude_origem DECIMAL(11, 8);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS latitude_destino DECIMAL(10, 8);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS longitude_destino DECIMAL(11, 8);
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS capacidade_atual INTEGER DEFAULT 0;
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER;
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS status_rota VARCHAR(20) DEFAULT 'ativa' CHECK (status_rota IN ('ativa', 'inativa', 'pausada', 'lotada'));

-- Adicionar campos de auditoria se não existirem
ALTER TABLE rotas_escolares ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_rotas_usuario ON rotas_escolares(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rotas_ativa ON rotas_escolares(ativa);
CREATE INDEX IF NOT EXISTS idx_rotas_tipo ON rotas_escolares(tipo_rota);
CREATE INDEX IF NOT EXISTS idx_rotas_turno ON rotas_escolares(turno);
CREATE INDEX IF NOT EXISTS idx_rotas_escola ON rotas_escolares(escola_destino);
CREATE INDEX IF NOT EXISTS idx_rotas_status ON rotas_escolares(status_rota);

-- =====================================================
-- 3. TABELA CRIANCAS_ROTAS (RELACIONAMENTO)
-- =====================================================

CREATE TABLE IF NOT EXISTS criancas_rotas (
    id SERIAL PRIMARY KEY,
    crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
    rota_id INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    endereco_embarque TEXT NOT NULL,
    endereco_desembarque TEXT NOT NULL,
    latitude_embarque DECIMAL(10, 8),
    longitude_embarque DECIMAL(11, 8),
    latitude_desembarque DECIMAL(10, 8),
    longitude_desembarque DECIMAL(11, 8),
    horario_embarque_previsto TIME,
    horario_desembarque_previsto TIME,
    ordem_embarque INTEGER, -- Ordem na rota
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(crianca_id, rota_id) -- Uma criança por rota
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_crianca ON criancas_rotas(crianca_id);
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_rota ON criancas_rotas(rota_id);
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_ativo ON criancas_rotas(ativo);

-- =====================================================
-- 4. TABELA DE VEÍCULOS (PARA CAPACIDADE)
-- =====================================================

CREATE TABLE IF NOT EXISTS veiculos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    placa VARCHAR(10) NOT NULL UNIQUE,
    modelo VARCHAR(100),
    marca VARCHAR(50),
    ano INTEGER,
    cor VARCHAR(30),
    lotacao_maxima INTEGER NOT NULL DEFAULT 1,
    tipo_veiculo VARCHAR(30) DEFAULT 'van' CHECK (tipo_veiculo IN ('van', 'micro-onibus', 'onibus', 'carro')),
    documento_veiculo TEXT, -- Path para documento
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_veiculos_usuario ON veiculos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo);

-- =====================================================
-- 5. FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar capacidade atual da rota
CREATE OR REPLACE FUNCTION atualizar_capacidade_rota()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE rotas_escolares 
    SET 
        capacidade_atual = (
            SELECT COUNT(*) 
            FROM criancas_rotas 
            WHERE rota_id = COALESCE(NEW.rota_id, OLD.rota_id) AND ativo = true
        ),
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.rota_id, OLD.rota_id);
    
    -- Atualizar status da rota baseado na capacidade
    UPDATE rotas_escolares 
    SET status_rota = CASE 
        WHEN capacidade_atual >= capacidade_maxima THEN 'lotada'
        WHEN ativa = false THEN 'inativa'
        ELSE 'ativa'
    END
    WHERE id = COALESCE(NEW.rota_id, OLD.rota_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers para atualizar capacidade
DROP TRIGGER IF EXISTS trigger_capacidade_insert ON criancas_rotas;
DROP TRIGGER IF EXISTS trigger_capacidade_update ON criancas_rotas;
DROP TRIGGER IF EXISTS trigger_capacidade_delete ON criancas_rotas;

CREATE TRIGGER trigger_capacidade_insert
    AFTER INSERT ON criancas_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_capacidade_rota();

CREATE TRIGGER trigger_capacidade_update
    AFTER UPDATE ON criancas_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_capacidade_rota();

CREATE TRIGGER trigger_capacidade_delete
    AFTER DELETE ON criancas_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_capacidade_rota();

-- Função para atualizar timestamp de modificação
CREATE OR REPLACE FUNCTION atualizar_timestamp_modificacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar timestamps
DROP TRIGGER IF EXISTS trigger_rotas_timestamp ON rotas_escolares;
DROP TRIGGER IF EXISTS trigger_criancas_rotas_timestamp ON criancas_rotas;
DROP TRIGGER IF EXISTS trigger_veiculos_timestamp ON veiculos;

CREATE TRIGGER trigger_rotas_timestamp
    BEFORE UPDATE ON rotas_escolares
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

CREATE TRIGGER trigger_criancas_rotas_timestamp
    BEFORE UPDATE ON criancas_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

CREATE TRIGGER trigger_veiculos_timestamp
    BEFORE UPDATE ON veiculos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

-- =====================================================
-- 6. DADOS INICIAIS DE PLANOS
-- =====================================================

-- Inserir planos padrão para usuários existentes (apenas se não existirem)
INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios)
SELECT 
    u.id,
    CASE 
        WHEN u.tipo_cadastro = 'motorista_escolar' THEN 'basic'
        ELSE 'basic'
    END as tipo_plano,
    CASE 
        WHEN u.tipo_cadastro = 'motorista_escolar' THEN 10
        ELSE 5
    END as limite_rotas,
    CASE 
        WHEN u.tipo_cadastro = 'motorista_escolar' THEN 15
        ELSE 5
    END as limite_usuarios
FROM usuarios u
WHERE u.tipo_cadastro IN ('motorista_escolar', 'motorista_excursao')
AND NOT EXISTS (
    SELECT 1 FROM planos_assinatura p 
    WHERE p.usuario_id = u.id AND p.ativo = true
);

-- =====================================================
-- 7. VIEWS ÚTEIS PARA CONSULTAS
-- =====================================================

-- View para rotas com informações completas
CREATE OR REPLACE VIEW vw_rotas_completas AS
SELECT 
    r.*,
    u.nome as motorista_nome,
    u.telefone as motorista_telefone,
    u.email as motorista_email,
    v.placa as veiculo_placa,
    v.modelo as veiculo_modelo,
    v.lotacao_maxima as veiculo_capacidade,
    p.tipo_plano,
    p.limite_rotas,
    (SELECT COUNT(*) FROM criancas_rotas cr WHERE cr.rota_id = r.id AND cr.ativo = true) as total_criancas
FROM rotas_escolares r
LEFT JOIN usuarios u ON r.usuario_id = u.id
LEFT JOIN veiculos v ON v.usuario_id = u.id AND v.ativo = true
LEFT JOIN planos_assinatura p ON p.usuario_id = u.id AND p.ativo = true;

-- View para estatísticas de motoristas
CREATE OR REPLACE VIEW vw_estatisticas_motoristas AS
SELECT 
    u.id as usuario_id,
    u.nome,
    u.email,
    p.tipo_plano,
    p.limite_rotas,
    COUNT(r.id) as total_rotas,
    COUNT(CASE WHEN r.ativa = true THEN 1 END) as rotas_ativas,
    SUM(r.capacidade_atual) as total_criancas,
    AVG(r.valor_mensal) as valor_medio_mensal
FROM usuarios u
LEFT JOIN planos_assinatura p ON p.usuario_id = u.id AND p.ativo = true
LEFT JOIN rotas_escolares r ON r.usuario_id = u.id
WHERE u.tipo_cadastro = 'motorista_escolar'
GROUP BY u.id, u.nome, u.email, p.tipo_plano, p.limite_rotas;

-- =====================================================
-- 8. ATUALIZAÇÃO DE DADOS EXISTENTES
-- =====================================================

-- Atualizar capacidade máxima das rotas existentes baseado no veículo
UPDATE rotas_escolares 
SET capacidade_maxima = COALESCE((
    SELECT v.lotacao_maxima 
    FROM veiculos v 
    WHERE v.usuario_id = rotas_escolares.usuario_id 
    AND v.ativo = true 
    LIMIT 1
), 15) -- Valor padrão se não houver veículo cadastrado
WHERE capacidade_maxima IS NULL;

-- Atualizar capacidade atual das rotas existentes
UPDATE rotas_escolares 
SET capacidade_atual = COALESCE((
    SELECT COUNT(*) 
    FROM criancas_rotas cr 
    WHERE cr.rota_id = rotas_escolares.id 
    AND cr.ativo = true
), 0)
WHERE capacidade_atual IS NULL OR capacidade_atual = 0;

-- Atualizar status das rotas baseado na capacidade
UPDATE rotas_escolares 
SET status_rota = CASE 
    WHEN capacidade_atual >= capacidade_maxima THEN 'lotada'
    WHEN ativa = false THEN 'inativa'
    ELSE 'ativa'
END
WHERE status_rota IS NULL;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- Comentários finais:
-- Este script implementa toda a estrutura necessária para o sistema de rotas escolares
-- incluindo planos de assinatura, gestão de capacidade, relacionamentos e otimizações.