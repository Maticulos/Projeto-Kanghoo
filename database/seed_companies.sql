DO $$
DECLARE
    user_basic INTEGER;
    user_premium INTEGER;
    user_excursao INTEGER;
    user_hibrido INTEGER;
BEGIN
    -- Buscar IDs dos usuários pelo email
    SELECT id INTO user_basic FROM usuarios WHERE email = 'basic@motorista.com';
    SELECT id INTO user_premium FROM usuarios WHERE email = 'premium@motorista.com';
    SELECT id INTO user_excursao FROM usuarios WHERE email = 'excursao@motorista.com';
    SELECT id INTO user_hibrido FROM usuarios WHERE email = 'hibrido@motorista.com';

    -- Inserir empresas
    IF user_basic IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empresas WHERE usuario_id = user_basic) THEN
        INSERT INTO empresas (usuario_id, razao_social, nome_fantasia, cnpj, telefone, cep, rua, numero, complemento, bairro, cidade, estado)
        VALUES (user_basic, 'Carla Rocha Transportes ME', 'Tia Carla Escolar', '12.345.678/0001-90', '(48) 3333-1111', '88701-000', 'Rua Altamiro Guimaraes', '120', 'Sala 1', 'Centro', 'Tubarao', 'SC');
    END IF;

    IF user_premium IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empresas WHERE usuario_id = user_premium) THEN
        INSERT INTO empresas (usuario_id, razao_social, nome_fantasia, cnpj, telefone, cep, rua, numero, complemento, bairro, cidade, estado)
        VALUES (user_premium, 'Marina Prado Serviços LTDA', 'Marina Kids Transporte', '98.765.432/0001-10', '(48) 3333-2222', '88701-100', 'Av. Marcolino Martins Cabral', '1000', 'Sala 202', 'Centro', 'Tubarao', 'SC');
    END IF;

    IF user_excursao IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empresas WHERE usuario_id = user_excursao) THEN
        INSERT INTO empresas (usuario_id, razao_social, nome_fantasia, cnpj, telefone, cep, rua, numero, complemento, bairro, cidade, estado)
        VALUES (user_excursao, 'Rafael Turismo e Viagens SA', 'Rafa Tours', '45.678.901/0001-23', '(48) 3333-3333', '88702-200', 'Rua Sao Manoel', '500', 'Loja 3', 'Oficinas', 'Tubarao', 'SC');
    END IF;

    IF user_hibrido IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empresas WHERE usuario_id = user_hibrido) THEN
        INSERT INTO empresas (usuario_id, razao_social, nome_fantasia, cnpj, telefone, cep, rua, numero, complemento, bairro, cidade, estado)
        VALUES (user_hibrido, 'Lucas Brito Transportes EIRELI', 'Brito Leva e Traz', '56.789.012/0001-45', '(48) 3333-4444', '88704-400', 'Av. Pedro Zapelini', '1400', 'Galpao', 'Humaita', 'Tubarao', 'SC');
    END IF;

    RAISE NOTICE 'Dados de empresas inseridos com sucesso.';
END $$;
