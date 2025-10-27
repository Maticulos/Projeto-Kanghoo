-- PARTE 2: Atualização das tabelas existentes
-- Script para adicionar novas colunas às tabelas existentes

-- 1. Adicionar novas colunas à tabela rotas_escolares
ALTER TABLE rotas_escolares 
ADD COLUMN IF NOT EXISTS tipo_rota VARCHAR(50) DEFAULT 'ida_volta',
ADD COLUMN IF NOT EXISTS endereco_origem TEXT,
ADD COLUMN IF NOT EXISTS endereco_destino TEXT,
ADD COLUMN IF NOT EXISTS latitude_origem DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude_origem DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS latitude_destino DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude_destino DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS capacidade_atual INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_rota VARCHAR(20) DEFAULT 'ativa',
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Adicionar novas colunas à tabela veiculos (se necessário)
ALTER TABLE veiculos 
ADD COLUMN IF NOT EXISTS capacidade INTEGER,
ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(50) DEFAULT 'van',
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Atualizar capacidade dos veículos baseado na lotacao_maxima existente
UPDATE veiculos 
SET capacidade = lotacao_maxima 
WHERE capacidade IS NULL AND lotacao_maxima IS NOT NULL;

-- 4. Criar índices adicionais para rotas_escolares
CREATE INDEX IF NOT EXISTS idx_rotas_tipo ON rotas_escolares(tipo_rota);
CREATE INDEX IF NOT EXISTS idx_rotas_status ON rotas_escolares(status_rota);
CREATE INDEX IF NOT EXISTS idx_rotas_capacidade ON rotas_escolares(capacidade_atual, capacidade_maxima);

-- 5. Criar índices para veículos (agora que a coluna ativo existe)
CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo);
CREATE INDEX IF NOT EXISTS idx_veiculos_tipo ON veiculos(tipo_veiculo);

-- 6. Atualizar dados existentes
-- Definir capacidade padrão para rotas existentes
UPDATE rotas_escolares 
SET capacidade_maxima = COALESCE(vagas_disponiveis, 10),
    capacidade_atual = 0
WHERE capacidade_maxima IS NULL;

-- Definir status das rotas baseado no campo ativa
UPDATE rotas_escolares 
SET status_rota = CASE 
    WHEN ativa = false THEN 'inativa'
    ELSE 'ativa'
END
WHERE status_rota = 'ativa';

COMMIT;