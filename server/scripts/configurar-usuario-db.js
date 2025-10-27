const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuração para conectar como superusuário postgres
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres', // Conecta ao banco postgres para ter privilégios de superusuário
    user: 'postgres',     // Usa o usuário postgres
    password: 'postgres'  // Senha padrão do postgres
});

async function configurarBancoDados() {
    try {
        // Primeiro, criar o banco de dados se não existir
        const checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = 'transporte_escolar_prod'";
        const dbExists = await pool.query(checkDbQuery);
        
        if (dbExists.rows.length === 0) {
            console.log('Criando banco de dados transporte_escolar_prod...');
            await pool.query('CREATE DATABASE transporte_escolar_prod');
        }

        // Configurar o usuário
        console.log('Configurando usuário transporte_user...');
        await pool.query(`
            DO $$
            BEGIN
                -- Criar usuário se não existir
                IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'transporte_user') THEN
                    CREATE USER transporte_user WITH PASSWORD 'SENHA_FORTE_AQUI';
                ELSE
                    -- Se o usuário já existe, atualiza a senha
                    ALTER USER transporte_user WITH PASSWORD 'SENHA_FORTE_AQUI';
                END IF;
            END
            $$;
        `);

        // Conectar ao banco transporte_escolar_prod para conceder permissões
        const dbPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: 'transporte_escolar_prod',
            user: 'postgres',
            password: 'postgres'
        });

        // Conceder permissões
        console.log('Concedendo permissões...');
        await dbPool.query(`
            GRANT CONNECT ON DATABASE transporte_escolar_prod TO transporte_user;
            GRANT USAGE ON SCHEMA public TO transporte_user;
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO transporte_user;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO transporte_user;
        `);

        console.log('Banco de dados e usuário configurados com sucesso!');
        
        // Fechar conexões
        await dbPool.end();
        await pool.end();
    } catch (error) {
        console.error('Erro ao configurar banco de dados:', error);
    }
}

configurarBancoDados();