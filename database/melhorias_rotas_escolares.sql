BEGIN;

-- Tabela para rastrear viagens ativas em tempo real
CREATE TABLE IF NOT EXISTS viagens_ativas (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id),
    veiculo_id INTEGER NOT NULL REFERENCES veiculos(id),
    motorista_id INTEGER NOT NULL REFERENCES usuarios(id),
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'em_andamento', -- em_andamento, concluida, cancelada
    odometro_inicial INTEGER,
    odometro_final INTEGER,
    distancia_percorrida_km DECIMAL(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_viagens_ativas_rota_id ON viagens_ativas(rota_id);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_status ON viagens_ativas(status);

-- Tabela para registrar a conferência (embarque/desembarque) de crianças
CREATE TABLE IF NOT EXISTS conferencia_criancas (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER NOT NULL REFERENCES viagens_ativas(id),
    crianca_id INTEGER NOT NULL REFERENCES criancas(id),
    -- 'embarque_ida', 'desembarque_ida', 'embarque_volta', 'desembarque_volta'
    tipo_conferencia VARCHAR(50) NOT NULL,
    horario TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    responsavel_conferencia_id INTEGER REFERENCES usuarios(id), -- ID do motorista ou monitor
    confirmado_pelos_pais BOOLEAN DEFAULT false,
    notificacao_enviada BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_conferencia_criancas_viagem_id ON conferencia_criancas(viagem_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_criancas_crianca_id ON conferencia_criancas(crianca_id);

-- Adicionar colunas na tabela de crianças para controle dos pais
ALTER TABLE criancas
ADD COLUMN IF NOT EXISTS notificar_embarque BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notificar_desembarque BOOLEAN DEFAULT true;


COMMIT;