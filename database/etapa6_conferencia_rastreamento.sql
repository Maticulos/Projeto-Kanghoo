-- ==========================================
-- ETAPA 6: SISTEMA DE CONFERÊNCIA E RASTREAMENTO
-- Estrutura de banco de dados para conferência de crianças e rastreamento GPS
-- ==========================================

-- 1. Tabela de viagens ativas (sessões de transporte)
CREATE TABLE IF NOT EXISTS viagens_ativas (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    veiculo_id INTEGER, -- Referência para tabela de veículos (se existir)
    
    -- Dados da viagem
    data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
    horario_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
    horario_fim TIMESTAMP,
    quilometragem_inicial DECIMAL(10, 2),
    quilometragem_final DECIMAL(10, 2),
    quilometragem_percorrida DECIMAL(10, 2) GENERATED ALWAYS AS (quilometragem_final - quilometragem_inicial) STORED,
    
    -- Status da viagem
    status VARCHAR(20) DEFAULT 'iniciada' CHECK (status IN ('iniciada', 'em_andamento', 'pausada', 'finalizada', 'cancelada')),
    tipo_viagem VARCHAR(20) DEFAULT 'ida' CHECK (tipo_viagem IN ('ida', 'volta')),
    
    -- Cálculos automáticos
    combustivel_estimado DECIMAL(8, 3), -- em litros
    valor_combustivel DECIMAL(10, 2), -- em reais
    tempo_total_minutos INTEGER,
    velocidade_media DECIMAL(5, 2), -- km/h
    distancia_total_km DECIMAL(10, 3),
    
    -- Estatísticas
    total_paradas INTEGER DEFAULT 0,
    criancas_embarcadas INTEGER DEFAULT 0,
    criancas_desembarcadas INTEGER DEFAULT 0,
    criancas_ausentes INTEGER DEFAULT 0,
    
    -- Observações e emergências
    observacoes TEXT,
    emergencia_ativa BOOLEAN DEFAULT FALSE,
    detalhes_emergencia TEXT,
    
    -- Metadados
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela para definir paradas previstas de cada rota
CREATE TABLE IF NOT EXISTS paradas_rota (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    
    -- Localização da parada
    nome_parada VARCHAR(200) NOT NULL,
    endereco TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    raio_deteccao INTEGER DEFAULT 50, -- metros para detectar chegada
    
    -- Ordem e timing
    ordem_parada INTEGER NOT NULL, -- 1, 2, 3... ordem na rota
    horario_previsto_ida TIME,
    horario_previsto_volta TIME,
    tempo_parada_minutos INTEGER DEFAULT 2, -- tempo estimado de parada
    
    -- Tipo de parada
    tipo_parada VARCHAR(20) DEFAULT 'embarque' CHECK (tipo_parada IN ('embarque', 'desembarque', 'ambos', 'escola')),
    
    -- Status
    ativa BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    
    -- Metadados
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(rota_id, ordem_parada)
);

-- Tabela para registrar conferência de crianças (embarque/desembarque)
CREATE TABLE IF NOT EXISTS conferencia_criancas (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER NOT NULL REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    crianca_id INTEGER NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
    parada_id INTEGER REFERENCES paradas_rota(id) ON DELETE SET NULL,
    
    -- Evento de conferência
    tipo_evento VARCHAR(20) NOT NULL CHECK (tipo_evento IN ('embarque', 'desembarque', 'ausente', 'transferencia')),
    status_confirmacao VARCHAR(20) DEFAULT 'confirmado' CHECK (status_confirmacao IN ('confirmado', 'pendente', 'cancelado')),
    
    -- Dados do evento
    horario_evento TIMESTAMP NOT NULL DEFAULT NOW(),
    horario_previsto TIMESTAMP,
    atraso_minutos INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (horario_evento - horario_previsto))/60) STORED,
    
    -- Localização do evento
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    endereco_evento TEXT,
    precisao_gps DECIMAL(8, 2), -- em metros
    
    -- Responsável pela conferência
    conferido_por INTEGER NOT NULL REFERENCES usuarios(id), -- motorista ou monitor
    metodo_confirmacao VARCHAR(20) DEFAULT 'manual' CHECK (metodo_confirmacao IN ('manual', 'qr_code', 'nfc', 'biometria')),
    
    -- Observações e detalhes
    observacoes TEXT,
    foto_confirmacao TEXT, -- caminho para foto (opcional)
    assinatura_digital TEXT, -- hash da assinatura digital (opcional)
    
    -- Notificações
    notificacao_enviada BOOLEAN DEFAULT FALSE,
    responsaveis_notificados INTEGER[] DEFAULT '{}', -- array de IDs dos responsáveis notificados
    
    -- Metadados
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela para rastreamento GPS em tempo real
CREATE TABLE IF NOT EXISTS rastreamento_gps (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER NOT NULL REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    
    -- Dados de localização
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude DECIMAL(8, 2), -- em metros
    precisao DECIMAL(8, 2), -- em metros
    
    -- Dados de movimento
    velocidade DECIMAL(6, 2), -- km/h
    direcao DECIMAL(5, 2), -- graus (0-360)
    aceleracao DECIMAL(6, 3), -- m/s²
    
    -- Timestamp e fonte
    timestamp_gps TIMESTAMP NOT NULL,
    timestamp_servidor TIMESTAMP DEFAULT NOW(),
    fonte_dados VARCHAR(20) DEFAULT 'gps' CHECK (fonte_dados IN ('gps', 'network', 'passive')),
    
    -- Status do veículo
    veiculo_parado BOOLEAN DEFAULT FALSE,
    tempo_parado_segundos INTEGER DEFAULT 0,
    motor_ligado BOOLEAN,
    
    -- Dados do dispositivo
    dispositivo_id VARCHAR(100), -- ID único do dispositivo
    nivel_bateria INTEGER, -- 0-100%
    sinal_gps INTEGER, -- qualidade do sinal 0-100%
    
    -- Processamento
    processado BOOLEAN DEFAULT FALSE,
    parada_detectada INTEGER REFERENCES paradas_rota(id), -- se detectou parada próxima
    
    -- Metadados
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela para histórico de eventos da viagem
CREATE TABLE IF NOT EXISTS eventos_viagem (
    id SERIAL PRIMARY KEY,
    viagem_id INTEGER NOT NULL REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    
    -- Tipo de evento
    tipo_evento VARCHAR(50) NOT NULL, -- 'inicio_viagem', 'parada_detectada', 'crianca_embarcou', 'emergencia', etc.
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('sistema', 'motorista', 'crianca', 'emergencia', 'gps')),
    
    -- Dados do evento
    descricao TEXT NOT NULL,
    dados_extras JSONB, -- dados específicos do evento em formato JSON
    
    -- Localização (opcional)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    endereco TEXT,
    
    -- Usuário responsável (opcional)
    usuario_id INTEGER REFERENCES usuarios(id),
    crianca_id INTEGER REFERENCES criancas(id),
    
    -- Severidade e status
    severidade VARCHAR(20) DEFAULT 'info' CHECK (severidade IN ('info', 'warning', 'error', 'critical')),
    requer_acao BOOLEAN DEFAULT FALSE,
    resolvido BOOLEAN DEFAULT TRUE,
    
    -- Metadados
    timestamp_evento TIMESTAMP NOT NULL DEFAULT NOW(),
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Adicionar colunas à tabela de veículos existente (para informações de rastreamento)
-- Verificar se as colunas já existem antes de adicionar
DO $$
BEGIN
    -- Verificar se a tabela veículos existe, se não, criar
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'veiculos') THEN
        CREATE TABLE veiculos (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            
            -- Dados do veículo
            placa VARCHAR(10) NOT NULL UNIQUE,
            modelo VARCHAR(100) NOT NULL,
            marca VARCHAR(50) NOT NULL,
            ano INTEGER,
            cor VARCHAR(30),
            
            -- Capacidade e configuração
            capacidade_passageiros INTEGER NOT NULL DEFAULT 1,
            tipo_veiculo VARCHAR(30) DEFAULT 'van' CHECK (tipo_veiculo IN ('van', 'micro_onibus', 'onibus', 'carro')),
            
            -- Consumo e custos
            consumo_medio DECIMAL(5, 2) DEFAULT 10.0, -- km/l
            tipo_combustivel VARCHAR(20) DEFAULT 'gasolina' CHECK (tipo_combustivel IN ('gasolina', 'etanol', 'diesel', 'gnv', 'flex')),
            
            -- Documentação
            renavam VARCHAR(20),
            chassi VARCHAR(30),
            data_vencimento_cnh DATE,
            data_vencimento_seguro DATE,
            
            -- Status
            ativo BOOLEAN DEFAULT TRUE,
            verificado BOOLEAN DEFAULT FALSE,
            
            -- Metadados
            criado_em TIMESTAMP DEFAULT NOW(),
            atualizado_em TIMESTAMP DEFAULT NOW()
        );
    ELSE
        -- Adicionar colunas que podem não existir
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS consumo_medio DECIMAL(5, 2) DEFAULT 10.0;
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tipo_combustivel VARCHAR(20) DEFAULT 'gasolina';
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS capacidade_passageiros INTEGER DEFAULT 1;
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(30) DEFAULT 'van';
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS renavam VARCHAR(20);
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS chassi VARCHAR(30);
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS data_vencimento_cnh DATE;
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS data_vencimento_seguro DATE;
        ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índices para viagens_ativas
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_rota ON viagens_ativas(rota_id);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_usuario ON viagens_ativas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_status ON viagens_ativas(status);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_data ON viagens_ativas(data_viagem);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_horario_inicio ON viagens_ativas(horario_inicio);

