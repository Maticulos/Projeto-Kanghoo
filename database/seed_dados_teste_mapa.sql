-- ==========================================
-- SEED: Dados de teste para mapa interativo
-- ==========================================
-- Este script cria dados de teste para visualização no mapa

BEGIN;

-- Limpar dados de teste anteriores (opcional - comentar se quiser manter)
-- DELETE FROM avaliacoes WHERE avaliador_id IN (SELECT id FROM usuarios WHERE email LIKE '%teste%');
-- DELETE FROM rotas_escolares WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE '%teste%');
-- DELETE FROM pacotes_excursao WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE '%teste%');
-- DELETE FROM veiculos WHERE motorista_id IN (SELECT id FROM usuarios WHERE email LIKE '%teste%');
-- DELETE FROM caracteristicas_veiculos WHERE veiculo_id IN (SELECT id FROM veiculos WHERE motorista_id IN (SELECT id FROM usuarios WHERE email LIKE '%teste%'));
-- DELETE FROM usuarios WHERE email LIKE '%teste%';

-- ==========================================
-- 1. TRANSPORTES ESCOLARES
-- ==========================================

-- Transporte Escolar 1: São João
-- Senha padrão para todos os usuários de teste: teste123 (hash bcrypt)
INSERT INTO usuarios (nome_completo, email, celular, tipo_usuario, endereco_completo, senha, latitude, longitude, bairro, cidade, estado)
VALUES (
    'João Silva',
    'joao.silva.teste@email.com',
    '(11) 98765-4321',
    'motorista_escolar',
    'Rua das Flores, 123, Vila Madalena',
    '$2b$10$zPe12rT8.cDnSK.Y.EzVIO9Mu/yUboVImsiw.AgPJzirH/tKMpHY6', -- teste123
    -23.5505,
    -46.6333,
    'Vila Madalena',
    'São Paulo',
    'SP'
) ON CONFLICT (email) DO UPDATE SET 
    nome_completo = EXCLUDED.nome_completo,
    senha = EXCLUDED.senha,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    bairro = EXCLUDED.bairro,
    cidade = EXCLUDED.cidade,
    estado = EXCLUDED.estado;

-- Se o usuário já existe, buscar o ID
DO $$
DECLARE
    user1_id INTEGER;
