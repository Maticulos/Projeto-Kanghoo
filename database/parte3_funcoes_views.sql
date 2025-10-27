-- PARTE 3: Funções, Triggers e Views
-- Script para criar funções, triggers e views do sistema de rotas escolares

-- 1. Função para atualizar timestamp de modificação
CREATE OR REPLACE FUNCTION atualizar_timestamp_modificacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Função para atualizar capacidade da rota
CREATE OR REPLACE FUNCTION atualizar_capacidade_rota()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar capacidade atual da rota
    UPDATE rotas_escolares 
    SET capacidade_atual = (
        SELECT COUNT(*) 
        FROM criancas_rotas 
        WHERE rota_id = COALESCE(NEW.rota_id, OLD.rota_id) AND ativo = true
    )
    WHERE id = COALESCE(NEW.rota_id, OLD.rota_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Triggers para atualizar timestamps
DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_rotas ON rotas_escolares;
CREATE TRIGGER trigger_atualizar_timestamp_rotas
    BEFORE UPDATE ON rotas_escolares
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_planos ON planos_assinatura;
CREATE TRIGGER trigger_atualizar_timestamp_planos
    BEFORE UPDATE ON planos_assinatura
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_criancas_rotas ON criancas_rotas;
CREATE TRIGGER trigger_atualizar_timestamp_criancas_rotas
    BEFORE UPDATE ON criancas_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

DROP TRIGGER IF EXISTS trigger_atualizar_timestamp_veiculos ON veiculos;
CREATE TRIGGER trigger_atualizar_timestamp_veiculos
    BEFORE UPDATE ON veiculos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_modificacao();

-- 4. Triggers para atualizar capacidade das rotas
DROP TRIGGER IF EXISTS trigger_capacidade_insert ON criancas_rotas;
CREATE TRIGGER trigger_capacidade_insert
    AFTER INSERT ON criancas_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_capacidade_rota();

DROP TRIGGER IF EXISTS trigger_capacidade_update ON criancas_rotas;
CREATE TRIGGER trigger_capacidade_update
    AFTER UPDATE ON criancas_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_capacidade_rota();

DROP TRIGGER IF EXISTS trigger_capacidade_delete ON criancas_rotas;
CREATE TRIGGER trigger_capacidade_delete
    AFTER DELETE ON criancas_rotas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_capacidade_rota();

-- 5. View para rotas completas com informações detalhadas
CREATE OR REPLACE VIEW vw_rotas_completas AS
SELECT 
    r.id,
    r.usuario_id,
    u.nome_completo as motorista_nome,
    u.celular as motorista_telefone,
    u.email as motorista_email,
    r.nome_rota,
    r.descricao,
    r.tipo_rota,
    r.endereco_origem,
    r.endereco_destino,
    r.escola_destino,
    r.turno,
    r.horario_ida,
    r.horario_volta,
    r.dias_semana,
    r.valor_mensal,
    r.capacidade_maxima,
    r.capacidade_atual,
    r.status_rota,
    r.ativa,
    r.observacoes,
    r.criado_em,
    r.atualizado_em,
    (r.capacidade_maxima - r.capacidade_atual) as vagas_disponiveis,
    CASE 
        WHEN r.capacidade_atual >= r.capacidade_maxima THEN 'Lotada'
        WHEN r.ativa = false THEN 'Inativa'
        ELSE 'Disponível'
    END as status_disponibilidade,
    (SELECT COUNT(*) FROM criancas_rotas cr WHERE cr.rota_id = r.id AND cr.ativo = true) as total_criancas,
    p.tipo_plano,
    p.limite_rotas,
    v.modelo as veiculo_modelo,
    v.placa as veiculo_placa,
    v.capacidade as veiculo_capacidade
FROM rotas_escolares r
JOIN usuarios u ON u.id = r.usuario_id
LEFT JOIN veiculos v ON v.usuario_id = u.id AND v.ativo = true
LEFT JOIN planos_assinatura p ON p.usuario_id = u.id AND p.ativo = true;

-- 6. View para estatísticas dos motoristas
CREATE OR REPLACE VIEW vw_estatisticas_motoristas AS
SELECT 
    u.id as usuario_id,
    u.nome_completo as nome,
    u.email,
    u.celular as telefone,
    COUNT(r.id) as total_rotas,
    COUNT(CASE WHEN r.ativa = true THEN 1 END) as rotas_ativas,
    COUNT(CASE WHEN r.status_rota = 'lotada' THEN 1 END) as rotas_lotadas,
    SUM(r.capacidade_atual) as total_criancas_atendidas,
    SUM(r.capacidade_maxima) as capacidade_total,
    AVG(r.valor_mensal) as valor_medio_rotas,
    p.tipo_plano,
    p.limite_rotas,
    p.limite_usuarios,
    COUNT(v.id) as total_veiculos,
    COUNT(CASE WHEN v.ativo = true THEN 1 END) as veiculos_ativos
FROM usuarios u
LEFT JOIN rotas_escolares r ON r.usuario_id = u.id
LEFT JOIN planos_assinatura p ON p.usuario_id = u.id AND p.ativo = true
LEFT JOIN veiculos v ON v.usuario_id = u.id
WHERE u.tipo_usuario = 'motorista_escolar'
GROUP BY u.id, u.nome_completo, u.email, u.celular, p.tipo_plano, p.limite_rotas, p.limite_usuarios;

-- 7. View para relatório de ocupação das rotas
CREATE OR REPLACE VIEW vw_ocupacao_rotas AS
SELECT 
    r.id,
    r.nome_rota,
    r.escola_destino,
    r.turno,
    r.capacidade_maxima,
    r.capacidade_atual,
    (r.capacidade_maxima - r.capacidade_atual) as vagas_livres,
    ROUND((r.capacidade_atual::DECIMAL / r.capacidade_maxima::DECIMAL) * 100, 2) as percentual_ocupacao,
    r.status_rota,
    r.valor_mensal,
    u.nome_completo as motorista_nome,
    COUNT(cr.id) as total_criancas_cadastradas
FROM rotas_escolares r
JOIN usuarios u ON u.id = r.usuario_id
LEFT JOIN criancas_rotas cr ON cr.rota_id = r.id AND cr.ativo = true
WHERE r.ativa = true
GROUP BY r.id, r.nome_rota, r.escola_destino, r.turno, r.capacidade_maxima, 
         r.capacidade_atual, r.status_rota, r.valor_mensal, u.nome_completo
ORDER BY percentual_ocupacao DESC;

COMMIT;