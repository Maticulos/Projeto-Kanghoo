-- Script para criar/atualizar usuário do banco de dados
DO $$
BEGIN
    -- Tenta criar o usuário se não existir
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'transporte_user') THEN
        CREATE USER transporte_user WITH PASSWORD 'SENHA_FORTE_AQUI';
    ELSE
        -- Se o usuário já existe, atualiza a senha
        ALTER USER transporte_user WITH PASSWORD 'SENHA_FORTE_AQUI';
    END IF;

    -- Garante que o usuário tem as permissões necessárias
    GRANT CONNECT ON DATABASE transporte_escolar_prod TO transporte_user;
    GRANT USAGE ON SCHEMA public TO transporte_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO transporte_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO transporte_user;
END
$$;