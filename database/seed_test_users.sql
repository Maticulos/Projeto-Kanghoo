CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    motorista_basic INTEGER;
    motorista_premium INTEGER;
    motorista_excursao INTEGER;
    motorista_hibrido INTEGER;
    resp_ana INTEGER;
    resp_bruno INTEGER;
    resp_carla INTEGER;
    admin_user INTEGER;

    rota_basic_manha INTEGER;
    rota_premium_tarde INTEGER;
    rota_hibrido_manha INTEGER;

    rota_escolar_basic INTEGER;
    rota_escolar_premium INTEGER;
    rota_escolar_hibrido INTEGER;

    crianca_sofia INTEGER;
    crianca_pedro INTEGER;
    crianca_lucas INTEGER;

    viagem_basic INTEGER;
    viagem_premium INTEGER;

    pacote_excursao_um INTEGER;
    pacote_excursao_dois INTEGER;

    veiculo_basic INTEGER;
    veiculo_premium INTEGER;
    veiculo_excursao INTEGER;
    veiculo_hibrido INTEGER;

    viagem_ativa_premium INTEGER;
BEGIN
    -- Limpar dados anteriores
    TRUNCATE TABLE
        inscricoes_excursao,
        pacotes_excursao,
        cache_localizacao,
        localizacoes,
        viagens,
        criancas_rotas,
        criancas,
        paradas_rota,
        rotas_escolares,
        rotas,
        veiculos,
        planos_assinatura,
        usuarios_status,
        usuarios
    RESTART IDENTITY CASCADE;

    -- Usuários principais
    INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, bairro, cidade, estado, tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia, cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso, rua, numero, complemento)
    VALUES ('Carla Rocha', 'basic@motorista.com', crypt('teste123', gen_salt('bf', 10)), '(48) 98888-1000', 'motorista_escolar', 'motorista_escolar', 'Rua Altamiro Guimaraes, 120 - Centro, Tubarao/SC', 'Centro', 'Tubarao', 'SC', 'fisica', 'profile_basic.jpg', 'Maria Rocha', '(48) 99999-1111', '12345678900', 'D', '2030-01-01', 'cnh_basic.jpg', 'antecedentes_basic.jpg', 'curso_basic.jpg', 'Rua Altamiro Guimaraes', '120', 'Apto 101')
    RETURNING id INTO motorista_basic;

    INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, bairro, cidade, estado, tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia, cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso, rua, numero, complemento)
    VALUES ('Marina Prado', 'premium@motorista.com', crypt('teste123', gen_salt('bf', 10)), '(48) 97777-2000', 'motorista_escolar', 'motorista_escolar', 'Av. Marcolino Martins Cabral, 1000 - Centro, Tubarao/SC', 'Centro', 'Tubarao', 'SC', 'fisica', 'profile_premium.jpg', 'Joao Prado', '(48) 99999-2222', '12345678901', 'D', '2030-01-01', 'cnh_premium.jpg', 'antecedentes_premium.jpg', 'curso_premium.jpg', 'Av. Marcolino Martins Cabral', '1000', NULL)
    RETURNING id INTO motorista_premium;

    INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, bairro, cidade, estado, tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia, cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso, rua, numero, complemento)
    VALUES ('Rafael Teixeira', 'excursao@motorista.com', crypt('teste123', gen_salt('bf', 10)), '(48) 96666-3000', 'motorista_excursao', 'motorista_excursao', 'Rua Sao Manoel, 500 - Oficinas, Tubarao/SC', 'Oficinas', 'Tubarao', 'SC', 'juridica', 'profile_excursao.jpg', 'Ana Teixeira', '(48) 99999-3333', '12345678902', 'E', '2030-01-01', 'cnh_excursao.jpg', 'antecedentes_excursao.jpg', 'curso_excursao.jpg', 'Rua Sao Manoel', '500', NULL)
    RETURNING id INTO motorista_excursao;

    INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, bairro, cidade, estado, tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia, cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso, rua, numero, complemento)
    VALUES ('Lucas Brito', 'hibrido@motorista.com', crypt('teste123', gen_salt('bf', 10)), '(48) 96555-4000', 'motorista_escolar_excursao', 'motorista_escolar_excursao', 'Av. Pedro Zapelini, 1400 - Humaita, Tubarao/SC', 'Humaita', 'Tubarao', 'SC', 'fisica', 'profile_hibrido.jpg', 'Pedro Brito', '(48) 99999-4444', '12345678903', 'D', '2030-01-01', 'cnh_hibrido.jpg', 'antecedentes_hibrido.jpg', 'curso_hibrido.jpg', 'Av. Pedro Zapelini', '1400', NULL)
    RETURNING id INTO motorista_hibrido;

    INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, bairro, cidade, estado, tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia, cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso, rua, numero, complemento)
    VALUES ('Ana Costa', 'pai1@email.com', crypt('teste123', gen_salt('bf', 10)), '(48) 95555-5000', 'responsavel', 'responsavel', 'Rua Lauro Muller, 456 - Centro, Tubarao/SC', 'Centro', 'Tubarao', 'SC', 'fisica', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Rua Lauro Muller', '456', NULL)
    RETURNING id INTO resp_ana;

    INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, bairro, cidade, estado, tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia, cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso, rua, numero, complemento)
    VALUES ('Bruno Lima', 'pai2@email.com', crypt('teste123', gen_salt('bf', 10)), '(48) 94444-6000', 'responsavel', 'responsavel', 'Rua Augusto Hulse, 789 - Oficinas, Tubarao/SC', 'Oficinas', 'Tubarao', 'SC', 'fisica', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Rua Augusto Hulse', '789', NULL)
    RETURNING id INTO resp_bruno;

    INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, bairro, cidade, estado, tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia, cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso, rua, numero, complemento)
    VALUES ('Carla Mendes', 'pai3@email.com', crypt('teste123', gen_salt('bf', 10)), '(48) 93333-7000', 'responsavel', 'responsavel', 'Av. Patricio Lima, 321 - Humaita, Tubarao/SC', 'Humaita', 'Tubarao', 'SC', 'fisica', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Av. Patricio Lima', '321', NULL)
    RETURNING id INTO resp_carla;

    INSERT INTO usuarios (nome_completo, email, senha, celular, tipo_cadastro, tipo_usuario, endereco_completo, bairro, cidade, estado, tipo_pessoa, foto_perfil, nome_emergencia, telefone_emergencia, cnh, categoria_cnh, validade_cnh, foto_cnh, foto_antecedentes, foto_curso, rua, numero, complemento)
    VALUES ('Administrador Kanghoo', 'admin@kanghoo.test', crypt('teste123', gen_salt('bf', 10)), '(48) 90000-0000', 'admin', 'admin', 'Rua Sao Jose, 1 - Centro, Tubarao/SC', 'Centro', 'Tubarao', 'SC', 'fisica', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Rua Sao Jose', '1', NULL)
    RETURNING id INTO admin_user;

    -- Status
    INSERT INTO usuarios_status (usuario_id, tipo_usuario, ativo, origem)
    VALUES
        (motorista_basic, 'motorista_escolar', true, 'seed'),
        (motorista_premium, 'motorista_escolar', true, 'seed'),
        (motorista_excursao, 'motorista_excursao', true, 'seed'),
        (motorista_hibrido, 'motorista_escolar_excursao', true, 'seed'),
        (resp_ana, 'responsavel', true, 'seed'),
        (resp_bruno, 'responsavel', true, 'seed'),
        (resp_carla, 'responsavel', true, 'seed'),
        (admin_user, 'admin', true, 'seed');

    -- Planos
    INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios, ativo)
    VALUES
        (motorista_basic, 'basico', 3, 15, true),
        (motorista_premium, 'premium', 10, 60, true),
        (motorista_excursao, 'premium', 8, 80, true),
        (motorista_hibrido, 'premium', 12, 80, true);

    -- Veículos
    INSERT INTO veiculos (placa, modelo, marca, capacidade, ano, status, motorista_id, ultima_manutencao, quilometragem, ano_modelo, seguradora, apolice, validade_seguro, foto_crlv)
    VALUES ('KHG1B01', 'Master', 'Renault', 12, 2020, 'ativo', motorista_basic, CURRENT_DATE - INTERVAL '30 days', 120000, 2021, 'Porto Seguro', '123456', '2026-01-01', 'crlv_basic.jpg')
    RETURNING id INTO veiculo_basic;

    INSERT INTO veiculos (placa, modelo, marca, capacidade, ano, status, motorista_id, ultima_manutencao, quilometragem, ano_modelo, seguradora, apolice, validade_seguro, foto_crlv)
    VALUES ('KHG2P02', 'Sprinter', 'Mercedes-Benz', 16, 2022, 'ativo', motorista_premium, CURRENT_DATE - INTERVAL '20 days', 85000, 2023, 'Allianz', '654321', '2026-01-01', 'crlv_premium.jpg')
    RETURNING id INTO veiculo_premium;

    INSERT INTO veiculos (placa, modelo, marca, capacidade, ano, status, motorista_id, ultima_manutencao, quilometragem, ano_modelo, seguradora, apolice, validade_seguro, foto_crlv)
    VALUES ('KHG3E03', 'Senior', 'Marcopolo', 44, 2019, 'ativo', motorista_excursao, CURRENT_DATE - INTERVAL '60 days', 210000, 2020, 'Mapfre', '987654', '2026-01-01', 'crlv_excursao.jpg')
    RETURNING id INTO veiculo_excursao;

    INSERT INTO veiculos (placa, modelo, marca, capacidade, ano, status, motorista_id, ultima_manutencao, quilometragem, ano_modelo, seguradora, apolice, validade_seguro, foto_crlv)
    VALUES ('KHG4H04', 'Ducato', 'Fiat', 15, 2021, 'ativo', motorista_hibrido, CURRENT_DATE - INTERVAL '45 days', 133000, 2022, 'Tokio Marine', '456789', '2026-01-01', 'crlv_hibrido.jpg')
    RETURNING id INTO veiculo_hibrido;

    -- Caracteristicas Veiculos
    INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, tv_dvd, banheiro, poltronas_reclinaveis)
    VALUES 
        (veiculo_basic, true, false, false, true, false, false, false),
        (veiculo_premium, true, true, true, true, true, false, true),
        (veiculo_excursao, true, true, false, true, true, true, true),
        (veiculo_hibrido, true, false, true, true, false, false, false);

    -- Rotas (legado)
    INSERT INTO rotas (motorista_id, usuario_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativa, ativo)
    VALUES (motorista_basic, motorista_basic, 'Rota Manha - Oficinas', 'Percurso matutino Colegio Dehon', '06:30', '12:05', 'seg-sex', true, true)
    RETURNING id INTO rota_basic_manha;

    INSERT INTO rotas (motorista_id, usuario_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativa, ativo)
    VALUES (motorista_premium, motorista_premium, 'Rota Tarde - Centro', 'Percurso vespertino Colegio Adventista', '12:30', '18:00', 'seg-sex', true, true)
    RETURNING id INTO rota_premium_tarde;

    INSERT INTO rotas (motorista_id, usuario_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativa, ativo)
    VALUES (motorista_hibrido, motorista_hibrido, 'Rota Mista - Humaita', 'Manha completa Humaita', '07:10', '13:00', 'seg-sex', true, true)
    RETURNING id INTO rota_hibrido_manha;

    -- Rotas escolares
    INSERT INTO rotas_escolares (
        usuario_id, nome_rota, descricao, escola_destino, turno,
        horario_ida, horario_volta, dias_semana, preco_mensal,
        vagas_disponiveis, ativa, status_rota, capacidade_maxima,
        capacidade_atual, latitude_destino, longitude_destino,
        latitude_origem, longitude_origem, endereco_origem, endereco_destino)
    VALUES (
        motorista_basic,
        'Rota Oficinas - Colegio Dehon',
        'Percurso com duas paradas no bairro Oficinas',
        'Colegio Dehon',
        'manha',
        '06:40',
        '12:10',
        'seg-sex',
        180.00,
        4,
        true,
        'ativa',
        12,
        8,
        -28.4744,
        -48.9996,
        -28.4780,
        -49.0075,
        'Oficinas - Tubarao',
        'Colegio Dehon - Tubarao'
    ) RETURNING id INTO rota_escolar_basic;

    INSERT INTO rotas_escolares (
        usuario_id, nome_rota, descricao, escola_destino, turno,
        horario_ida, horario_volta, dias_semana, preco_mensal,
        vagas_disponiveis, ativa, status_rota, capacidade_maxima,
        capacidade_atual, latitude_destino, longitude_destino,
        latitude_origem, longitude_origem, endereco_origem, endereco_destino)
    VALUES (
        motorista_premium,
        'Rota Centro - Colegio Adventista',
        'Percurso com checklist digital no centro',
        'Colegio Adventista Tubarao',
        'tarde',
        '12:45',
        '18:05',
        'seg-sex',
        240.00,
        6,
        true,
        'ativa',
        16,
        10,
        -28.4718,
        -48.9984,
        -28.4722,
        -48.9999,
        'Centro - Tubarao',
        'Colegio Adventista - Tubarao'
    ) RETURNING id INTO rota_escolar_premium;

    INSERT INTO rotas_escolares (
        usuario_id, nome_rota, descricao, escola_destino, turno,
        horario_ida, horario_volta, dias_semana, preco_mensal,
        vagas_disponiveis, ativa, status_rota, capacidade_maxima,
        capacidade_atual, latitude_destino, longitude_destino,
        latitude_origem, longitude_origem, endereco_origem, endereco_destino)
    VALUES (
        motorista_hibrido,
        'Rota Humaita - Colegio Energia',
        'Rota para alunos do bairro Humaita',
        'Colegio Energia Tubarao',
        'manha',
        '07:20',
        '12:50',
        'seg-sex',
        210.00,
        7,
        true,
        'ativa',
        15,
        9,
        -28.4880,
        -49.0158,
        -28.4868,
        -49.0135,
        'Humaita - Tubarao',
        'Colegio Energia - Tubarao'
    ) RETURNING id INTO rota_escolar_hibrido;

    -- Paradas
    INSERT INTO paradas_rota (rota_id, ordem_parada, endereco, latitude, longitude, horario_previsto, tipo_parada, ativo)
    VALUES
        (rota_escolar_basic, 1, 'Praca Sete de Setembro - Centro', -28.4775, -49.0069, '06:35', 'embarque', true),
        (rota_escolar_basic, 2, 'Rua Jose Alves dos Santos - Oficinas', -28.4851, -49.0155, '06:45', 'embarque', true),
        (rota_escolar_basic, 3, 'Colegio Dehon - Centro', -28.4744, -48.9996, '07:05', 'desembarque', true),
        (rota_escolar_premium, 1, 'Arena Multiuso - Revoredo', -28.4745, -49.0038, '12:20', 'embarque', true),
        (rota_escolar_premium, 2, 'Av. Marcolino M. Cabral - Centro', -28.4722, -48.9999, '12:35', 'embarque', true),
        (rota_escolar_premium, 3, 'Colegio Adventista Tubarao', -28.4718, -48.9984, '12:55', 'desembarque', true),
        (rota_escolar_hibrido, 1, 'Shopping Farol Center - Oficinas', -28.4812, -49.0122, '07:00', 'embarque', true),
        (rota_escolar_hibrido, 2, 'Av. Pedro Zapelini - Humaita', -28.4890, -49.0170, '07:15', 'embarque', true),
        (rota_escolar_hibrido, 3, 'Colegio Energia Tubarao', -28.4880, -49.0158, '07:35', 'desembarque', true);

    -- Crianças
    INSERT INTO criancas (nome_completo, cpf, idade, data_nascimento, nome_responsavel, telefone_responsavel, email_responsavel, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, ativo)
    VALUES ('Sofia Ferreira', '12345678901', 9, '2016-03-15', 'Ana Costa', '(48) 95555-5000', 'pai1@email.com', 'Rua Lauro Muller, 456 - Tubarao', 'Colegio Dehon', 'Rua Padre Dionisio, 100 - Tubarao', resp_ana, motorista_basic, true)
    RETURNING id INTO crianca_sofia;

    INSERT INTO criancas (nome_completo, cpf, idade, data_nascimento, nome_responsavel, telefone_responsavel, email_responsavel, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, ativo)
    VALUES ('Pedro Mendes', '98765432109', 10, '2015-08-22', 'Bruno Lima', '(48) 94444-6000', 'pai2@email.com', 'Rua Augusto Hulse, 789 - Tubarao', 'Colegio Adventista Tubarao', 'Av. Marcolino Martins Cabral, 500 - Tubarao', resp_bruno, motorista_premium, true)
    RETURNING id INTO crianca_pedro;

    INSERT INTO criancas (nome_completo, cpf, idade, data_nascimento, nome_responsavel, telefone_responsavel, email_responsavel, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, ativo)
    VALUES ('Lucas Santos', '11122233344', 8, '2017-01-10', 'Carla Mendes', '(48) 93333-7000', 'pai3@email.com', 'Av. Patricio Lima, 321 - Tubarao', 'Colegio Energia Tubarao', 'Rua Emilio Notz, 50 - Tubarao', resp_carla, motorista_hibrido, true)
    RETURNING id INTO crianca_lucas;

    -- Associação crianças x rotas
    INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo)
    VALUES (crianca_sofia, rota_escolar_basic, 'Rua Lauro Muller, 456 - Tubarao', 'Colegio Dehon', -28.4780, -49.0075, -28.4744, -48.9996, '06:50', '12:10', true);

    INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo)
    VALUES (crianca_pedro, rota_escolar_premium, 'Rua Augusto Hulse, 789 - Tubarao', 'Colegio Adventista Tubarao', -28.4825, -49.0110, -28.4718, -48.9984, '12:25', '18:00', true);

    INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo)
    VALUES (crianca_lucas, rota_escolar_hibrido, 'Av. Patricio Lima, 321 - Tubarao', 'Colegio Energia Tubarao', -28.4868, -49.0135, -28.4880, -49.0158, '07:10', '12:40', true);

    -- Viagens históricas
    INSERT INTO viagens (motorista_id, rota_id, tipo_viagem, status, data_viagem, horario_inicio, horario_fim, distancia_total, tempo_total, observacoes)
    VALUES (motorista_basic, rota_basic_manha, 'ida', 'concluida', CURRENT_DATE - INTERVAL '1 day', NOW() - INTERVAL '25 hours', NOW() - INTERVAL '24 hours 10 minutes', 18.4, 70, 'Turno da manha concluido com sucesso')
    RETURNING id INTO viagem_basic;

    INSERT INTO viagens (motorista_id, rota_id, tipo_viagem, status, data_viagem, horario_inicio, horario_fim, distancia_total, tempo_total, observacoes)
    VALUES (motorista_premium, rota_premium_tarde, 'volta', 'concluida', CURRENT_DATE - INTERVAL '2 day', NOW() - INTERVAL '44 hours', NOW() - INTERVAL '43 hours 5 minutes', 21.0, 65, 'Viagem vespertina sem atrasos')
    RETURNING id INTO viagem_premium;

    -- Viagem Ativa (para teste de realtime)
    INSERT INTO viagens (motorista_id, rota_id, tipo_viagem, status, data_viagem, horario_inicio, observacoes)
    VALUES (motorista_premium, rota_premium_tarde, 'ida', 'em_andamento', CURRENT_DATE, NOW() - INTERVAL '30 minutes', 'Viagem em andamento teste')
    RETURNING id INTO viagem_ativa_premium;

    INSERT INTO localizacoes (viagem_id, motorista_id, latitude, longitude, velocidade, direcao, precisao, tipo_ponto)
    VALUES (viagem_basic, motorista_basic, -28.4770, -49.0042, 38.5, 180, 5.0, 'tracking');

    INSERT INTO localizacoes (viagem_id, motorista_id, latitude, longitude, velocidade, direcao, precisao, tipo_ponto)
    VALUES (viagem_premium, motorista_premium, -28.4735, -48.9998, 32.0, 200, 4.5, 'tracking');

    -- Cache de localização em tempo real
    INSERT INTO cache_localizacao (motorista_id, latitude, longitude, status, viagem_ativa_id)
    VALUES
        (motorista_basic, -28.4785, -49.0082, 'online', NULL),
        (motorista_premium, -28.4729, -48.9991, 'online', viagem_ativa_premium),
        (motorista_hibrido, -28.4862, -49.0144, 'online', NULL),
        (motorista_excursao, -28.4756, -49.0021, 'offline', NULL);

    -- Excursões
    INSERT INTO pacotes_excursao (usuario_id, nome_pacote, descricao, destino, data_saida, data_retorno, horario_saida, horario_retorno, valor_por_pessoa, preco_por_pessoa, vagas_disponiveis, inclui_alimentacao, inclui_hospedagem, ativo, latitude_partida, longitude_partida, endereco_partida, latitude_destino, longitude_destino, endereco_destino)
    VALUES (
        motorista_excursao,
        'Termas do Gravatal Experience',
        'Day-use com acesso aos termas e spa',
        'Gravatal - SC',
        CURRENT_DATE + INTERVAL '14 day',
        CURRENT_DATE + INTERVAL '14 day',
        '07:00',
        '20:00',
        320.00,
        420.00,
        28,
        true,
        false,
        true,
        -28.4745,
        -49.0038,
        'Arena Multiuso, Tubarao',
        -28.3319,
        -49.0596,
        'Termas do Gravatal'
    ) RETURNING id INTO pacote_excursao_um;

    INSERT INTO pacotes_excursao (usuario_id, nome_pacote, descricao, destino, data_saida, data_retorno, horario_saida, horario_retorno, valor_por_pessoa, preco_por_pessoa, vagas_disponiveis, inclui_alimentacao, inclui_hospedagem, ativo, latitude_partida, longitude_partida, endereco_partida, latitude_destino, longitude_destino, endereco_destino)
    VALUES (
        motorista_hibrido,
        'Serra do Rio do Rastro Premium',
        'Passeio bate-volta com paradas panoramicas',
        'Serra do Rio do Rastro - SC',
        CURRENT_DATE + INTERVAL '21 day',
        CURRENT_DATE + INTERVAL '21 day',
        '06:30',
        '21:30',
        450.00,
        510.00,
        32,
        true,
        true,
        true,
        -28.4732,
        -49.0002,
        'Shopping Farol Center, Tubarao',
        -28.3849,
        -49.4891,
        'Mirante da Serra do Rio do Rastro'
    ) RETURNING id INTO pacote_excursao_dois;

    INSERT INTO inscricoes_excursao (pacote_id, usuario_id, status_inscricao, observacoes)
    VALUES
        (pacote_excursao_um, resp_ana, 'confirmada', 'Pago via seed'),
        (pacote_excursao_um, resp_bruno, 'pendente', 'Aguardando comprovante'),
        (pacote_excursao_dois, resp_carla, 'confirmada', 'Reserva antecipada');

    RAISE NOTICE 'Perfis de teste criados com sucesso (senha: teste123)';
END $$;
