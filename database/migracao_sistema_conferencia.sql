-- ==========================================
-- MIGRAÇÃO: Sistema de Conferência de Crianças
-- ==========================================
-- Este script cria as tabelas necessárias para o sistema de conferência

BEGIN;

-- ==========================================
-- 1. Tabela: viagens_ativas
-- ==========================================
CREATE TABLE IF NOT EXISTS viagens_ativas (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    motorista_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_viagem VARCHAR(10) NOT NULL CHECK (tipo_viagem IN ('ida', 'volta')),
    data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
    horario_inicio TIMESTAMP WITH TIME ZONE,
    horario_fim TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'iniciada' CHECK (status IN ('iniciada', 'em_andamento', 'finalizada', 'cancelada')),
    quilometragem_inicial DECIMAL(10, 2),
    quilometragem_final DECIMAL(10, 2),
    quilometragem_total DECIMAL(10, 2),
    combustivel_gasto DECIMAL(8, 2),
    tempo_total_minutos INTEGER,
    total_criancas_esperadas INTEGER DEFAULT 0,
    total_criancas_embarcadas INTEGER DEFAULT 0,
    total_criancas_desembarcadas INTEGER DEFAULT 0,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para viagens_ativas
CREATE INDEX IF NOT EXISTS idx_viagens_rota ON viagens_ativas(rota_id);
CREATE INDEX IF NOT EXISTS idx_viagens_motorista ON viagens_ativas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_status ON viagens_ativas(status);
CREATE INDEX IF NOT EXISTS idx_viagens_data ON viagens_ativas(data_viagem);

-- ==========================================
-- 2. Tabela: conferencia_criancas
-- ==========================================
CREATE TABLE IF NOT EXISTS conferencia_criancas (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER NOT NULL REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    crianca_id INTEGER NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(15) NOT NULL CHECK (tipo_evento IN ('embarque', 'desembarque')),
    horario_previsto TIMESTAMP WITH TIME ZONE,
    horario_real TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    endereco TEXT,
    confirmado BOOLEAN DEFAULT false,
    observacoes TEXT,
    notificacao_enviada BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para conferencia_criancas
CREATE INDEX IF NOT EXISTS idx_conferencia_viagem ON conferencia_criancas(viagem_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_crianca ON conferencia_criancas(crianca_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_tipo ON conferencia_criancas(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_conferencia_confirmado ON conferencia_criancas(confirmado);

-- ==========================================
-- 3. Tabela: rastreamento_gps
-- ==========================================
CREATE TABLE IF NOT EXISTS rastreamento_gps (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER NOT NULL REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    velocidade DECIMAL(5, 2),
    direcao INTEGER, -- graus (0-360)
    precisao DECIMAL(8, 2),
    altitude DECIMAL(8, 2),
    timestamp_gps TIMESTAMP WITH TIME ZONE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para rastreamento_gps
CREATE INDEX IF NOT EXISTS idx_gps_viagem ON rastreamento_gps(viagem_id);
CREATE INDEX IF NOT EXISTS idx_gps_timestamp ON rastreamento_gps(timestamp_gps);
-- Nota: Índice espacial removido (requer extensão PostGIS)

-- ==========================================
-- 4. Tabela: paradas_rota
-- ==========================================
CREATE TABLE IF NOT EXISTS paradas_rota (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    ordem_parada INTEGER NOT NULL,
    endereco TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    horario_previsto TIME,
    raio_deteccao INTEGER DEFAULT 50, -- metros
    tipo_parada VARCHAR(15) CHECK (tipo_parada IN ('embarque', 'desembarque', 'escola')),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rota_id, ordem_parada)
);

-- Índices para paradas_rota
CREATE INDEX IF NOT EXISTS idx_paradas_rota ON paradas_rota(rota_id);
CREATE INDEX IF NOT EXISTS idx_paradas_ordem ON paradas_rota(rota_id, ordem_parada);
CREATE INDEX IF NOT EXISTS idx_paradas_ativo ON paradas_rota(ativo);

-- ==========================================
-- 5. Função para atualizar timestamp de atualização
-- ==========================================
CREATE OR REPLACE FUNCTION atualizar_timestamp_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamp
CREATE TRIGGER trigger_atualizar_viagens_ativas
    BEFORE UPDATE ON viagens_ativas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_atualizacao();

CREATE TRIGGER trigger_atualizar_conferencia_criancas
    BEFORE UPDATE ON conferencia_criancas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_atualizacao();

CREATE TRIGGER trigger_atualizar_paradas_rota
    BEFORE UPDATE ON paradas_rota
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_atualizacao();

-- ==========================================
-- 6. Função para calcular quilometragem total
-- ==========================================
CREATE OR REPLACE FUNCTION calcular_quilometragem_total()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quilometragem_inicial IS NOT NULL AND NEW.quilometragem_final IS NOT NULL THEN
        NEW.quilometragem_total = NEW.quilometragem_final - NEW.quilometragem_inicial;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular quilometragem
CREATE TRIGGER trigger_calcular_quilometragem
    BEFORE INSERT OR UPDATE ON viagens_ativas
    FOR EACH ROW
    EXECUTE FUNCTION calcular_quilometragem_total();

COMMIT;

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================
SELECT 
    'viagens_ativas' as tabela,
    COUNT(*) as total_registros
FROM viagens_ativas
UNION ALL
SELECT 
    'conferencia_criancas',
    COUNT(*)
FROM conferencia_criancas
UNION ALL
SELECT 
    'rastreamento_gps',
    COUNT(*)
FROM rastreamento_gps
UNION ALL
SELECT 
    'paradas_rota',
    COUNT(*)
FROM paradas_rota;