BEGIN
    SELECT id INTO user1_id FROM usuarios WHERE email = 'joao.silva.teste@email.com';
    
    IF user1_id IS NOT NULL THEN
        -- Veículo
        INSERT INTO veiculos (motorista_id, placa, modelo, capacidade, ano, status)
        VALUES (user1_id, 'ABC-1234', 'Mercedes Sprinter', 25, 2020, 'ativo')
        ON CONFLICT (placa) DO NOTHING;
        
        -- Características do veículo
        INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento)
        SELECT v.id, true, true, false, true
        FROM veiculos v
        WHERE v.placa = 'ABC-1234'
        ON CONFLICT DO NOTHING;
        
        -- Rota Escolar
        INSERT INTO rotas_escolares (
            usuario_id, nome_rota, escola_destino, turno, horario_ida, horario_volta,
            valor_mensal, preco_mensal, vagas_disponiveis, ativa, status_rota,
            latitude_origem, longitude_origem, latitude_destino, longitude_destino,
            endereco_origem, endereco_destino, capacidade_maxima, capacidade_atual
        )
        VALUES (
            user1_id,
            'Rota Centro - Zona Sul',
            'Escola Municipal São João',
            'Manhã',
            '07:00',
            '12:00',
            180.00,
            180.00,
            5,
            true,
            'ativa',
            -23.5505,
            -46.6333,
            -23.5615,
            -46.6565,
            'Rua das Flores, 123, Vila Madalena',
            'Av. Paulista, 1000, Bela Vista',
            25,
            20
        ) ON CONFLICT DO NOTHING;
        
        -- Avaliações
        INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
        VALUES 
            (user1_id, user1_id, 5, 'Excelente serviço!', true),
            (user1_id, user1_id, 4, 'Muito pontual e seguro', true),
            (user1_id, user1_id, 5, 'Recomendo!', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Transporte Escolar 2: Alegria
INSERT INTO usuarios (nome_completo, email, celular, tipo_usuario, endereco_completo, senha, latitude, longitude, bairro, cidade, estado)
VALUES (
    'Maria Santos',
    'maria.santos.teste@email.com',
    '(11) 97654-3210',
    'motorista_escolar',
    'Av. Faria Lima, 456, Pinheiros',
    '$2b$10$zPe12rT8.cDnSK.Y.EzVIO9Mu/yUboVImsiw.AgPJzirH/tKMpHY6', -- teste123
    -23.5615,
    -46.6565,
    'Pinheiros',
    'São Paulo',
    'SP'
) ON CONFLICT (email) DO UPDATE SET 
    nome_completo = EXCLUDED.nome_completo,
    senha = EXCLUDED.senha,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    bairro = EXCLUDED.bairro,
    cidade = EXCLUDED.cidade,
    estado = EXCLUDED.estado;

DO $$
DECLARE
    user2_id INTEGER;
BEGIN
    SELECT id INTO user2_id FROM usuarios WHERE email = 'maria.santos.teste@email.com';
    
    IF user2_id IS NOT NULL THEN
        INSERT INTO veiculos (motorista_id, placa, modelo, capacidade, ano, status)
        VALUES (user2_id, 'DEF-5678', 'Volkswagen Kombi', 15, 2019, 'ativo')
        ON CONFLICT (placa) DO NOTHING;
        
        INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento)
        SELECT v.id, true, true, false, true
        FROM veiculos v
        WHERE v.placa = 'DEF-5678'
        ON CONFLICT DO NOTHING;
        
        INSERT INTO rotas_escolares (
            usuario_id, nome_rota, escola_destino, turno, horario_ida, horario_volta,
            valor_mensal, preco_mensal, vagas_disponiveis, ativa, status_rota,
            latitude_origem, longitude_origem, latitude_destino, longitude_destino,
            endereco_origem, endereco_destino, capacidade_maxima, capacidade_atual
        )
        VALUES (
            user2_id,
            'Rota Pinheiros - Centro',
            'Colégio Santa Maria',
            'Tarde',
            '13:00',
            '17:30',
            150.00,
            150.00,
            3,
            true,
            'ativa',
            -23.5615,
            -46.6565,
            -23.5505,
            -46.6333,
            'Av. Faria Lima, 456, Pinheiros',
            'Rua Augusta, 500, Consolação',
            15,
            12
        ) ON CONFLICT DO NOTHING;
        
        INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
        VALUES 
            (user2_id, user2_id, 5, 'Ótimo atendimento', true),
            (user2_id, user2_id, 4, 'Pontual e confiável', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 2. TRANSPORTES DE EXCURSÃO
-- ==========================================

-- Excursão 1: Aventura
INSERT INTO usuarios (nome_completo, email, celular, tipo_usuario, endereco_completo, senha, latitude, longitude, bairro, cidade, estado)
VALUES (
    'Carlos Oliveira',
    'carlos.oliveira.teste@email.com',
    '(11) 96543-2109',
    'motorista_excursao',
    'Rua Augusta, 789, Consolação',
    '$2b$10$zPe12rT8.cDnSK.Y.EzVIO9Mu/yUboVImsiw.AgPJzirH/tKMpHY6', -- teste123
    -23.5395,
    -46.6103,
    'Consolação',
    'São Paulo',
    'SP'
) ON CONFLICT (email) DO UPDATE SET 
    nome_completo = EXCLUDED.nome_completo,
    senha = EXCLUDED.senha,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    bairro = EXCLUDED.bairro,
    cidade = EXCLUDED.cidade,
    estado = EXCLUDED.estado;

DO $$
DECLARE
    user3_id INTEGER;
BEGIN
    SELECT id INTO user3_id FROM usuarios WHERE email = 'carlos.oliveira.teste@email.com';
    
    IF user3_id IS NOT NULL THEN
        INSERT INTO veiculos (motorista_id, placa, modelo, capacidade, ano, status)
        VALUES (user3_id, 'GHI-9012', 'Mercedes Tourismo', 45, 2021, 'ativo')
        ON CONFLICT (placa) DO NOTHING;
        
        INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, banheiro, tv_dvd)
        SELECT v.id, true, true, true, true, true, true
        FROM veiculos v
        WHERE v.placa = 'GHI-9012'
        ON CONFLICT DO NOTHING;
        
        INSERT INTO pacotes_excursao (
            usuario_id, nome_pacote, destino, data_inicio, data_fim, duracao_dias,
            preco_por_pessoa, valor_por_pessoa, vagas_disponiveis, ativo,
            latitude_partida, longitude_partida, latitude_destino, longitude_destino,
            endereco_partida, endereco_destino
        )
        VALUES (
            user3_id,
            'Excursão Campos do Jordão',
            'Campos do Jordão - SP',
            CURRENT_DATE + INTERVAL '7 days',
            CURRENT_DATE + INTERVAL '9 days',
            2,
            80.00,
            80.00,
            10,
            true,
            -23.5395,
            -46.6103,
            -22.7397,
            -45.5912,
            'Terminal Rodoviário Tietê, São Paulo',
            'Centro de Campos do Jordão'
        ) ON CONFLICT DO NOTHING;
        
        INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
        VALUES 
            (user3_id, user3_id, 5, 'Viagem incrível!', true),
            (user3_id, user3_id, 5, 'Super recomendo', true),
            (user3_id, user3_id, 4, 'Ótimo passeio', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Excursão 2: Turismo Silva
INSERT INTO usuarios (nome_completo, email, celular, tipo_usuario, endereco_completo, senha, latitude, longitude, bairro, cidade, estado)
VALUES (
    'Ana Costa',
    'ana.costa.teste@email.com',
    '(11) 95432-1098',
    'motorista_excursao',
    'Av. Paulista, 1000, Bela Vista',
    '$2b$10$zPe12rT8.cDnSK.Y.EzVIO9Mu/yUboVImsiw.AgPJzirH/tKMpHY6', -- teste123
    -23.5725,
    -46.6412,
    'Bela Vista',
    'São Paulo',
    'SP'
) ON CONFLICT (email) DO UPDATE SET 
    nome_completo = EXCLUDED.nome_completo,
    senha = EXCLUDED.senha,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    bairro = EXCLUDED.bairro,
    cidade = EXCLUDED.cidade,
    estado = EXCLUDED.estado;

DO $$
DECLARE
    user4_id INTEGER;
BEGIN
    SELECT id INTO user4_id FROM usuarios WHERE email = 'ana.costa.teste@email.com';
    
    IF user4_id IS NOT NULL THEN
        INSERT INTO veiculos (motorista_id, placa, modelo, capacidade, ano, status)
        VALUES (user4_id, 'JKL-3456', 'Scania Intercity', 50, 2022, 'ativo')
        ON CONFLICT (placa) DO NOTHING;
        
        INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, banheiro, tv_dvd, frigobar)
        SELECT v.id, true, true, false, true, true, true, true
        FROM veiculos v
        WHERE v.placa = 'JKL-3456'
        ON CONFLICT DO NOTHING;
        
        INSERT INTO pacotes_excursao (
            usuario_id, nome_pacote, destino, data_inicio, data_fim, duracao_dias,
            preco_por_pessoa, valor_por_pessoa, vagas_disponiveis, ativo,
            latitude_partida, longitude_partida, latitude_destino, longitude_destino,
            endereco_partida, endereco_destino
        )
        VALUES (
            user4_id,
            'Passeio Serra da Mantiqueira',
            'Monte Verde - MG',
            CURRENT_DATE + INTERVAL '14 days',
            CURRENT_DATE + INTERVAL '16 days',
            2,
            120.00,
            120.00,
            15,
            true,
            -23.5725,
            -46.6412,
            -22.8642,
            -46.0356,
            'Terminal Rodoviário Barra Funda, São Paulo',
            'Centro de Monte Verde'
        ) ON CONFLICT DO NOTHING;
        
        INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
        VALUES 
            (user4_id, user4_id, 5, 'Excelente experiência', true),
            (user4_id, user4_id, 4, 'Muito bom', true),
            (user4_id, user4_id, 5, 'Recomendo!', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 3. TRANSPORTE MISTO (Escolar + Excursão)
-- ==========================================

INSERT INTO usuarios (nome_completo, email, celular, tipo_usuario, endereco_completo, senha, latitude, longitude, bairro, cidade, estado)
VALUES (
    'Pedro Alves',
    'pedro.alves.teste@email.com',
    '(11) 94321-0987',
    'motorista_escolar_excursao',
    'Rua Oscar Freire, 200, Jardins',
    '$2b$10$zPe12rT8.cDnSK.Y.EzVIO9Mu/yUboVImsiw.AgPJzirH/tKMpHY6', -- teste123
    -23.5635,
    -46.6700,
    'Jardins',
    'São Paulo',
    'SP'
) ON CONFLICT (email) DO UPDATE SET 
    nome_completo = EXCLUDED.nome_completo,
    senha = EXCLUDED.senha,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    bairro = EXCLUDED.bairro,
    cidade = EXCLUDED.cidade,
    estado = EXCLUDED.estado;

DO $$
DECLARE
    user5_id INTEGER;
BEGIN
    SELECT id INTO user5_id FROM usuarios WHERE email = 'pedro.alves.teste@email.com';
    
    IF user5_id IS NOT NULL THEN
        INSERT INTO veiculos (motorista_id, placa, modelo, capacidade, ano, status)
        VALUES (user5_id, 'MNO-7890', 'Iveco Daily', 30, 2020, 'ativo')
        ON CONFLICT (placa) DO NOTHING;
        
        INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento)
        SELECT v.id, true, true, true, true
        FROM veiculos v
        WHERE v.placa = 'MNO-7890'
        ON CONFLICT DO NOTHING;
        
        -- Rota Escolar
        INSERT INTO rotas_escolares (
            usuario_id, nome_rota, escola_destino, turno, horario_ida, horario_volta,
            valor_mensal, preco_mensal, vagas_disponiveis, ativa, status_rota,
            latitude_origem, longitude_origem, latitude_destino, longitude_destino,
            endereco_origem, endereco_destino, capacidade_maxima, capacidade_atual
        )
        VALUES (
            user5_id,
            'Rota Jardins - Zona Oeste',
            'Escola Internacional',
            'Manhã',
            '07:30',
            '12:30',
            200.00,
            200.00,
            8,
            true,
            'ativa',
            -23.5635,
            -46.6700,
            -23.5505,
            -46.6333,
            'Rua Oscar Freire, 200, Jardins',
            'Av. Brigadeiro Faria Lima, 2000, Itaim Bibi',
            30,
            22
        ) ON CONFLICT DO NOTHING;
        
        -- Pacote Excursão
        INSERT INTO pacotes_excursao (
            usuario_id, nome_pacote, destino, data_inicio, data_fim, duracao_dias,
            preco_por_pessoa, valor_por_pessoa, vagas_disponiveis, ativo,
            latitude_partida, longitude_partida, latitude_destino, longitude_destino,
            endereco_partida, endereco_destino
        )
        VALUES (
            user5_id,
            'City Tour São Paulo',
            'Centro Histórico de São Paulo',
            CURRENT_DATE + INTERVAL '3 days',
            CURRENT_DATE + INTERVAL '3 days',
            1,
            50.00,
            50.00,
            20,
            true,
            -23.5635,
            -46.6700,
            -23.5505,
            -46.6333,
            'Rua Oscar Freire, 200, Jardins',
            'Praça da Sé, Centro'
        ) ON CONFLICT DO NOTHING;
        
        INSERT INTO avaliacoes (avaliador_id, avaliado_id, nota, comentario, aprovado)
        VALUES 
            (user5_id, user5_id, 5, 'Serviço completo!', true),
            (user5_id, user5_id, 5, 'Muito profissional', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

COMMIT;

-- ==========================================
-- VERIFICAÇÃO DOS DADOS INSERIDOS
-- ==========================================
SELECT 
    'Usuários criados' as tipo,
    COUNT(*) as total
FROM usuarios 
WHERE email LIKE '%teste%'
UNION ALL
SELECT 
    'Veículos criados',
    COUNT(*)
FROM veiculos v
JOIN usuarios u ON v.motorista_id = u.id
WHERE u.email LIKE '%teste%'
UNION ALL
SELECT 
    'Rotas escolares criadas',
    COUNT(*)
FROM rotas_escolares r
JOIN usuarios u ON r.usuario_id = u.id
WHERE u.email LIKE '%teste%'
UNION ALL
SELECT 
    'Pacotes excursão criados',
    COUNT(*)
FROM pacotes_excursao p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.email LIKE '%teste%'
UNION ALL
SELECT 
    'Avaliações criadas',
    COUNT(*)
FROM avaliacoes a
JOIN usuarios u ON a.avaliado_id = u.id
WHERE u.email LIKE '%teste%';

