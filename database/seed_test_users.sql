-- ==========================================
-- 🧪 SEED DE DADOS DE TESTE COMPLETO
-- ==========================================
-- Script SQL para criar ambiente de teste completo com:
-- - Usuários (motoristas, responsáveis, admin)
-- - Planos de assinatura
-- - Crianças cadastradas
-- - Rotas escolares
-- - Dados realistas para validação do sistema
--
-- Senha padrão: teste123 (criptografada com bcrypt via pgcrypto)
-- ==========================================

-- Habilitar extensão pgcrypto para criptografia de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- LIMPEZA DE DADOS ANTERIORES
-- ==========================================

DO $$
BEGIN
    -- Limpar em ordem para respeitar foreign keys
    -- Verifica se a tabela existe antes de deletar
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'criancas_rotas') THEN
        DELETE FROM criancas_rotas WHERE crianca_id IN (
            SELECT id FROM criancas WHERE responsavel_id IN (
                SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com' OR email LIKE '%@example.com'
            )
        );
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rotas_escolares') THEN
        DELETE FROM rotas_escolares WHERE usuario_id IN (
            SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com' OR email LIKE '%@example.com'
        );
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'criancas') THEN
        DELETE FROM criancas WHERE responsavel_id IN (
            SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com' OR email LIKE '%@example.com'
        );
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'planos_assinatura') THEN
        DELETE FROM planos_assinatura WHERE usuario_id IN (
            SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com' OR email LIKE '%@example.com'
        );
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        DELETE FROM usuarios WHERE email LIKE '%@teste.kanghoo.com' OR email LIKE '%@example.com';
    END IF;
    
    RAISE NOTICE '🧹 Dados de teste anteriores removidos';
END $$;

-- ==========================================
-- CRIAÇÃO DE USUÁRIOS DE TESTE
-- ==========================================

