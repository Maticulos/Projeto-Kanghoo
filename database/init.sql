\if :{?DB_NAME}
  \set dbname :DB_NAME
\else
  \set dbname 'kanghoo_db_prod'
\endif

-- create database only when it is missing
SELECT 'CREATE DATABASE ' || quote_ident(:'dbname')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'dbname')\gexec

\connect :dbname

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===========================
-- Identity
-- ===========================
CREATE TABLE IF NOT EXISTS usuarios (
    id               SERIAL PRIMARY KEY,
    nome_completo    VARCHAR(255) NOT NULL,
    nome             VARCHAR(255),
    email            VARCHAR(255) NOT NULL UNIQUE,
    senha            VARCHAR(255) NOT NULL,
    celular          VARCHAR(20),
    telefone         VARCHAR(20),
    data_nascimento  DATE,
    tipo_cadastro    VARCHAR(50),
    tipo_usuario     VARCHAR(50),
    endereco_completo TEXT,
    endereco         TEXT,
    bairro           VARCHAR(100),
    cidade           VARCHAR(100),
    estado           VARCHAR(2),
    cep              VARCHAR(12),
    latitude         DECIMAL(10,8),
    longitude        DECIMAL(11,8),
    status_conta     VARCHAR(20) DEFAULT 'ativo',
    criado_em        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo_usuario);

