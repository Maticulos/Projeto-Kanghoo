-- ==========================================
-- MIGRAÇÃO: Adicionar campos de coordenadas para mapa interativo
-- ==========================================
-- Este script adiciona os campos necessários para exibir transportes no mapa

BEGIN;

-- 1. Adicionar coordenadas na tabela usuarios (localização do prestador)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS estado VARCHAR(2) DEFAULT 'SP';

-- 2. Adicionar coordenadas na tabela rotas_escolares (origem da rota)
ALTER TABLE rotas_escolares
ADD COLUMN IF NOT EXISTS latitude_origem DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude_origem DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS latitude_destino DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude_destino DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS endereco_origem TEXT,
ADD COLUMN IF NOT EXISTS endereco_destino TEXT,
ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER,
ADD COLUMN IF NOT EXISTS capacidade_atual INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_rota VARCHAR(20) DEFAULT 'ativa' CHECK (status_rota IN ('ativa', 'inativa', 'suspensa'));

-- 3. Adicionar coordenadas na tabela pacotes_excursao (ponto de partida)
ALTER TABLE pacotes_excursao
ADD COLUMN IF NOT EXISTS latitude_partida DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude_partida DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS endereco_partida TEXT,
ADD COLUMN IF NOT EXISTS latitude_destino DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude_destino DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS endereco_destino TEXT;

-- 4. Criar índices para melhorar performance de buscas geográficas
CREATE INDEX IF NOT EXISTS idx_usuarios_coordenadas ON usuarios(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rotas_coordenadas_origem ON rotas_escolares(latitude_origem, longitude_origem) WHERE latitude_origem IS NOT NULL AND longitude_origem IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pacotes_coordenadas ON pacotes_excursao(latitude_partida, longitude_partida) WHERE latitude_partida IS NOT NULL AND longitude_partida IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rotas_status ON rotas_escolares(status_rota, ativa);

-- 5. Atualizar capacidade_maxima baseado em vagas_disponiveis se não existir
UPDATE rotas_escolares 
SET capacidade_maxima = GREATEST(vagas_disponiveis, 10)
WHERE capacidade_maxima IS NULL;

-- 6. Atualizar status_rota baseado em ativa
UPDATE rotas_escolares
SET status_rota = CASE 
    WHEN ativa = true THEN 'ativa'
    ELSE 'inativa'
END
WHERE status_rota IS NULL;

COMMIT;

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================
SELECT 
    'usuarios' as tabela,
    COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as com_coordenadas,
    COUNT(*) as total
FROM usuarios
UNION ALL
SELECT 
    'rotas_escolares' as tabela,
    COUNT(*) FILTER (WHERE latitude_origem IS NOT NULL AND longitude_origem IS NOT NULL) as com_coordenadas,
    COUNT(*) as total
FROM rotas_escolares
UNION ALL
SELECT 
    'pacotes_excursao' as tabela,
    COUNT(*) FILTER (WHERE latitude_partida IS NOT NULL AND longitude_partida IS NOT NULL) as com_coordenadas,
    COUNT(*) as total
FROM pacotes_excursao;

