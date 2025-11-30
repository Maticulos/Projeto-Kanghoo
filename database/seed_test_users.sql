-- Seed de perfis completos para testes nas áreas pós-autenticação
-- Senha padrão para todos: teste123

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

    veiculo_basic INTEGER;
    veiculo_premium INTEGER;
    veiculo_hibrido INTEGER;
    veiculo_excursao INTEGER;

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
BEGIN
    -- Limpar dados anteriores dos perfis de teste
    PERFORM 1;
    DELETE FROM criancas_rotas WHERE crianca_id IN (
        SELECT id FROM criancas WHERE responsavel_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
            'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com',
            'pai1@email.com','pai2@email.com','pai3@email.com','admin@kanghoo.test'
        ])) OR motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
            'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com',
            'pai1@email.com','pai2@email.com','pai3@email.com','admin@kanghoo.test'
        ]))
    );
    DELETE FROM criancas_viagens WHERE crianca_id IN (
        SELECT id FROM criancas WHERE responsavel_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
            'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com',
            'pai1@email.com','pai2@email.com','pai3@email.com','admin@kanghoo.test'
        ])) OR motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
            'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com',
            'pai1@email.com','pai2@email.com','pai3@email.com','admin@kanghoo.test'
        ]))
    );
    DELETE FROM eventos_viagem WHERE viagem_id IN (SELECT id FROM viagens WHERE motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ])));
    DELETE FROM localizacoes WHERE motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM viagens WHERE motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM rastreamento WHERE motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM veiculos WHERE motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ])) OR usuario_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM rotas WHERE motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM criancas WHERE responsavel_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'pai1@email.com','pai2@email.com','pai3@email.com'
    ])) OR motorista_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM rotas_escolares WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM inscricoes_excursao WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com',
        'pai1@email.com','pai2@email.com','pai3@email.com'
    ]));
    DELETE FROM pacotes_excursao WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM planos_assinatura WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com'
    ]));
    DELETE FROM usuarios_status WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com',
        'pai1@email.com','pai2@email.com','pai3@email.com','admin@kanghoo.test'
    ]));
    DELETE FROM usuarios WHERE email = ANY(ARRAY[
        'basic@motorista.com','premium@motorista.com','excursao@motorista.com','hibrido@motorista.com',
        'pai1@email.com','pai2@email.com','pai3@email.com','admin@kanghoo.test'
    ]);

    -- Usuários principais
    INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario, cidade, estado, cep, status_conta, latitude, longitude, criado_em)
    VALUES ('Carla Rocha', 'basic@motorista.com', crypt('teste123', gen_salt('bf', 10)), 'motorista_escolar', '(11) 98888-1000', 'Rua dos Jacarandas, 120 - Pinheiros, Sao Paulo/SP', 'motorista_escolar', 'Sao Paulo', 'SP', '05422-000', 'ativo', -23.5610, -46.6780, NOW())
    RETURNING id INTO motorista_basic;

    INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario, cidade, estado, cep, status_conta, latitude, longitude, criado_em)
    VALUES ('Marina Prado', 'premium@motorista.com', crypt('teste123', gen_salt('bf', 10)), 'motorista_escolar', '(11) 97777-2000', 'Av. Paulista, 1000 - Bela Vista, Sao Paulo/SP', 'motorista_escolar', 'Sao Paulo', 'SP', '01310-100', 'ativo', -23.5618, -46.6550, NOW())
    RETURNING id INTO motorista_premium;

    INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario, cidade, estado, cep, status_conta, latitude, longitude, criado_em)
    VALUES ('Rafael Teixeira', 'excursao@motorista.com', crypt('teste123', gen_salt('bf', 10)), 'motorista_excursao', '(11) 96666-3000', 'Rua Augusta, 500 - Consolacao, Sao Paulo/SP', 'motorista_excursao', 'Sao Paulo', 'SP', '01305-000', 'ativo', -23.5565, -46.6600, NOW())
    RETURNING id INTO motorista_excursao;

    INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario, cidade, estado, cep, status_conta, latitude, longitude, criado_em)
    VALUES ('Lucas Brito', 'hibrido@motorista.com', crypt('teste123', gen_salt('bf', 10)), 'motorista_escolar_excursao', '(11) 96555-4000', 'Av. Faria Lima, 1400 - Itaim, Sao Paulo/SP', 'motorista_escolar_excursao', 'Sao Paulo', 'SP', '01452-000', 'ativo', -23.5710, -46.6750, NOW())
    RETURNING id INTO motorista_hibrido;

    INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario, cidade, estado, cep, status_conta, criado_em)
    VALUES ('Ana Costa', 'pai1@email.com', crypt('teste123', gen_salt('bf', 10)), 'responsavel', '(11) 95555-5000', 'Rua dos Jardins, 456 - Jardins, Sao Paulo/SP', 'responsavel', 'Sao Paulo', 'SP', '01415-000', 'ativo', NOW())
    RETURNING id INTO resp_ana;

    INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario, cidade, estado, cep, status_conta, criado_em)
    VALUES ('Bruno Lima', 'pai2@email.com', crypt('teste123', gen_salt('bf', 10)), 'responsavel', '(11) 94444-6000', 'Rua das Palmeiras, 789 - Moema, Sao Paulo/SP', 'responsavel', 'Sao Paulo', 'SP', '04515-000', 'ativo', NOW())
    RETURNING id INTO resp_bruno;

    INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario, cidade, estado, cep, status_conta, criado_em)
    VALUES ('Carla Mendes', 'pai3@email.com', crypt('teste123', gen_salt('bf', 10)), 'responsavel', '(11) 93333-7000', 'Av. Faria Lima, 321 - Itaim Bibi, Sao Paulo/SP', 'responsavel', 'Sao Paulo', 'SP', '04538-133', 'ativo', NOW())
    RETURNING id INTO resp_carla;

    INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario, cidade, estado, cep, status_conta, criado_em)
    VALUES ('Administrador Kanghoo', 'admin@kanghoo.test', crypt('teste123', gen_salt('bf', 10)), 'admin', '(11) 90000-0000', 'Rua Administrativa, 1 - Centro, Sao Paulo/SP', 'admin', 'Sao Paulo', 'SP', '01000-000', 'ativo', NOW())
    RETURNING id INTO admin_user;

    -- Status de usuários
    INSERT INTO usuarios_status (usuario_id, tipo_usuario, ativo, origem, criado_em, atualizado_em)
    VALUES
        (motorista_basic, 'motorista_escolar', true, 'seed', NOW(), NOW()),
        (motorista_premium, 'motorista_escolar', true, 'seed', NOW(), NOW()),
        (motorista_excursao, 'motorista_excursao', true, 'seed', NOW(), NOW()),
        (motorista_hibrido, 'motorista_escolar_excursao', true, 'seed', NOW(), NOW()),
        (resp_ana, 'responsavel', true, 'seed', NOW(), NOW()),
        (resp_bruno, 'responsavel', true, 'seed', NOW(), NOW()),
        (resp_carla, 'responsavel', true, 'seed', NOW(), NOW()),
        (admin_user, 'admin', true, 'seed', NOW(), NOW());

    -- Planos de assinatura
    INSERT INTO planos_assinatura (usuario_id, tipo_plano, limite_rotas, limite_usuarios, ativo, data_inicio, criado_em)
    VALUES
        (motorista_basic, 'basico', 3, 15, true, NOW(), NOW()),
        (motorista_premium, 'premium', 10, 60, true, NOW(), NOW()),
        (motorista_excursao, 'premium', 8, 80, true, NOW(), NOW()),
        (motorista_hibrido, 'premium', 12, 80, true, NOW(), NOW());

    -- Veículos
    INSERT INTO veiculos (usuario_id, motorista_id, placa, renavam, lotacao_maxima, capacidade, ano_fabricacao, ano_modelo, cor, modelo, marca, tipo_veiculo, ativo, status, criado_em)
    VALUES (motorista_basic, motorista_basic, 'KHG1B01', '11111111111', 12, 12, 2019, 2020, 'Branco', 'Master', 'Renault', 'van', true, 'ativo', NOW())
    RETURNING id INTO veiculo_basic;
    INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, cameras_seguranca)
    VALUES (veiculo_basic, true, false, true, true, true);

    INSERT INTO veiculos (usuario_id, motorista_id, placa, renavam, lotacao_maxima, capacidade, ano_fabricacao, ano_modelo, cor, modelo, marca, tipo_veiculo, ativo, status, criado_em)
    VALUES (motorista_premium, motorista_premium, 'KHG2P02', '22222222222', 16, 16, 2021, 2022, 'Prata', 'Sprinter', 'Mercedes', 'van', true, 'ativo', NOW())
    RETURNING id INTO veiculo_premium;
    INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, cameras_seguranca)
    VALUES (veiculo_premium, true, true, true, true, true);

    INSERT INTO veiculos (usuario_id, motorista_id, placa, renavam, lotacao_maxima, capacidade, ano_fabricacao, ano_modelo, cor, modelo, marca, tipo_veiculo, ativo, status, criado_em)
    VALUES (motorista_hibrido, motorista_hibrido, 'KHG4H04', '44444444444', 15, 15, 2020, 2021, 'Cinza', 'Ducato', 'Fiat', 'van', true, 'ativo', NOW())
    RETURNING id INTO veiculo_hibrido;
    INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, cameras_seguranca)
    VALUES (veiculo_hibrido, true, true, true, true, true);

    INSERT INTO veiculos (usuario_id, motorista_id, placa, renavam, lotacao_maxima, capacidade, ano_fabricacao, ano_modelo, cor, modelo, marca, tipo_veiculo, ativo, status, criado_em)
    VALUES (motorista_excursao, motorista_excursao, 'KHG3E03', '33333333333', 44, 44, 2018, 2019, 'Azul', 'Marcopolo', 'Mercedes', 'onibus', true, 'ativo', NOW())
    RETURNING id INTO veiculo_excursao;
    INSERT INTO caracteristicas_veiculos (veiculo_id, ar_condicionado, wifi, acessibilidade_pcd, gps_rastreamento, cameras_seguranca, banheiro, tv_dvd)
    VALUES (veiculo_excursao, true, true, true, true, true, true, true);

    -- Rotas (legacy)
    INSERT INTO rotas (motorista_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativo, criado_em)
    VALUES (motorista_basic, 'Rota Manha - Vila Madalena', 'Percurso matutino para Escola Monteiro Lobato', '06:30', '12:05', 'seg-sex', true, NOW())
    RETURNING id INTO rota_basic_manha;

    INSERT INTO rotas (motorista_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativo, criado_em)
    VALUES (motorista_premium, 'Rota Tarde - Jardins', 'Percurso vespertino para Colegio Sao Francisco', '12:30', '18:00', 'seg-sex', true, NOW())
    RETURNING id INTO rota_premium_tarde;

    INSERT INTO rotas (motorista_id, nome_rota, descricao, horario_inicio, horario_fim, dias_semana, ativo, criado_em)
    VALUES (motorista_hibrido, 'Rota Mista - Itaim', 'Rota escolar com ponto final na Faria Lima', '07:10', '13:00', 'seg-sex', true, NOW())
    RETURNING id INTO rota_hibrido_manha;

    -- Rotas escolares (nova API)
    INSERT INTO rotas_escolares (usuario_id, nome_rota, descricao, tipo_rota, escola_destino, turno, horario_ida, horario_volta, dias_semana, valor_mensal, capacidade_maxima, capacidade_atual, vagas_disponiveis, ativa, status_rota, criado_em)
    VALUES (motorista_basic, 'Rota Vila Madalena - Monteiro Lobato', 'Manha e volta com 2 paradas principais', 'ida_volta', 'Escola Monteiro Lobato', 'manha', '06:40', '12:10', 'seg-sex', 180.00, 12, 8, 4, true, 'ativa', NOW())
    RETURNING id INTO rota_escolar_basic;

    INSERT INTO rotas_escolares (usuario_id, nome_rota, descricao, tipo_rota, escola_destino, turno, horario_ida, horario_volta, dias_semana, valor_mensal, capacidade_maxima, capacidade_atual, vagas_disponiveis, ativa, status_rota, criado_em)
    VALUES (motorista_premium, 'Rota Jardins - Colegio Sao Francisco', 'Percurso com checklist digital', 'ida_volta', 'Colegio Sao Francisco', 'tarde', '12:45', '18:05', 'seg-sex', 240.00, 16, 10, 6, true, 'ativa', NOW())
    RETURNING id INTO rota_escolar_premium;

    INSERT INTO rotas_escolares (usuario_id, nome_rota, descricao, tipo_rota, escola_destino, turno, horario_ida, horario_volta, dias_semana, valor_mensal, capacidade_maxima, capacidade_atual, vagas_disponiveis, ativa, status_rota, criado_em)
    VALUES (motorista_hibrido, 'Rota Itaim - Colegio Horizonte', 'Rota para alunos de manha', 'ida_volta', 'Colegio Horizonte', 'manha', '07:20', '12:50', 'seg-sex', 210.00, 14, 7, 7, true, 'ativa', NOW())
    RETURNING id INTO rota_escolar_hibrido;

    -- Crianças
    INSERT INTO criancas (nome_completo, data_nascimento, idade, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, rota_id, cpf, nome_responsavel, telefone_responsavel, email_responsavel, ativo, notificar_embarque, notificar_desembarque, criado_em)
    VALUES ('Sofia Ferreira', '2016-03-15', 9, 'Rua dos Jardins, 456 - Sao Paulo', 'Escola Monteiro Lobato', 'Rua Monteiro Lobato, 100 - Sao Paulo', resp_ana, motorista_basic, rota_basic_manha, '12345678901', 'Ana Costa', '(11) 95555-5000', 'pai1@email.com', true, true, true, NOW())
    RETURNING id INTO crianca_sofia;

    INSERT INTO criancas (nome_completo, data_nascimento, idade, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, rota_id, cpf, nome_responsavel, telefone_responsavel, email_responsavel, ativo, notificar_embarque, notificar_desembarque, criado_em)
    VALUES ('Pedro Mendes', '2015-08-22', 10, 'Rua das Palmeiras, 789 - Sao Paulo', 'Colegio Sao Francisco', 'Av. Sao Francisco, 500 - Sao Paulo', resp_bruno, motorista_premium, rota_premium_tarde, '98765432109', 'Bruno Lima', '(11) 94444-6000', 'pai2@email.com', true, true, true, NOW())
    RETURNING id INTO crianca_pedro;

    INSERT INTO criancas (nome_completo, data_nascimento, idade, endereco_residencial, escola, endereco_escola, responsavel_id, motorista_id, rota_id, cpf, nome_responsavel, telefone_responsavel, email_responsavel, ativo, notificar_embarque, notificar_desembarque, criado_em)
    VALUES ('Lucas Santos', '2017-01-10', 8, 'Av. Faria Lima, 321 - Sao Paulo', 'Colegio Horizonte', 'Rua Horizonte, 50 - Sao Paulo', resp_carla, motorista_hibrido, rota_hibrido_manha, '11122233344', 'Carla Mendes', '(11) 93333-7000', 'pai3@email.com', true, true, true, NOW())
    RETURNING id INTO crianca_lucas;

    -- Associação crianças x rotas escolares
    INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo, criado_em)
    VALUES (crianca_sofia, rota_escolar_basic, 'Rua dos Jardins, 456 - Sao Paulo', 'Escola Monteiro Lobato', -23.5615, -46.6565, -23.5505, -46.6333, '06:50', '12:10', true, NOW());

    INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo, criado_em)
    VALUES (crianca_pedro, rota_escolar_premium, 'Rua das Palmeiras, 789 - Sao Paulo', 'Colegio Sao Francisco', -23.5965, -46.6722, -23.5615, -46.6565, '12:25', '18:00', true, NOW());

    INSERT INTO criancas_rotas (crianca_id, rota_id, endereco_embarque, endereco_desembarque, latitude_embarque, longitude_embarque, latitude_desembarque, longitude_desembarque, horario_embarque_previsto, horario_desembarque_previsto, ativo, criado_em)
    VALUES (crianca_lucas, rota_escolar_hibrido, 'Av. Faria Lima, 321 - Sao Paulo', 'Colegio Horizonte', -23.5875, -46.6822, -23.5710, -46.6750, '07:10', '12:40', true, NOW());

    -- Viagens históricas para dashboards
    INSERT INTO viagens (motorista_id, rota_id, tipo_viagem, status, data_viagem, horario_inicio, horario_fim, distancia_total, tempo_total, observacoes, criado_em)
    VALUES (motorista_basic, rota_basic_manha, 'ida', 'concluida', CURRENT_DATE - INTERVAL '1 day', NOW() - INTERVAL '25 hours', NOW() - INTERVAL '24 hours 10 minutes', 18.4, 70, 'Turno da manha concluido com sucesso', NOW())
    RETURNING id INTO viagem_basic;

    INSERT INTO viagens (motorista_id, rota_id, tipo_viagem, status, data_viagem, horario_inicio, horario_fim, distancia_total, tempo_total, observacoes, criado_em)
    VALUES (motorista_premium, rota_premium_tarde, 'volta', 'concluida', CURRENT_DATE - INTERVAL '2 day', NOW() - INTERVAL '44 hours', NOW() - INTERVAL '43 hours 5 minutes', 21.0, 65, 'Viagem vespertina sem atrasos', NOW())
    RETURNING id INTO viagem_premium;

    INSERT INTO criancas_viagens (viagem_id, crianca_id, embarcada, horario_embarque, horario_desembarque, status_embarque, status_desembarque, observacoes, criado_em)
    VALUES (viagem_basic, crianca_sofia, true, NOW() - INTERVAL '25 hours' + INTERVAL '20 minutes', NOW() - INTERVAL '24 hours' + INTERVAL '10 minutes', 'confirmado', 'entregue', 'Sinalizacao enviada aos responsaveis', NOW());

    INSERT INTO criancas_viagens (viagem_id, crianca_id, embarcada, horario_embarque, horario_desembarque, status_embarque, status_desembarque, observacoes, criado_em)
    VALUES (viagem_premium, crianca_pedro, true, NOW() - INTERVAL '44 hours' + INTERVAL '25 minutes', NOW() - INTERVAL '43 hours' + INTERVAL '5 minutes', 'confirmado', 'entregue', 'Checklist premium usado', NOW());

    INSERT INTO localizacoes (viagem_id, motorista_id, rota_id, latitude, longitude, velocidade, direcao, timestamp)
    VALUES (viagem_basic, motorista_basic, rota_basic_manha, -23.5580, -46.6600, 38.5, 180, NOW() - INTERVAL '25 hours');

    INSERT INTO localizacoes (viagem_id, motorista_id, rota_id, latitude, longitude, velocidade, direcao, timestamp)
    VALUES (viagem_premium, motorista_premium, rota_premium_tarde, -23.5640, -46.6530, 32.0, 200, NOW() - INTERVAL '44 hours');

    -- Excursões
    INSERT INTO pacotes_excursao (usuario_id, nome_pacote, descricao, destino, data_excursao, horario_saida, horario_retorno, ponto_encontro, valor_por_pessoa, preco_por_pessoa, vagas_disponiveis, inclui_alimentacao, inclui_hospedagem, ativo, latitude_partida, longitude_partida, endereco_partida, latitude_destino, longitude_destino, endereco_destino, criado_em)
    VALUES (motorista_excursao, 'Brotas Aventura', 'Day-use com rafting e tirolesa', 'Brotas - SP', CURRENT_DATE + INTERVAL '14 day', '07:00', '20:00', 'Terminal Barra Funda - Plataforma 3', 350.00, 420.00, 28, true, false, true, -23.5250, -46.6690, 'Terminal Barra Funda, Sao Paulo', -22.2850, -48.1260, 'Centro de Brotas', NOW())
    RETURNING id INTO pacote_excursao_um;

    INSERT INTO pacotes_excursao (usuario_id, nome_pacote, descricao, destino, data_excursao, horario_saida, horario_retorno, ponto_encontro, valor_por_pessoa, preco_por_pessoa, vagas_disponiveis, inclui_alimentacao, inclui_hospedagem, ativo, latitude_partida, longitude_partida, endereco_partida, latitude_destino, longitude_destino, endereco_destino, criado_em)
    VALUES (motorista_hibrido, 'Campos do Jordao Premium', 'Passeio bate-volta com duas paradas', 'Campos do Jordao - SP', CURRENT_DATE + INTERVAL '21 day', '06:30', '21:30', 'Shopping Eldorado - Portaria A', 420.00, 490.00, 32, true, true, true, -23.5710, -46.6980, 'Shopping Eldorado, Sao Paulo', -22.7330, -45.5910, 'Capivari, Campos do Jordao', NOW())
    RETURNING id INTO pacote_excursao_dois;

    INSERT INTO inscricoes_excursao (pacote_id, usuario_id, status_inscricao, observacoes, data_inscricao)
    VALUES (pacote_excursao_um, resp_ana, 'confirmada', 'Pago via seed', NOW()),
           (pacote_excursao_um, resp_bruno, 'pendente', 'Aguardando comprovante', NOW()),
           (pacote_excursao_dois, resp_carla, 'confirmada', 'Reserva antecipada', NOW());

    RAISE NOTICE 'Perfis de teste criados com sucesso.';
    RAISE NOTICE 'Logins (senha: teste123):';
    RAISE NOTICE ' - Motorista escolar basic: basic@motorista.com';
    RAISE NOTICE ' - Motorista escolar premium: premium@motorista.com';
    RAISE NOTICE ' - Motorista excursao: excursao@motorista.com';
    RAISE NOTICE ' - Motorista hibrido: hibrido@motorista.com';
    RAISE NOTICE ' - Responsavel 1: pai1@email.com';
    RAISE NOTICE ' - Responsavel 2: pai2@email.com';
    RAISE NOTICE ' - Responsavel 3: pai3@email.com';
    RAISE NOTICE ' - Admin: admin@kanghoo.test';
END $$;
