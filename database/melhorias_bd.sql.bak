-- Melhorias no Banco de Dados para Sistema de Transporte
-- Este script adiciona melhorias e otimizações nas tabelas existentes

-- 1. Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_cadastro ON usuarios(tipo_cadastro);
CREATE INDEX IF NOT EXISTS idx_transportes_tipo ON transportes(tipo);
CREATE INDEX IF NOT EXISTS idx_transportes_cidade ON transportes(cidade);
CREATE INDEX IF NOT EXISTS idx_transportes_ativo ON transportes(ativo);

-- 2. Adicionar campos úteis na tabela transportes se não existirem
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS avaliacao_media DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS total_avaliacoes INTEGER DEFAULT 0;

-- 3. Criar tabela de avaliações se não existir
CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    transporte_id INTEGER REFERENCES transportes(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nota INTEGER CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transporte_id, usuario_id)
);

-- 4. Criar índices para a tabela de avaliações
CREATE INDEX IF NOT EXISTS idx_avaliacoes_transporte ON avaliacoes(transporte_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario ON avaliacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota ON avaliacoes(nota);

-- 5. Criar tabela de favoritos se não existir
CREATE TABLE IF NOT EXISTS favoritos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    transporte_id INTEGER REFERENCES transportes(id) ON DELETE CASCADE,
    data_favoritado TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, transporte_id)
);

-- 6. Criar índices para a tabela de favoritos
CREATE INDEX IF NOT EXISTS idx_favoritos_usuario ON favoritos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_favoritos_transporte ON favoritos(transporte_id);

-- 7. Criar tabela de mensagens/contatos se não existir
CREATE TABLE IF NOT EXISTS mensagens (
    id SERIAL PRIMARY KEY,
    remetente_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    destinatario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    transporte_id INTEGER REFERENCES transportes(id) ON DELETE CASCADE,
    assunto VARCHAR(255),
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Criar índices para a tabela de mensagens
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario ON mensagens(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_transporte ON mensagens(transporte_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_lida ON mensagens(lida);

-- 9. Criar função para atualizar data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION atualizar_data_modificacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Criar trigger para atualizar data_atualizacao na tabela transportes
DROP TRIGGER IF EXISTS trigger_atualizar_transportes ON transportes;
CREATE TRIGGER trigger_atualizar_transportes
    BEFORE UPDATE ON transportes
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_data_modificacao();

-- 11. Criar função para atualizar avaliação média
CREATE OR REPLACE FUNCTION atualizar_avaliacao_media()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE transportes 
    SET 
        avaliacao_media = (
            SELECT COALESCE(AVG(nota), 0) 
            FROM avaliacoes 
            WHERE transporte_id = COALESCE(NEW.transporte_id, OLD.transporte_id)
        ),
        total_avaliacoes = (
            SELECT COUNT(*) 
            FROM avaliacoes 
            WHERE transporte_id = COALESCE(NEW.transporte_id, OLD.transporte_id)
        )
    WHERE id = COALESCE(NEW.transporte_id, OLD.transporte_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- 12. Criar triggers para atualizar avaliação média
DROP TRIGGER IF EXISTS trigger_avaliacao_insert ON avaliacoes;
DROP TRIGGER IF EXISTS trigger_avaliacao_update ON avaliacoes;
DROP TRIGGER IF EXISTS trigger_avaliacao_delete ON avaliacoes;

CREATE TRIGGER trigger_avaliacao_insert
    AFTER INSERT ON avaliacoes
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_avaliacao_media();

CREATE TRIGGER trigger_avaliacao_update
    AFTER UPDATE ON avaliacoes
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_avaliacao_media();

CREATE TRIGGER trigger_avaliacao_delete
    AFTER DELETE ON avaliacoes
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_avaliacao_media();

-- 13. Adicionar alguns dados de exemplo para avaliações (opcional)
-- Comentado para não inserir dados duplicados
-- INSERT INTO avaliacoes (transporte_id, usuario_id, nota, comentario) 
-- SELECT 1, 1, 5, 'Excelente serviço!' 
-- WHERE NOT EXISTS (SELECT 1 FROM avaliacoes WHERE transporte_id = 1 AND usuario_id = 1);

-- 14. Atualizar avaliações médias existentes
UPDATE transportes 
SET 
    avaliacao_media = COALESCE((
        SELECT AVG(nota) 
        FROM avaliacoes 
        WHERE transporte_id = transportes.id
    ), 0),
    total_avaliacoes = COALESCE((
        SELECT COUNT(*) 
        FROM avaliacoes 
        WHERE transporte_id = transportes.id
    ), 0);

-- Fim do script de melhorias