CREATE TABLE IF NOT EXISTS usuarios_status (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_usuario   VARCHAR(50) NOT NULL,
    ativo          BOOLEAN DEFAULT TRUE,
    origem         VARCHAR(50) DEFAULT 'manual',
    motivo         TEXT,
    atualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_usuarios_status_usuario ON usuarios_status(usuario_id, ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_status_tipo ON usuarios_status(tipo_usuario);

CREATE TABLE IF NOT EXISTS contatos (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    telefone   VARCHAR(30),
    assunto    VARCHAR(255),
    mensagem   TEXT NOT NULL,
    origem     VARCHAR(50),
    criado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_contatos_email ON contatos(email);
CREATE INDEX IF NOT EXISTS idx_contatos_criado_em ON contatos(criado_em);

-- ===========================
-- Companies and vehicles
-- ===========================
CREATE TABLE IF NOT EXISTS empresas (
    id               SERIAL PRIMARY KEY,
    usuario_id       INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    razao_social     VARCHAR(255) NOT NULL,
    nome_fantasia    VARCHAR(255),
    cnpj             VARCHAR(20) UNIQUE NOT NULL,
    inscricao_estadual  VARCHAR(20),
    inscricao_municipal VARCHAR(20),
    endereco         TEXT,
    telefone         VARCHAR(20),
    email            VARCHAR(255),
    criado_em        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS veiculos (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    motorista_id   INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    placa          VARCHAR(10) NOT NULL UNIQUE,
    renavam        VARCHAR(20),
    lotacao_maxima INTEGER,
    capacidade     INTEGER,
    ano_fabricacao INTEGER,
    ano_modelo     INTEGER,
    cor            VARCHAR(50),
    modelo         VARCHAR(100),
    marca          VARCHAR(100),
    tipo_veiculo   VARCHAR(30),
    documento_veiculo TEXT,
    ativo          BOOLEAN DEFAULT TRUE,
    status         VARCHAR(20),
    criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_veiculos_usuario ON veiculos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_motorista ON veiculos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);

CREATE TABLE IF NOT EXISTS caracteristicas_veiculos (
    id                      SERIAL PRIMARY KEY,
    veiculo_id              INTEGER REFERENCES veiculos(id) ON DELETE CASCADE,
    ar_condicionado         BOOLEAN DEFAULT FALSE,
    wifi                    BOOLEAN DEFAULT FALSE,
    acessibilidade_pcd      BOOLEAN DEFAULT FALSE,
    gps_rastreamento        BOOLEAN DEFAULT FALSE,
    banheiro                BOOLEAN DEFAULT FALSE,
    tv_dvd                  BOOLEAN DEFAULT FALSE,
    frigobar                BOOLEAN DEFAULT FALSE,
    poltronas_reclinaveis   BOOLEAN DEFAULT FALSE,
    cinto_seguranca         BOOLEAN DEFAULT TRUE,
    extintor                BOOLEAN DEFAULT TRUE,
    kit_primeiros_socorros  BOOLEAN DEFAULT TRUE,
    cameras_seguranca       BOOLEAN DEFAULT FALSE,
    criado_em               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notificacoes (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo     VARCHAR(255) NOT NULL,
    mensagem   TEXT NOT NULL,
    tipo       VARCHAR(50),
    lida       BOOLEAN DEFAULT FALSE,
    criado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id, lida);

-- ===========================
-- Plans
-- ===========================
CREATE TABLE IF NOT EXISTS planos_assinatura (
    id               SERIAL PRIMARY KEY,
    usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_plano       VARCHAR(50) NOT NULL DEFAULT 'basico',
    limite_rotas     INTEGER DEFAULT 3,
    limite_usuarios  INTEGER DEFAULT 50,
    data_inicio      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    data_fim         TIMESTAMPTZ,
    ativo            BOOLEAN DEFAULT TRUE,
    criado_em        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_planos_usuario ON planos_assinatura(usuario_id);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON planos_assinatura(ativo);
CREATE INDEX IF NOT EXISTS idx_planos_tipo ON planos_assinatura(tipo_plano);

-- ===========================
-- Routes
-- ===========================
CREATE TABLE IF NOT EXISTS rotas (
    id             SERIAL PRIMARY KEY,
    motorista_id   INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_rota      VARCHAR(255) NOT NULL,
    descricao      TEXT,
    horario_inicio TIME NOT NULL,
    horario_fim    TIME,
    dias_semana    VARCHAR(20) NOT NULL,
    ativo          BOOLEAN DEFAULT TRUE,
    criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rotas_motorista ON rotas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_rotas_ativo ON rotas(ativo);

CREATE TABLE IF NOT EXISTS rotas_escolares (
    id                SERIAL PRIMARY KEY,
    usuario_id        INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_rota         VARCHAR(255) NOT NULL,
    descricao         TEXT,
    tipo_rota         VARCHAR(10) CHECK (tipo_rota IN ('ida','volta','ida_volta')),
    rota_ida_id       INTEGER REFERENCES rotas_escolares(id),
    escola_destino    VARCHAR(255),
    turno             VARCHAR(20),
    endereco_origem   TEXT,
    endereco_destino  TEXT,
    latitude_origem   DECIMAL(10,8),
    longitude_origem  DECIMAL(11,8),
    latitude_destino  DECIMAL(10,8),
    longitude_destino DECIMAL(11,8),
    horario_ida       TIME,
    horario_volta     TIME,
    dias_semana       VARCHAR(50) DEFAULT 'seg-sex',
    valor_mensal      DECIMAL(10,2),
    preco_mensal      DECIMAL(10,2),
    vagas_disponiveis INTEGER DEFAULT 0,
    capacidade_maxima INTEGER,
    capacidade_atual  INTEGER DEFAULT 0,
    status_rota       VARCHAR(20) DEFAULT 'ativa' CHECK (status_rota IN ('ativa','inativa','pausada','lotada','suspensa')),
    ativa             BOOLEAN DEFAULT TRUE,
    observacoes       TEXT,
    criado_em         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rotas_escolares_usuario ON rotas_escolares(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rotas_escolares_status ON rotas_escolares(status_rota, ativa);
CREATE INDEX IF NOT EXISTS idx_rotas_escolares_tipo ON rotas_escolares(tipo_rota);
CREATE INDEX IF NOT EXISTS idx_rotas_escolares_turno ON rotas_escolares(turno);

CREATE TABLE IF NOT EXISTS pontos_parada (
    id              SERIAL PRIMARY KEY,
    rota_id         INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    endereco        TEXT NOT NULL,
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    horario_previsto TIME,
    horario_ida     TIME,
    horario_volta   TIME,
    ordem_parada    INTEGER NOT NULL,
    raio_deteccao   INTEGER DEFAULT 50,
    tipo_parada     VARCHAR(15),
    ativo           BOOLEAN DEFAULT TRUE,
    criado_em       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pontos_parada_rota ON pontos_parada(rota_id);
CREATE INDEX IF NOT EXISTS idx_pontos_parada_ordem ON pontos_parada(ordem_parada);

-- ===========================
-- Kids
-- ===========================
CREATE TABLE IF NOT EXISTS criancas (
    id                    SERIAL PRIMARY KEY,
    nome_completo         VARCHAR(255) NOT NULL,
    data_nascimento       DATE,
    idade                 INTEGER,
    serie_ano             VARCHAR(50),
    endereco_residencial  TEXT,
    escola                VARCHAR(255),
    endereco_escola       TEXT,
    responsavel_id        INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    motorista_id          INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    rota_id               INTEGER REFERENCES rotas(id) ON DELETE SET NULL,
    cpf                   VARCHAR(14) UNIQUE,
    nome_responsavel      VARCHAR(255),
    telefone_responsavel  VARCHAR(20),
    email_responsavel     VARCHAR(255),
    foto_url              TEXT,
    ativo                 BOOLEAN DEFAULT TRUE,
    notificar_embarque    BOOLEAN DEFAULT TRUE,
    notificar_desembarque BOOLEAN DEFAULT TRUE,
    criado_em             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_criancas_responsavel ON criancas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_criancas_motorista ON criancas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_criancas_ativo ON criancas(ativo);

CREATE TABLE IF NOT EXISTS criancas_rotas (
    id                        SERIAL PRIMARY KEY,
    crianca_id                INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
    rota_id                   INTEGER REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    endereco_embarque         TEXT,
    endereco_desembarque      TEXT,
    latitude_embarque         DECIMAL(10,8),
    longitude_embarque        DECIMAL(11,8),
    latitude_desembarque      DECIMAL(10,8),
    longitude_desembarque     DECIMAL(11,8),
    horario_embarque          TIME,
    horario_desembarque       TIME,
    horario_embarque_previsto TIME,
    horario_desembarque_previsto TIME,
    ordem_embarque            INTEGER,
    observacoes               TEXT,
    ativo                     BOOLEAN DEFAULT TRUE,
    ativa                     BOOLEAN GENERATED ALWAYS AS (ativo) STORED,
    criado_em                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (crianca_id, rota_id)
);
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_crianca ON criancas_rotas(crianca_id);
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_rota ON criancas_rotas(rota_id);
CREATE INDEX IF NOT EXISTS idx_criancas_rotas_ativo ON criancas_rotas(ativo);

-- ===========================
-- Trips (legacy) and tracking
-- ===========================
CREATE TABLE IF NOT EXISTS viagens (
    id              SERIAL PRIMARY KEY,
    motorista_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rota_id         INTEGER REFERENCES rotas(id) ON DELETE SET NULL,
    tipo_viagem     VARCHAR(20) NOT NULL DEFAULT 'ida',
    status          VARCHAR(20) NOT NULL DEFAULT 'iniciada',
    data_viagem     DATE DEFAULT CURRENT_DATE,
    horario_inicio  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    horario_fim     TIMESTAMPTZ,
    distancia_total DECIMAL(10,2),
    tempo_total     INTEGER,
    observacoes     TEXT,
    criado_em       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_viagens_motorista ON viagens(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_status ON viagens(status);

CREATE TABLE IF NOT EXISTS criancas_viagens (
    id                    SERIAL PRIMARY KEY,
    viagem_id             INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
    crianca_id            INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
    embarcada             BOOLEAN DEFAULT FALSE,
    horario_embarque      TIMESTAMPTZ,
    horario_desembarque   TIMESTAMPTZ,
    local_embarque        TEXT,
    local_desembarque     TEXT,
    latitude_embarque     DECIMAL(10,8),
    longitude_embarque    DECIMAL(11,8),
    latitude_desembarque  DECIMAL(10,8),
    longitude_desembarque DECIMAL(11,8),
    status_embarque       VARCHAR(50),
    status_desembarque    VARCHAR(50),
    observacoes           TEXT,
    criado_em             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (viagem_id, crianca_id)
);
CREATE INDEX IF NOT EXISTS idx_criancas_viagens_viagem ON criancas_viagens(viagem_id);
CREATE INDEX IF NOT EXISTS idx_criancas_viagens_crianca ON criancas_viagens(crianca_id);

CREATE TABLE IF NOT EXISTS localizacoes (
    id           SERIAL PRIMARY KEY,
    viagem_id    INTEGER REFERENCES viagens(id) ON DELETE SET NULL,
    motorista_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rota_id      INTEGER REFERENCES rotas(id) ON DELETE SET NULL,
    latitude     DECIMAL(10,8) NOT NULL,
    longitude    DECIMAL(11,8) NOT NULL,
    velocidade   DECIMAL(5,2),
    direcao      INTEGER,
    precisao     DECIMAL(5,2),
    timestamp    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_localizacoes_viagem ON localizacoes(viagem_id);
CREATE INDEX IF NOT EXISTS idx_localizacoes_timestamp ON localizacoes(timestamp);
CREATE INDEX IF NOT EXISTS idx_localizacoes_motorista ON localizacoes(motorista_id);

CREATE TABLE IF NOT EXISTS eventos_viagem (
    id           SERIAL PRIMARY KEY,
    viagem_id    INTEGER NOT NULL REFERENCES viagens(id) ON DELETE CASCADE,
    crianca_id   INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
    tipo_evento  VARCHAR(50) NOT NULL,
    descricao    TEXT,
    dados_evento JSONB,
    latitude     DECIMAL(10,8),
    longitude    DECIMAL(11,8),
    criado_em    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rastreamento (
    id                    SERIAL PRIMARY KEY,
    motorista_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rota_id               INTEGER REFERENCES rotas(id) ON DELETE CASCADE,
    latitude              DECIMAL(10,8) NOT NULL,
    longitude             DECIMAL(11,8) NOT NULL,
    velocidade            DECIMAL(5,2),
    direcao               INTEGER,
    timestamp_localizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ativo                 BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_rastreamento_motorista ON rastreamento(motorista_id);
CREATE INDEX IF NOT EXISTS idx_rastreamento_rota ON rastreamento(rota_id);

-- ===========================
-- Active trips and GPS
-- ===========================
CREATE TABLE IF NOT EXISTS viagens_ativas (
    id                         SERIAL PRIMARY KEY,
    rota_id                    INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    motorista_id               INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    usuario_id                 INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    veiculo_id                 INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
    tipo_viagem                VARCHAR(10) NOT NULL DEFAULT 'ida',
    data_viagem                DATE NOT NULL DEFAULT CURRENT_DATE,
    data_inicio                TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    data_fim                   TIMESTAMPTZ,
    horario_inicio             TIMESTAMPTZ,
    horario_fim                TIMESTAMPTZ,
    status                     VARCHAR(20) DEFAULT 'em_andamento' CHECK (status IN ('agendada','iniciada','em_andamento','concluida','cancelada')),
    quilometragem_inicial      DECIMAL(10,2),
    quilometragem_final        DECIMAL(10,2),
    quilometragem_total        DECIMAL(10,2),
    odometro_inicial           DECIMAL(12,2),
    odometro_final             DECIMAL(12,2),
    distancia_percorrida_km    DECIMAL(12,3),
    combustivel_gasto          DECIMAL(8,2),
    tempo_total_minutos        INTEGER,
    total_criancas_esperadas   INTEGER DEFAULT 0,
    total_criancas_embarcadas  INTEGER DEFAULT 0,
    total_criancas_desembarcadas INTEGER DEFAULT 0,
    observacoes                TEXT,
    criado_em                  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_rota ON viagens_ativas(rota_id);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_motorista ON viagens_ativas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_usuario ON viagens_ativas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_viagens_ativas_status ON viagens_ativas(status);

CREATE TABLE IF NOT EXISTS conferencia_criancas (
    id                         SERIAL PRIMARY KEY,
    viagem_id                  INTEGER NOT NULL REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    crianca_id                 INTEGER NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
    tipo_evento                VARCHAR(20),
    tipo_conferencia           VARCHAR(50),
    status_conferencia         VARCHAR(30) DEFAULT 'aguardando',
    horario_previsto           TIMESTAMPTZ,
    horario_real               TIMESTAMPTZ,
    horario_embarque           TIMESTAMPTZ,
    horario_desembarque        TIMESTAMPTZ,
    latitude                   DECIMAL(10,8),
    longitude                  DECIMAL(11,8),
    latitude_embarque          DECIMAL(10,8),
    longitude_embarque         DECIMAL(11,8),
    latitude_desembarque       DECIMAL(10,8),
    longitude_desembarque      DECIMAL(11,8),
    endereco                   TEXT,
    confirmado                 BOOLEAN DEFAULT FALSE,
    observacoes                TEXT,
    notificacao_enviada        BOOLEAN DEFAULT FALSE,
    responsavel_conferencia_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em                  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conferencia_viagem ON conferencia_criancas(viagem_id);
CREATE INDEX IF NOT EXISTS idx_conferencia_crianca ON conferencia_criancas(crianca_id);

CREATE TABLE IF NOT EXISTS rastreamento_gps (
    id            SERIAL PRIMARY KEY,
    viagem_id     INTEGER REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    rota_id       INTEGER REFERENCES rotas_escolares(id) ON DELETE SET NULL,
    latitude      DECIMAL(10,8) NOT NULL,
    longitude     DECIMAL(11,8) NOT NULL,
    velocidade    DECIMAL(5,2),
    direcao       INTEGER,
    precisao      DECIMAL(8,2),
    altitude      DECIMAL(8,2),
    timestamp_gps TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rastreamento_gps_viagem ON rastreamento_gps(viagem_id);
CREATE INDEX IF NOT EXISTS idx_rastreamento_gps_usuario ON rastreamento_gps(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rastreamento_gps_timestamp ON rastreamento_gps(timestamp_gps);

CREATE TABLE IF NOT EXISTS paradas_rota (
    id             SERIAL PRIMARY KEY,
    rota_id        INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    ordem_parada   INTEGER NOT NULL,
    endereco       TEXT NOT NULL,
    latitude       DECIMAL(10,8) NOT NULL,
    longitude      DECIMAL(11,8) NOT NULL,
    horario_previsto TIME,
    raio_deteccao  INTEGER DEFAULT 50,
    tipo_parada    VARCHAR(15),
    ativo          BOOLEAN DEFAULT TRUE,
    criado_em      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rota_id, ordem_parada)
);
CREATE INDEX IF NOT EXISTS idx_paradas_rota_rota ON paradas_rota(rota_id);

CREATE TABLE IF NOT EXISTS cache_localizacao (
    id                 SERIAL PRIMARY KEY,
    motorista_id       INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    ultima_latitude    DECIMAL(10,8),
    ultima_longitude   DECIMAL(11,8),
    ultima_velocidade  DECIMAL(5,2),
    ultima_direcao     INTEGER,
    ultimo_endereco    TEXT,
    ultima_atualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status_online      BOOLEAN DEFAULT TRUE,
    viagem_ativa_id    INTEGER REFERENCES viagens_ativas(id) ON DELETE SET NULL,
    UNIQUE(motorista_id)
);

CREATE TABLE IF NOT EXISTS metricas_viagem (
    id                   SERIAL PRIMARY KEY,
    viagem_id            INTEGER REFERENCES viagens_ativas(id) ON DELETE CASCADE,
    motorista_id         INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    velocidade_media     DECIMAL(5,2),
    velocidade_maxima    DECIMAL(5,2),
    tempo_parado         INTEGER,
    tempo_movimento      INTEGER,
    distancia_percorrida DECIMAL(8,2),
    consumo_combustivel  DECIMAL(5,2),
    numero_paradas       INTEGER,
    numero_criancas      INTEGER,
    pontuacao_conduta    DECIMAL(3,1),
    data_calculo         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkins (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    rota_id    INTEGER,
    tipo       VARCHAR(50) NOT NULL,
    localizacao JSONB,
    observacoes TEXT,
    criado_em   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Notification preferences
-- ===========================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id                     SERIAL PRIMARY KEY,
    user_id                INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    embarque_desembarque   BOOLEAN DEFAULT TRUE,
    localizacao_tempo_real BOOLEAN DEFAULT TRUE,
    veiculo_chegando       BOOLEAN DEFAULT TRUE,
    emergencia             BOOLEAN DEFAULT TRUE,
    atraso_detectado       BOOLEAN DEFAULT TRUE,
    canais                 JSONB DEFAULT '["app"]'::jsonb,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_preferences UNIQUE (user_id),
    CONSTRAINT valid_canais CHECK (jsonb_typeof(canais) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at ON notification_preferences(updated_at);

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ===========================
-- Excursions
-- ===========================
CREATE TABLE IF NOT EXISTS pacotes_excursao (
    id                SERIAL PRIMARY KEY,
    usuario_id        INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_pacote       VARCHAR(255) NOT NULL,
    descricao         TEXT,
    destino           VARCHAR(255),
    data_excursao     DATE,
    data_saida        DATE,
    data_retorno      DATE,
    data_inicio       DATE,
    data_fim          DATE,
    duracao_dias      INTEGER,
    horario_saida     TIME,
    horario_retorno   TIME,
    ponto_encontro    TEXT,
    valor_por_pessoa  DECIMAL(10,2),
    preco_por_pessoa  DECIMAL(10,2),
    vagas_disponiveis INTEGER DEFAULT 0,
    inclui_alimentacao BOOLEAN DEFAULT FALSE,
    inclui_hospedagem BOOLEAN DEFAULT FALSE,
    ativo             BOOLEAN DEFAULT TRUE,
    latitude_partida  DECIMAL(10,8),
    longitude_partida DECIMAL(11,8),
    endereco_partida  TEXT,
    latitude_destino  DECIMAL(10,8),
    longitude_destino DECIMAL(11,8),
    endereco_destino  TEXT,
    criado_em         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pacotes_excursao_usuario ON pacotes_excursao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_excursao_ativo ON pacotes_excursao(ativo);

CREATE TABLE IF NOT EXISTS inscricoes_excursao (
    id                SERIAL PRIMARY KEY,
    pacote_id         INTEGER REFERENCES pacotes_excursao(id) ON DELETE CASCADE,
    usuario_id        INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    status_inscricao  VARCHAR(30) DEFAULT 'pendente',
    data_inscricao    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    observacoes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_inscricoes_pacote ON inscricoes_excursao(pacote_id);

CREATE TABLE IF NOT EXISTS cotacoes (
    id                 SERIAL PRIMARY KEY,
    solicitante_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    prestador_id       INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_servico       VARCHAR(50),
    descricao_servico  TEXT,
    data_inicio        DATE,
    data_fim           DATE,
    numero_passageiros INTEGER,
    endereco_origem    TEXT,
    endereco_destino   TEXT,
    observacoes        TEXT,
    criado_em          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Ratings
-- ===========================
CREATE TABLE IF NOT EXISTS avaliacoes (
    id           SERIAL PRIMARY KEY,
    avaliador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    avaliado_id  INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nota         INTEGER NOT NULL,
    comentario   TEXT,
    anonimo      BOOLEAN DEFAULT FALSE,
    aprovado     BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliado ON avaliacoes(avaliado_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_aprovado ON avaliacoes(aprovado);

-- ===========================
-- Views
-- ===========================
CREATE OR REPLACE VIEW vw_rotas_completas AS
SELECT 
    r.*,
    u.nome_completo AS motorista_nome,
    u.telefone AS motorista_telefone,
    u.email AS motorista_email,
    v.placa AS veiculo_placa,
    v.modelo AS veiculo_modelo,
    COALESCE(v.lotacao_maxima, v.capacidade) AS veiculo_capacidade,
    p.tipo_plano,
    p.limite_rotas,
    (SELECT COUNT(*) FROM criancas_rotas cr WHERE cr.rota_id = r.id AND cr.ativo = TRUE) AS total_criancas
FROM rotas_escolares r
LEFT JOIN usuarios u ON r.usuario_id = u.id
LEFT JOIN veiculos v ON v.usuario_id = u.id AND v.ativo = TRUE
LEFT JOIN planos_assinatura p ON p.usuario_id = u.id AND p.ativo = TRUE;

CREATE OR REPLACE VIEW vw_estatisticas_motoristas AS
SELECT 
    u.id AS usuario_id,
    u.nome_completo AS nome,
    u.email,
    p.tipo_plano,
    p.limite_rotas,
    COUNT(r.id) AS total_rotas,
    COUNT(CASE WHEN r.ativa = TRUE THEN 1 END) AS rotas_ativas,
    COALESCE(SUM(r.capacidade_atual), 0) AS total_criancas,
    AVG(r.valor_mensal) AS valor_medio_mensal
FROM usuarios u
LEFT JOIN planos_assinatura p ON p.usuario_id = u.id AND p.ativo = TRUE
LEFT JOIN rotas_escolares r ON r.usuario_id = u.id
WHERE u.tipo_cadastro = 'motorista_escolar'
GROUP BY u.id, u.nome_completo, u.email, p.tipo_plano, p.limite_rotas;

CREATE OR REPLACE VIEW vw_ocupacao_rotas AS
SELECT 
    r.id AS rota_id,
    r.usuario_id,
    r.nome_rota,
    r.capacidade_atual,
    r.capacidade_maxima,
    (r.capacidade_maxima - r.capacidade_atual) AS vagas_disponiveis,
    r.status_rota,
    r.ativa
FROM rotas_escolares r;

-- ===========================
-- Triggers
-- ===========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT unnest(ARRAY[
        'usuarios','usuarios_status','planos_assinatura','rotas_escolares',
        'pontos_parada','criancas','criancas_rotas','viagens_ativas',
        'conferencia_criancas','pacotes_excursao'
    ]) AS tbl
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON %I', rec.tbl, rec.tbl);
        EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', rec.tbl, rec.tbl);
    END LOOP;
END$$;

CREATE OR REPLACE FUNCTION sync_veiculo_usuario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.usuario_id IS NULL AND NEW.motorista_id IS NOT NULL THEN
        NEW.usuario_id := NEW.motorista_id;
    END IF;
    IF NEW.motorista_id IS NULL AND NEW.usuario_id IS NOT NULL THEN
        NEW.motorista_id := NEW.usuario_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_veiculo_usuario ON veiculos;
CREATE TRIGGER trg_sync_veiculo_usuario
    BEFORE INSERT OR UPDATE ON veiculos
    FOR EACH ROW
    EXECUTE FUNCTION sync_veiculo_usuario();

CREATE OR REPLACE FUNCTION sync_viagens_ativas_usuario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.usuario_id IS NULL AND NEW.motorista_id IS NOT NULL THEN
        NEW.usuario_id := NEW.motorista_id;
    END IF;
    IF NEW.motorista_id IS NULL AND NEW.usuario_id IS NOT NULL THEN
        NEW.motorista_id := NEW.usuario_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_viagens_ativas_usuario ON viagens_ativas;
CREATE TRIGGER trg_sync_viagens_ativas_usuario
    BEFORE INSERT OR UPDATE ON viagens_ativas
    FOR EACH ROW
    EXECUTE FUNCTION sync_viagens_ativas_usuario();
