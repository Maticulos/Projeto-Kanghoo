require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'kanghoo_db_prod',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function initDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Inicializando banco de dados...\n');
        
        // Criar tabela de usuários
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                tipo_usuario VARCHAR(50) NOT NULL,
                telefone VARCHAR(20),
                cpf VARCHAR(14),
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela usuarios criada');

        // Criar tabela de rotas
        await client.query(`
            CREATE TABLE IF NOT EXISTS rotas (
                id SERIAL PRIMARY KEY,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                tipo VARCHAR(50) DEFAULT 'escolar',
                ativa BOOLEAN DEFAULT true,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela rotas criada');

        // Criar tabela de viagens
        await client.query(`
            CREATE TABLE IF NOT EXISTS viagens (
                id SERIAL PRIMARY KEY,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                rota_id INTEGER REFERENCES rotas(id) ON DELETE CASCADE,
                data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
                horario_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                horario_fim TIMESTAMP,
                tipo_viagem VARCHAR(50) DEFAULT 'ida',
                status VARCHAR(50) DEFAULT 'iniciada',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela viagens criada');

        // Criar tabela de localizações
        await client.query(`
            CREATE TABLE IF NOT EXISTS localizacoes (
                id SERIAL PRIMARY KEY,
                viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                velocidade DECIMAL(5, 2),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela localizacoes criada');

        console.log('\n✅ Banco de dados inicializado com sucesso!\n');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    initDatabase().then(() => {
        console.log('Concluído!');
        process.exit(0);
    }).catch(err => {
        console.error('Erro fatal:', err);
        process.exit(1);
    });
}

module.exports = initDatabase;
