-- ===========================================
-- CONFIGURAÇÃO DO POSTGRESQL PARA PRODUÇÃO
-- ===========================================

-- Criar banco de dados de produção
CREATE DATABASE transporte_escolar_prod
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'pt_BR.UTF-8'
    LC_CTYPE = 'pt_BR.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Conectar ao banco de produção
\c transporte_escolar_prod;

-- Criar usuário dedicado para a aplicação
CREATE USER transporte_user WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    INHERIT
    NOREPLICATION
    CONNECTION LIMIT -1
    PASSWORD 'SENHA_FORTE_AQUI';

-- Conceder permissões necessárias
GRANT CONNECT ON DATABASE transporte_escolar_prod TO transporte_user;
GRANT USAGE ON SCHEMA public TO transporte_user;
GRANT CREATE ON SCHEMA public TO transporte_user;

-- Configurações de segurança
ALTER DATABASE transporte_escolar_prod SET log_statement = 'mod';
ALTER DATABASE transporte_escolar_prod SET log_min_duration_statement = 1000;

-- Configurações de performance para produção
ALTER DATABASE transporte_escolar_prod SET shared_preload_libraries = 'pg_stat_statements';
ALTER DATABASE transporte_escolar_prod SET max_connections = 100;
ALTER DATABASE transporte_escolar_prod SET work_mem = '4MB';
ALTER DATABASE transporte_escolar_prod SET maintenance_work_mem = '64MB';
ALTER DATABASE transporte_escolar_prod SET effective_cache_size = '1GB';

-- Configurar backup automático
-- (Executar como superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('backup-transporte', '0 2 * * *', 'pg_dump transporte_escolar_prod > /backup/transporte_$(date +\%Y\%m\%d).sql');

COMMENT ON DATABASE transporte_escolar_prod IS 'Banco de dados de produção do sistema de transporte escolar';
COMMENT ON ROLE transporte_user IS 'Usuário dedicado para a aplicação de transporte escolar';