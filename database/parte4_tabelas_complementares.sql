-- ==========================================
-- PARTE 4: TABELAS COMPLEMENTARES
-- Tabelas para avaliações e interesses em rotas
-- ==========================================

-- Tabela para registrar interesses de responsáveis em rotas
CREATE TABLE IF NOT EXISTS interesses_rotas (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    crianca_id INTEGER NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
    responsavel_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    endereco_embarque TEXT NOT NULL,
    endereco_desembarque TEXT,
    latitude_embarque DECIMAL(10, 8),
    longitude_embarque DECIMAL(11, 8),
    latitude_desembarque DECIMAL(10, 8),
    longitude_desembarque DECIMAL(11, 8),
    horario_preferido_embarque TIME NOT NULL,
    horario_preferido_desembarque TIME,
    observacoes TEXT,
    telefone_contato VARCHAR(15) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado')),
    resposta_motorista TEXT,
    data_resposta TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela para avaliações de rotas pelos responsáveis
CREATE TABLE IF NOT EXISTS avaliacoes_rotas (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    responsavel_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    crianca_id INTEGER NOT NULL REFERENCES criancas(id) ON DELETE CASCADE,
    nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    aspectos_avaliados JSONB, -- Ex: {"pontualidade": 5, "seguranca": 4, "comunicacao": 5}
    recomenda BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE(rota_id, responsavel_id, crianca_id) -- Uma avaliação por criança por rota
);

-- Tabela para notificações do sistema
CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'interesse_rota', 'aprovacao_interesse', 'nova_avaliacao', etc.
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    dados_extras JSONB, -- Dados adicionais específicos do tipo de notificação
    lida BOOLEAN DEFAULT false,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela para histórico de alterações em rotas (auditoria)
CREATE TABLE IF NOT EXISTS historico_rotas (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER NOT NULL REFERENCES rotas_escolares(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    acao VARCHAR(50) NOT NULL, -- 'criada', 'atualizada', 'desativada', 'crianca_adicionada', etc.
    dados_anteriores JSONB,
    dados_novos JSONB,
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índices para interesses_rotas
CREATE INDEX IF NOT EXISTS idx_interesses_rotas_rota_id ON interesses_rotas(rota_id);
CREATE INDEX IF NOT EXISTS idx_interesses_rotas_responsavel_id ON interesses_rotas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_interesses_rotas_crianca_id ON interesses_rotas(crianca_id);
CREATE INDEX IF NOT EXISTS idx_interesses_rotas_status ON interesses_rotas(status);
CREATE INDEX IF NOT EXISTS idx_interesses_rotas_criado_em ON interesses_rotas(criado_em);

-- Índices para avaliacoes_rotas
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rotas_rota_id ON avaliacoes_rotas(rota_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rotas_responsavel_id ON avaliacoes_rotas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rotas_nota ON avaliacoes_rotas(nota);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rotas_criado_em ON avaliacoes_rotas(criado_em);

-- Índices para notificacoes
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_criado_em ON notificacoes(criado_em);

-- Índices para historico_rotas
CREATE INDEX IF NOT EXISTS idx_historico_rotas_rota_id ON historico_rotas(rota_id);
CREATE INDEX IF NOT EXISTS idx_historico_rotas_usuario_id ON historico_rotas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_rotas_acao ON historico_rotas(acao);
CREATE INDEX IF NOT EXISTS idx_historico_rotas_criado_em ON historico_rotas(criado_em);

-- ==========================================
-- TRIGGERS PARA TIMESTAMPS AUTOMÁTICOS
-- ==========================================

-- Trigger para interesses_rotas
CREATE TRIGGER trigger_interesses_rotas_timestamp
    BEFORE UPDATE ON interesses_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

-- Trigger para avaliacoes_rotas
CREATE TRIGGER trigger_avaliacoes_rotas_timestamp
    BEFORE UPDATE ON avaliacoes_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

-- ==========================================
-- VIEWS ADICIONAIS
-- ==========================================

-- View para estatísticas de interesses por rota
CREATE OR REPLACE VIEW vw_estatisticas_interesses AS
SELECT 
    r.id as rota_id,
    r.nome_rota,
    r.usuario_id as motorista_id,
    u.nome_completo as motorista_nome,
    COUNT(ir.id) as total_interesses,
    COUNT(CASE WHEN ir.status = 'pendente' THEN 1 END) as interesses_pendentes,
    COUNT(CASE WHEN ir.status = 'aprovado' THEN 1 END) as interesses_aprovados,
    COUNT(CASE WHEN ir.status = 'rejeitado' THEN 1 END) as interesses_rejeitados,
    COUNT(CASE WHEN ir.status = 'cancelado' THEN 1 END) as interesses_cancelados
FROM rotas_escolares r
LEFT JOIN interesses_rotas ir ON ir.rota_id = r.id
JOIN usuarios u ON u.id = r.usuario_id
WHERE r.ativa = true
GROUP BY r.id, r.nome_rota, r.usuario_id, u.nome_completo;

-- View para ranking de rotas por avaliação
CREATE OR REPLACE VIEW vw_ranking_rotas AS
SELECT 
    r.id as rota_id,
    r.nome_rota,
    r.escola_destino,
    r.turno,
    r.valor_mensal,
    r.capacidade_maxima,
    r.capacidade_atual,
    u.nome_completo as motorista_nome,
    u.celular as motorista_telefone,
    COALESCE(AVG(ar.nota), 0) as media_avaliacoes,
    COUNT(ar.id) as total_avaliacoes,
    COUNT(CASE WHEN ar.recomenda = true THEN 1 END) as total_recomendacoes,
    ROUND(
        (COUNT(CASE WHEN ar.recomenda = true THEN 1 END)::DECIMAL / NULLIF(COUNT(ar.id), 0)) * 100, 
        1
    ) as percentual_recomendacao
FROM rotas_escolares r
LEFT JOIN avaliacoes_rotas ar ON ar.rota_id = r.id
JOIN usuarios u ON u.id = r.usuario_id
WHERE r.ativa = true AND r.status_rota = 'ativa'
GROUP BY r.id, r.nome_rota, r.escola_destino, r.turno, r.valor_mensal, 
         r.capacidade_maxima, r.capacidade_atual, u.nome_completo, u.celular
ORDER BY media_avaliacoes DESC, total_avaliacoes DESC;

-- View para dashboard de notificações
CREATE OR REPLACE VIEW vw_notificacoes_resumo AS
SELECT 
    usuario_id,
    COUNT(*) as total_notificacoes,
    COUNT(CASE WHEN lida = false THEN 1 END) as nao_lidas,
    COUNT(CASE WHEN tipo = 'interesse_rota' THEN 1 END) as interesses_rota,
    COUNT(CASE WHEN tipo = 'aprovacao_interesse' THEN 1 END) as aprovacoes,
    COUNT(CASE WHEN tipo = 'nova_avaliacao' THEN 1 END) as novas_avaliacoes,
    MAX(criado_em) as ultima_notificacao
FROM notificacoes
GROUP BY usuario_id;

-- ==========================================
-- FUNÇÕES AUXILIARES
-- ==========================================

-- Função para criar notificação
CREATE OR REPLACE FUNCTION criar_notificacao(
    p_usuario_id INTEGER,
    p_tipo VARCHAR(50),
    p_titulo VARCHAR(200),
    p_mensagem TEXT,
    p_dados_extras JSONB DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    notificacao_id INTEGER;
BEGIN
    INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, dados_extras)
    VALUES (p_usuario_id, p_tipo, p_titulo, p_mensagem, p_dados_extras)
    RETURNING id INTO notificacao_id;
    
    RETURN notificacao_id;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar histórico de rota
CREATE OR REPLACE FUNCTION registrar_historico_rota(
    p_rota_id INTEGER,
    p_usuario_id INTEGER,
    p_acao VARCHAR(50),
    p_dados_anteriores JSONB DEFAULT NULL,
    p_dados_novos JSONB DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    historico_id INTEGER;
BEGIN
    INSERT INTO historico_rotas (rota_id, usuario_id, acao, dados_anteriores, dados_novos, observacoes)
    VALUES (p_rota_id, p_usuario_id, p_acao, p_dados_anteriores, p_dados_novos, p_observacoes)
    RETURNING id INTO historico_id;
    
    RETURN historico_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS PARA NOTIFICAÇÕES AUTOMÁTICAS
-- ==========================================

-- Trigger para notificar motorista sobre novo interesse
CREATE OR REPLACE FUNCTION notificar_novo_interesse() RETURNS TRIGGER AS $$
DECLARE
    motorista_id INTEGER;
    rota_nome VARCHAR(100);
    crianca_nome VARCHAR(100);
    responsavel_nome VARCHAR(100);
BEGIN
    -- Buscar dados necessários
    SELECT r.usuario_id, r.nome_rota INTO motorista_id, rota_nome
    FROM rotas_escolares r WHERE r.id = NEW.rota_id;
    
    SELECT c.nome_completo INTO crianca_nome
    FROM criancas c WHERE c.id = NEW.crianca_id;
    
    SELECT u.nome_completo INTO responsavel_nome
    FROM usuarios u WHERE u.id = NEW.responsavel_id;
    
    -- Criar notificação para o motorista
    PERFORM criar_notificacao(
        motorista_id,
        'interesse_rota',
        'Novo interesse em sua rota',
        format('O responsável %s demonstrou interesse na rota "%s" para a criança %s.', 
               responsavel_nome, rota_nome, crianca_nome),
        json_build_object(
            'interesse_id', NEW.id,
            'rota_id', NEW.rota_id,
            'crianca_id', NEW.crianca_id,
            'responsavel_id', NEW.responsavel_id
        )::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_novo_interesse
    AFTER INSERT ON interesses_rotas
    FOR EACH ROW
    EXECUTE FUNCTION notificar_novo_interesse();

-- Trigger para notificar responsável sobre resposta do motorista
CREATE OR REPLACE FUNCTION notificar_resposta_interesse() RETURNS TRIGGER AS $$
DECLARE
    rota_nome VARCHAR(100);
    crianca_nome VARCHAR(100);
    titulo_notificacao VARCHAR(200);
    mensagem_notificacao TEXT;
BEGIN
    -- Só notificar se o status mudou
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Buscar dados necessários
    SELECT r.nome_rota INTO rota_nome
    FROM rotas_escolares r WHERE r.id = NEW.rota_id;
    
    SELECT c.nome_completo INTO crianca_nome
    FROM criancas c WHERE c.id = NEW.crianca_id;
    
    -- Definir título e mensagem baseado no status
    CASE NEW.status
        WHEN 'aprovado' THEN
            titulo_notificacao := 'Interesse aprovado!';
            mensagem_notificacao := format('Seu interesse na rota "%s" para %s foi aprovado! O motorista entrará em contato.', 
                                         rota_nome, crianca_nome);
        WHEN 'rejeitado' THEN
            titulo_notificacao := 'Interesse não aprovado';
            mensagem_notificacao := format('Infelizmente seu interesse na rota "%s" para %s não foi aprovado.', 
                                         rota_nome, crianca_nome);
        ELSE
            RETURN NEW; -- Não notificar para outros status
    END CASE;
    
    -- Criar notificação para o responsável
    PERFORM criar_notificacao(
        NEW.responsavel_id,
        'resposta_interesse',
        titulo_notificacao,
        mensagem_notificacao,
        json_build_object(
            'interesse_id', NEW.id,
            'rota_id', NEW.rota_id,
            'crianca_id', NEW.crianca_id,
            'status', NEW.status,
            'resposta_motorista', NEW.resposta_motorista
        )::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_resposta_interesse
    AFTER UPDATE ON interesses_rotas
    FOR EACH ROW
    EXECUTE FUNCTION notificar_resposta_interesse();

-- ==========================================
-- DADOS INICIAIS (OPCIONAL)
-- ==========================================

-- Inserir alguns tipos de notificação padrão se necessário
-- (Pode ser expandido conforme necessário)

COMMENT ON TABLE interesses_rotas IS 'Registra interesses de responsáveis em rotas escolares';
COMMENT ON TABLE avaliacoes_rotas IS 'Avaliações de rotas pelos responsáveis';
COMMENT ON TABLE notificacoes IS 'Sistema de notificações do aplicativo';
COMMENT ON TABLE historico_rotas IS 'Histórico de alterações em rotas para auditoria';

-- Fim do script