-- Índices para paradas_rota
CREATE INDEX IF NOT EXISTS idx_paradas_rota_rota ON paradas_rota(rota_id);
CREATE INDEX IF NOT EXISTS idx_paradas_rota_ordem ON paradas_rota(rota_id, ordem_parada);
CREATE INDEX IF NOT EXISTS idx_paradas_rota_localizacao ON paradas_rota(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_paradas_rota_ativa ON paradas_rota(ativa);

-- Índices para conferencia_criancas
CREATE INDEX IF NOT EXISTS idx_conferencia_viagem ON conferencia_criancas(viagem_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_crianca ON conferencia_criancas(crianca_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_tipo_evento ON conferencia_criancas(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_conferencia_horario ON conferencia_criancas(horario_evento);
CREATE INDEX IF NOT EXISTS idx_conferencia_status ON conferencia_criancas(status_confirmacao);

-- Índices para rastreamento_gps
CREATE INDEX IF NOT EXISTS idx_rastreamento_viagem ON rastreamento_gps(viagem_id);
CREATE INDEX IF NOT EXISTS idx_rastreamento_timestamp ON rastreamento_gps(timestamp_gps);
CREATE INDEX IF NOT EXISTS idx_rastreamento_localizacao ON rastreamento_gps(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_rastreamento_processado ON rastreamento_gps(processado);
CREATE INDEX IF NOT EXISTS idx_rastreamento_parado ON rastreamento_gps(veiculo_parado);

-- Índices para eventos_viagem
CREATE INDEX IF NOT EXISTS idx_eventos_viagem ON eventos_viagem(viagem_id);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_viagem(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_categoria ON eventos_viagem(categoria);
CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON eventos_viagem(timestamp_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_severidade ON eventos_viagem(severidade);

-- Índices para veiculos
CREATE INDEX IF NOT EXISTS idx_veiculos_usuario ON veiculos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
-- Criar índice para ativo apenas se a coluna existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'ativo') THEN
        CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo);
    END IF;
END
$$;

-- ==========================================
-- TRIGGERS E FUNÇÕES
-- ==========================================

-- Função para atualizar timestamp de atualização
CREATE OR REPLACE FUNCTION atualizar_timestamp_modificacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER trigger_viagens_ativas_updated
    BEFORE UPDATE ON viagens_ativas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

CREATE TRIGGER trigger_paradas_rota_updated
    BEFORE UPDATE ON paradas_rota
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

CREATE TRIGGER trigger_conferencia_criancas_updated
    BEFORE UPDATE ON conferencia_criancas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

CREATE TRIGGER trigger_veiculos_updated
    BEFORE UPDATE ON veiculos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

-- Função para atualizar estatísticas da viagem
CREATE OR REPLACE FUNCTION atualizar_estatisticas_viagem()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE viagens_ativas 
    SET 
        criancas_embarcadas = (
            SELECT COUNT(*) 
            FROM conferencia_criancas 
            WHERE viagem_id = NEW.viagem_id 
            AND tipo_evento = 'embarque' 
            AND status_confirmacao = 'confirmado'
        ),
        criancas_desembarcadas = (
            SELECT COUNT(*) 
            FROM conferencia_criancas 
            WHERE viagem_id = NEW.viagem_id 
            AND tipo_evento = 'desembarque' 
            AND status_confirmacao = 'confirmado'
        ),
        criancas_ausentes = (
            SELECT COUNT(*) 
            FROM conferencia_criancas 
            WHERE viagem_id = NEW.viagem_id 
            AND tipo_evento = 'ausente' 
            AND status_confirmacao = 'confirmado'
        ),
        atualizado_em = NOW()
    WHERE id = NEW.viagem_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estatísticas quando há conferência
CREATE TRIGGER trigger_atualizar_estatisticas_conferencia
    AFTER INSERT OR UPDATE OR DELETE ON conferencia_criancas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_estatisticas_viagem();

-- Função para detectar paradas próximas
CREATE OR REPLACE FUNCTION detectar_parada_proxima(
    p_viagem_id INTEGER,
    p_latitude DECIMAL(10,8),
    p_longitude DECIMAL(11,8)
) RETURNS INTEGER AS $$
DECLARE
    parada_proxima INTEGER;
    distancia_minima DECIMAL;
BEGIN
    -- Buscar a parada mais próxima dentro do raio de detecção
    SELECT p.id INTO parada_proxima
    FROM paradas_rota p
    INNER JOIN viagens_ativas v ON v.rota_id = p.rota_id
    WHERE v.id = p_viagem_id
    AND p.ativa = TRUE
    AND (
        6371 * acos(
            cos(radians(p_latitude)) * 
            cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(p_longitude)) + 
            sin(radians(p_latitude)) * 
            sin(radians(p.latitude))
        ) * 1000
    ) <= p.raio_deteccao
    ORDER BY (
        6371 * acos(
            cos(radians(p_latitude)) * 
            cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(p_longitude)) + 
            sin(radians(p_latitude)) * 
            sin(radians(p.latitude))
        ) * 1000
    ) ASC
    LIMIT 1;
    
    RETURN parada_proxima;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- VIEWS ÚTEIS
-- ==========================================

-- View para viagens ativas com informações completas
CREATE OR REPLACE VIEW v_viagens_completas AS
SELECT 
    va.*,
    re.nome_rota,
    re.escola_destino,
    u.nome_completo as motorista_nome,
    u.celular as motorista_telefone,
    v.placa as veiculo_placa,
    v.modelo as veiculo_modelo
FROM viagens_ativas va
LEFT JOIN rotas_escolares re ON re.id = va.rota_id
LEFT JOIN usuarios u ON u.id = va.usuario_id
LEFT JOIN veiculos v ON v.id = va.veiculo_id;

-- View para posições atuais dos veículos
CREATE OR REPLACE VIEW v_posicoes_atuais AS
SELECT 
    rg.viagem_id,
    rg.latitude,
    rg.longitude,
    rg.velocidade,
    rg.timestamp_gps,
    rg.veiculo_parado,
    va.status as status_viagem,
    va.usuario_id,
    re.nome_rota,
    u.nome_completo as motorista_nome,
    v.placa as veiculo_placa
FROM rastreamento_gps rg
INNER JOIN viagens_ativas va ON va.id = rg.viagem_id
LEFT JOIN rotas_escolares re ON re.id = va.rota_id
LEFT JOIN usuarios u ON u.id = va.usuario_id
LEFT JOIN veiculos v ON v.id = va.veiculo_id
WHERE rg.id IN (
    SELECT MAX(id) 
    FROM rastreamento_gps 
    GROUP BY viagem_id
);

-- ==========================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ==========================================

-- Inserir alguns dados de exemplo para testes
-- (Comentado para evitar duplicação em execuções múltiplas)

/*
-- Exemplo de veículo
INSERT INTO veiculos (usuario_id, placa, modelo, marca, ano, capacidade_passageiros, consumo_medio, tipo_combustivel)
SELECT 1, 'ABC-1234', 'Sprinter', 'Mercedes-Benz', 2020, 15, 8.5, 'diesel'
WHERE NOT EXISTS (SELECT 1 FROM veiculos WHERE placa = 'ABC-1234');

-- Exemplo de paradas para uma rota
INSERT INTO paradas_rota (rota_id, nome_parada, endereco, latitude, longitude, ordem_parada, tipo_parada)
SELECT 1, 'Parada Central', 'Praça Central, 123', -23.5505, -46.6333, 1, 'embarque'
WHERE NOT EXISTS (SELECT 1 FROM paradas_rota WHERE rota_id = 1 AND ordem_parada = 1);
*/

-- ==========================================
-- COMENTÁRIOS FINAIS
-- ==========================================

-- Este script cria toda a estrutura necessária para:
-- 1. Gerenciar viagens ativas com rastreamento completo
-- 2. Definir paradas de rota com detecção automática
-- 3. Registrar conferência de crianças (embarque/desembarque)
-- 4. Armazenar dados GPS em tempo real
-- 5. Manter histórico completo de eventos
-- 6. Gerenciar informações de veículos

-- Para executar este script:
-- psql -d nome_do_banco -f etapa6_conferencia_rastreamento.sql

COMMIT;