-- 1) Motorista Escolar - Plano Basic
INSERT INTO usuarios (
    nome_completo, email, senha, tipo_cadastro, celular, 
    endereco_completo, tipo_usuario, data_nascimento, criado_em
)
VALUES (
    'João Silva Santos',
    'joao.motorista.basic@teste.kanghoo.com',
    crypt('teste123', gen_salt('bf', 10)),
    'motorista_escolar',
    '(11) 98765-4321',
    'Rua das Flores, 123 - Vila Madalena, São Paulo - SP',
    'escolar',
    '1985-03-15',
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 2) Motorista de Excursão - Plano Premium
INSERT INTO usuarios (
    nome_completo, email, senha, tipo_cadastro, celular,
    endereco_completo, tipo_usuario, data_nascimento, criado_em
)
VALUES (
    'Maria Oliveira Costa',
    'maria.motorista.premium@teste.kanghoo.com',
    crypt('teste123', gen_salt('bf', 10)),
    'motorista_excursao',
    '(11) 91234-5678',
    'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    'excursao',
    '1990-07-22',
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 3) Responsável 1 - Ana Costa Silva
INSERT INTO usuarios (
    nome_completo, email, senha, tipo_cadastro, celular,
    endereco_completo, tipo_usuario, data_nascimento, criado_em
)
VALUES (
    'Ana Costa Silva',
    'ana.responsavel@teste.kanghoo.com',
    crypt('teste123', gen_salt('bf', 10)),
    'responsavel',
    '(11) 99999-1111',
    'Rua dos Jardins, 456 - Jardins, São Paulo - SP',
    'responsavel',
    '1988-05-10',
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 4) Responsável 2 - Carlos Roberto Lima
INSERT INTO usuarios (
    nome_completo, email, senha, tipo_cadastro, celular,
    endereco_completo, tipo_usuario, data_nascimento, criado_em
)
VALUES (
    'Carlos Roberto Lima',
    'carlos.responsavel@teste.kanghoo.com',
    crypt('teste123', gen_salt('bf', 10)),
    'responsavel',
    '(11) 77777-3333',
    'Rua das Palmeiras, 789 - Moema, São Paulo - SP',
    'responsavel',
    '1982-11-20',
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 5) Responsável 3 - Fernanda Santos Oliveira
INSERT INTO usuarios (
    nome_completo, email, senha, tipo_cadastro, celular,
    endereco_completo, tipo_usuario, data_nascimento, criado_em
)
VALUES (
    'Fernanda Santos Oliveira',
    'fernanda.responsavel@teste.kanghoo.com',
    crypt('teste123', gen_salt('bf', 10)),
    'responsavel',
    '(11) 55555-5555',
    'Av. Faria Lima, 321 - Itaim Bibi, São Paulo - SP',
    'responsavel',
    '1992-02-18',
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 6) Administrador do Sistema
INSERT INTO usuarios (
    nome_completo, email, senha, tipo_cadastro, celular,
    endereco_completo, tipo_usuario, data_nascimento, criado_em
)
VALUES (
    'Administrador Sistema',
    'admin@teste.kanghoo.com',
    crypt('teste123', gen_salt('bf', 10)),
    'admin',
    '(11) 98765-0000',
    'Rua Administrativa, 1 - Centro, São Paulo - SP',
    'admin',
    '1980-01-01',
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- PLANOS DE ASSINATURA
-- ==========================================

-- Plano Basic para Motorista Escolar
INSERT INTO planos_assinatura (
    usuario_id, tipo_plano, limite_rotas, limite_usuarios, 
    ativo, criado_em
)
SELECT 
    u.id, 
    'basico', 
    3, 
    15,
    true,
    NOW()
FROM usuarios u
WHERE u.email = 'joao.motorista.basic@teste.kanghoo.com'
  AND NOT EXISTS (
    SELECT 1 FROM planos_assinatura p 
    WHERE p.usuario_id = u.id AND p.ativo = true
  );

-- Plano Premium para Motorista de Excursão
INSERT INTO planos_assinatura (
    usuario_id, tipo_plano, limite_rotas, limite_usuarios,
    ativo, criado_em
)
SELECT 
    u.id,
    'premium',
    10,
    50,
    true,
    NOW()
FROM usuarios u
WHERE u.email = 'maria.motorista.premium@teste.kanghoo.com'
  AND NOT EXISTS (
    SELECT 1 FROM planos_assinatura p 
    WHERE p.usuario_id = u.id AND p.ativo = true
  );

-- ==========================================
-- CRIANÇAS CADASTRADAS
-- ==========================================

-- Criança 1 - Sofia Costa Silva (filha de Ana)
INSERT INTO criancas (
    nome_completo, data_nascimento, endereco_residencial, escola,
    endereco_escola, responsavel_id, cpf, idade, nome_responsavel,
    telefone_responsavel, email_responsavel, criado_em
)
SELECT
    'Sofia Costa Silva',
    '2016-03-15',
    'Rua dos Jardins, 456 - Jardins, São Paulo - SP',
    'Escola Municipal Monteiro Lobato',
    'Rua da Escola, 456 - Vila Madalena, SP',
    u.id,
    '12345678901',
    8,
    'Ana Costa Silva',
    '(11) 99999-1111',
    'ana.responsavel@teste.kanghoo.com',
    NOW()
FROM usuarios u
WHERE u.email = 'ana.responsavel@teste.kanghoo.com'
ON CONFLICT (cpf) DO NOTHING;

-- Criança 2 - Pedro Roberto Lima (filho de Carlos)
INSERT INTO criancas (
    nome_completo, data_nascimento, endereco_residencial, escola,
    endereco_escola, responsavel_id, cpf, idade, nome_responsavel,
    telefone_responsavel, email_responsavel, criado_em
)
SELECT
    'Pedro Roberto Lima',
    '2014-03-15',
    'Rua das Palmeiras, 789 - Moema, São Paulo - SP',
    'Colégio São Francisco',
    'Av. São Francisco, 789 - Jardins, SP',
    u.id,
    '98765432109',
    10,
    'Carlos Roberto Lima',
    '(11) 77777-3333',
    'carlos.responsavel@teste.kanghoo.com',
    NOW()
FROM usuarios u
WHERE u.email = 'carlos.responsavel@teste.kanghoo.com'
ON CONFLICT (cpf) DO NOTHING;

-- Criança 3 - Lucas Santos Oliveira (filho de Fernanda)
INSERT INTO criancas (
    nome_completo, data_nascimento, endereco_residencial, escola,
    endereco_escola, responsavel_id, cpf, idade, nome_responsavel,
    telefone_responsavel, email_responsavel, criado_em
)
SELECT
    'Lucas Santos Oliveira',
    '2017-03-15',
    'Av. Faria Lima, 321 - Itaim Bibi, São Paulo - SP',
    'Escola Estadual Prof. João Silva',
    'Rua Prof. João Silva, 100 - Pinheiros, SP',
    u.id,
    '11122233344',
    7,
    'Fernanda Santos Oliveira',
    '(11) 55555-5555',
    'fernanda.responsavel@teste.kanghoo.com',
    NOW()
FROM usuarios u
WHERE u.email = 'fernanda.responsavel@teste.kanghoo.com'
ON CONFLICT (cpf) DO NOTHING;

-- ==========================================
-- ROTAS ESCOLARES
-- ==========================================

-- Rota 1 - Vila Madalena para Escola Monteiro Lobato
INSERT INTO rotas_escolares (
    usuario_id, nome_rota, descricao, escola_destino, turno,
    horario_ida, horario_volta, dias_semana, preco_mensal,
    vagas_disponiveis, ativa, criado_em
)
SELECT
    u.id,
    'Rota Vila Madalena - Escola Monteiro Lobato',
    'Rota matutina para Escola Municipal Monteiro Lobato',
    'Escola Municipal Monteiro Lobato - Rua da Escola, 456 - Vila Madalena, SP',
    'manha',
    '06:30:00',
    '07:15:00',
    'seg-sex',
    180.00,
    12,
    true,
    NOW()
FROM usuarios u
WHERE u.email = 'joao.motorista.basic@teste.kanghoo.com';

-- Rota 2 - Jardins para Colégio São Francisco
INSERT INTO rotas_escolares (
    usuario_id, nome_rota, descricao, escola_destino, turno,
    horario_ida, horario_volta, dias_semana, preco_mensal,
    vagas_disponiveis, ativa, criado_em
)
SELECT
    u.id,
    'Rota Jardins - Colégio São Francisco',
    'Rota vespertina para Colégio São Francisco',
    'Colégio São Francisco - Av. São Francisco, 789 - Jardins, SP',
    'tarde',
    '12:30:00',
    '13:15:00',
    'seg-sex',
    220.00,
    10,
    true,
    NOW()
FROM usuarios u
WHERE u.email = 'joao.motorista.basic@teste.kanghoo.com';

-- ==========================================
-- RESUMO DOS DADOS CRIADOS
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ==========================================';
    RAISE NOTICE '✅ DADOS DE TESTE CRIADOS COM SUCESSO!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '� USUÁRIOSi CRIADOS:';
    RAISE NOTICE '--------------------';
    RAISE NOTICE '� Motiorista Escolar (Basic):';
    RAISE NOTICE '   📧 Email: joao.motorista.basic@teste.kanghoo.com';
    RAISE NOTICE '   🔑 Senha: teste123';
    RAISE NOTICE '   💳 Plano: Basic (3 rotas, 15 usuários)';
    RAISE NOTICE '';
    RAISE NOTICE '🚐 Motorista de Excursão (Premium):';
    RAISE NOTICE '   📧 Email: maria.motorista.premium@teste.kanghoo.com';
    RAISE NOTICE '   🔑 Senha: teste123';
    RAISE NOTICE '   💎 Plano: Premium (10 rotas, 50 usuários)';
    RAISE NOTICE '';
    RAISE NOTICE '👨‍👩‍👧‍👦 Responsáveis:';
    RAISE NOTICE '   1. Ana Costa Silva';
    RAISE NOTICE '      📧 ana.responsavel@teste.kanghoo.com';
    RAISE NOTICE '      👶 Criança: Sofia Costa Silva (8 anos)';
    RAISE NOTICE '';
    RAISE NOTICE '   2. Carlos Roberto Lima';
    RAISE NOTICE '      📧 carlos.responsavel@teste.kanghoo.com';
    RAISE NOTICE '      👶 Criança: Pedro Roberto Lima (10 anos)';
    RAISE NOTICE '';
    RAISE NOTICE '   3. Fernanda Santos Oliveira';
    RAISE NOTICE '      📧 fernanda.responsavel@teste.kanghoo.com';
    RAISE NOTICE '      👶 Criança: Lucas Santos Oliveira (7 anos)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Administrador:';
    RAISE NOTICE '   📧 admin@teste.kanghoo.com';
    RAISE NOTICE '   🔑 Senha: teste123';
    RAISE NOTICE '';
    RAISE NOTICE '🗺️  DADOS ADICIONAIS:';
    RAISE NOTICE '   ✅ 2 rotas escolares criadas';
    RAISE NOTICE '   ✅ 3 crianças cadastradas';
    RAISE NOTICE '   ✅ 2 planos de assinatura ativos';
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;
