require('dotenv').config();
const { Pool } = require('pg');

// Configuração para conectar ao banco de dados
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'transporte_escolar_prod',
    user: 'postgres',
    password: 'postgres'
});

async function criarTabelasBasicas() {
    try {
        // 1. Tabela de usuários
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome_completo VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                tipo_cadastro VARCHAR(50) NOT NULL,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela usuarios criada/verificada');

        // 2. Tabela de rotas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rotas (
                id SERIAL PRIMARY KEY,
                motorista_id INTEGER REFERENCES usuarios(id),
                nome_rota VARCHAR(255) NOT NULL,
                origem VARCHAR(255),
                destino VARCHAR(255),
                horario_ida TIME,
                horario_volta TIME,
                ativa BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela rotas criada/verificada');

        // 3. Tabela de crianças
        await pool.query(`
            CREATE TABLE IF NOT EXISTS criancas (
                id SERIAL PRIMARY KEY,
                nome_completo VARCHAR(255) NOT NULL,
                email_responsavel VARCHAR(255) NOT NULL,
                idade VARCHAR(10),
                escola VARCHAR(255),
                endereco_embarque TEXT,
                endereco_desembarque TEXT,
                observacoes TEXT,
                ativa BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela criancas criada/verificada');

        // 4. Tabela de viagens
        await pool.query(`
            CREATE TABLE IF NOT EXISTS viagens (
                id SERIAL PRIMARY KEY,
                motorista_id INTEGER REFERENCES usuarios(id),
                rota_id INTEGER REFERENCES rotas(id),
                data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
                horario_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                horario_fim TIMESTAMP WITH TIME ZONE,
                tipo_viagem VARCHAR(50) DEFAULT 'ida',
                status VARCHAR(50) DEFAULT 'iniciada',
                distancia_total DECIMAL(8, 2),
                tempo_total INTEGER,
                observacoes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela viagens criada/verificada');

        // 5. Tabela de localizações
        await pool.query(`
            CREATE TABLE IF NOT EXISTS localizacoes (
                id SERIAL PRIMARY KEY,
                viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                altitude DECIMAL(8, 2),
                velocidade DECIMAL(5, 2),
                direcao INTEGER,
                precisao DECIMAL(5, 2),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                endereco TEXT,
                tipo_ponto VARCHAR(50) DEFAULT 'tracking',
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela localizacoes criada/verificada');

        // 6. Tabela de crianças em viagens
        await pool.query(`
            CREATE TABLE IF NOT EXISTS criancas_viagens (
                id SERIAL PRIMARY KEY,
                viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
                crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
                horario_embarque TIMESTAMP WITH TIME ZONE,
                horario_desembarque TIMESTAMP WITH TIME ZONE,
                status VARCHAR(50) DEFAULT 'aguardando',
                observacoes TEXT,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela criancas_viagens criada/verificada');

        console.log('\n✨ Todas as tabelas foram criadas/verificadas com sucesso!');
    } catch (error) {
        console.error('Erro ao criar tabelas:', error);
    } finally {
        await pool.end();
    }
}

criarTabelasBasicas();