-- Script para criar/atualizar usuário do banco de dados
DO $$
BEGIN
    -- Tenta criar o usuário se não existir
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'transporte_user') THEN
        CREATE USER transporte_user WITH PASSWORD 'postgres';
    ELSE
        -- Se o usuário já existe, atualiza a senha
        ALTER USER transporte_user WITH PASSWORD 'postgres';
    END IF;

    -- Garante que o usuário tem as permissões necessárias
    GRANT CONNECT ON DATABASE kanghoo_db_prod TO transporte_user;
    GRANT USAGE ON SCHEMA public TO transporte_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO transporte_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO transporte_user;
END
$$;