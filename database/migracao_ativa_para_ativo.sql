-- =====================================================
-- MIGRAÇÃO: COLUNA 'ativa' PARA 'ativo'
-- Tabela: rotas_escolares
-- Data: 2024
-- =====================================================

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rotas_escolares') THEN
        RAISE EXCEPTION 'Tabela rotas_escolares não encontrada!';
    END IF;
    RAISE NOTICE '✅ Tabela rotas_escolares encontrada';
END $$;

-- Verificar se a coluna 'ativa' existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativa'
    ) THEN
        RAISE NOTICE '⚠️ Coluna "ativa" não encontrada. Migração pode já ter sido executada.';
    ELSE
        RAISE NOTICE '✅ Coluna "ativa" encontrada';
    END IF;
END $$;

-- Verificar se a coluna 'ativo' já existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativo'
    ) THEN
        RAISE NOTICE '⚠️ Coluna "ativo" já existe. Verificando se migração já foi concluída...';
    END IF;
END $$;

-- =====================================================
-- INÍCIO DA MIGRAÇÃO
-- =====================================================

-- Passo 1: Criar backup da coluna atual (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativa'
    ) THEN
        -- Criar coluna de backup temporária
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'rotas_escolares' AND column_name = 'ativa_backup'
        ) THEN
            ALTER TABLE rotas_escolares ADD COLUMN ativa_backup BOOLEAN;
            UPDATE rotas_escolares SET ativa_backup = ativa;
            RAISE NOTICE '✅ Backup da coluna "ativa" criado como "ativa_backup"';
        END IF;
    END IF;
END $$;

-- Passo 2: Criar nova coluna 'ativo' (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativo'
    ) THEN
        ALTER TABLE rotas_escolares ADD COLUMN ativo BOOLEAN;
        RAISE NOTICE '✅ Nova coluna "ativo" criada';
    ELSE
        RAISE NOTICE '⚠️ Coluna "ativo" já existe';
    END IF;
END $$;

-- Passo 3: Copiar dados da coluna 'ativa' para 'ativo' (se necessário)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativa'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativo'
    ) THEN
        UPDATE rotas_escolares SET ativo = ativa WHERE ativo IS NULL;
        RAISE NOTICE '✅ Dados copiados de "ativa" para "ativo"';
    END IF;
END $$;

-- Passo 4: Definir valor padrão e NOT NULL para nova coluna
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativo'
    ) THEN
        -- Definir valores NULL como true (padrão)
        UPDATE rotas_escolares SET ativo = true WHERE ativo IS NULL;
        
        -- Definir valor padrão
        ALTER TABLE rotas_escolares ALTER COLUMN ativo SET DEFAULT true;
        
        -- Definir NOT NULL
        ALTER TABLE rotas_escolares ALTER COLUMN ativo SET NOT NULL;
        
        RAISE NOTICE '✅ Valor padrão e NOT NULL definidos para coluna "ativo"';
    END IF;
END $$;

-- Passo 5: Remover índice antigo (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'rotas_escolares' AND indexname = 'idx_rotas_ativa'
    ) THEN
        DROP INDEX idx_rotas_ativa;
        RAISE NOTICE '✅ Índice antigo "idx_rotas_ativa" removido';
    END IF;
END $$;

-- Passo 6: Criar novo índice
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'rotas_escolares' AND indexname = 'idx_rotas_ativo'
    ) THEN
        CREATE INDEX idx_rotas_ativo ON rotas_escolares(ativo);
        RAISE NOTICE '✅ Novo índice "idx_rotas_ativo" criado';
    ELSE
        RAISE NOTICE '⚠️ Índice "idx_rotas_ativo" já existe';
    END IF;
END $$;

-- Passo 7: Remover coluna antiga 'ativa' (se tudo estiver OK)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativa'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativo'
    ) THEN
        -- Verificar se os dados foram copiados corretamente
        IF (SELECT COUNT(*) FROM rotas_escolares WHERE ativo IS NULL) = 0 THEN
            ALTER TABLE rotas_escolares DROP COLUMN ativa;
            RAISE NOTICE '✅ Coluna antiga "ativa" removida com sucesso';
        ELSE
            RAISE NOTICE '⚠️ Ainda existem valores NULL na coluna "ativo". Migração não concluída.';
        END IF;
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar resultado da migração
DO $$
DECLARE
    col_ativo_exists BOOLEAN;
    col_ativa_exists BOOLEAN;
    total_registros INTEGER;
    registros_ativos INTEGER;
BEGIN
    -- Verificar existência das colunas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativo'
    ) INTO col_ativo_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativa'
    ) INTO col_ativa_exists;
    
    -- Contar registros
    SELECT COUNT(*) FROM rotas_escolares INTO total_registros;
    SELECT COUNT(*) FROM rotas_escolares WHERE ativo = true INTO registros_ativos;
    
    -- Relatório final
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎉 RELATÓRIO FINAL DA MIGRAÇÃO';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Coluna "ativo" existe: %', col_ativo_exists;
    RAISE NOTICE 'Coluna "ativa" existe: %', col_ativa_exists;
    RAISE NOTICE 'Total de registros: %', total_registros;
    RAISE NOTICE 'Registros ativos: %', registros_ativos;
    
    IF col_ativo_exists AND NOT col_ativa_exists THEN
        RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
        RAISE NOTICE 'A coluna foi renomeada de "ativa" para "ativo"';
    ELSIF col_ativo_exists AND col_ativa_exists THEN
        RAISE NOTICE '⚠️ MIGRAÇÃO PARCIAL - Ambas colunas existem';
        RAISE NOTICE 'Verifique se houve algum erro na remoção da coluna antiga';
    ELSE
        RAISE NOTICE '❌ ERRO NA MIGRAÇÃO';
        RAISE NOTICE 'A coluna "ativo" não foi criada corretamente';
    END IF;
    
    RAISE NOTICE '==========================================';
END $$;

-- Limpar coluna de backup (opcional)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rotas_escolares' AND column_name = 'ativa_backup'
    ) THEN
        ALTER TABLE rotas_escolares DROP COLUMN ativa_backup;
        RAISE NOTICE '🧹 Coluna de backup removida';
    END IF;
END $$;

-- =====================================================
-- INSTRUÇÕES DE ROLLBACK (EM CASO DE PROBLEMAS)
-- =====================================================

/*
-- ROLLBACK: Execute apenas se algo der errado
-- ATENÇÃO: Só execute se a migração falhou!

-- 1. Recriar coluna 'ativa' se necessário
ALTER TABLE rotas_escolares ADD COLUMN ativa BOOLEAN;

-- 2. Copiar dados de volta
UPDATE rotas_escolares SET ativa = ativo;

-- 3. Definir padrões
ALTER TABLE rotas_escolares ALTER COLUMN ativa SET DEFAULT true;
ALTER TABLE rotas_escolares ALTER COLUMN ativa SET NOT NULL;

-- 4. Recriar índice antigo
CREATE INDEX idx_rotas_ativa ON rotas_escolares(ativa);

-- 5. Remover coluna nova (se necessário)
ALTER TABLE rotas_escolares DROP COLUMN ativo;
DROP INDEX idx_rotas_ativo;
*/