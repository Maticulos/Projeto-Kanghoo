const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'kanghoo_db',
    password: 'postgres',
    port: 5432
});

async function atualizarTabelaCriancas() {
    try {
        console.log('🔧 Atualizando estrutura da tabela criancas...');
        
        // Remover tabela existente
        await pool.query('DROP TABLE IF EXISTS criancas CASCADE');
        
        // Criar tabela com estrutura completa
        const criarTabelaQuery = `
            CREATE TABLE criancas (
                id SERIAL PRIMARY KEY,
                nome_completo VARCHAR(255) NOT NULL,
                data_nascimento DATE NOT NULL,
                cpf VARCHAR(14) UNIQUE,
                idade INTEGER,
                endereco_residencial TEXT NOT NULL,
                escola VARCHAR(255) NOT NULL,
                endereco_escola TEXT NOT NULL,
                nome_responsavel VARCHAR(255),
                telefone_responsavel VARCHAR(20),
                telefone_responsavel_secundario VARCHAR(20),
                email_responsavel VARCHAR(255),
                foto_url TEXT,
                observacoes_medicas TEXT,
                contato_emergencia_nome VARCHAR(255),
                contato_emergencia_telefone VARCHAR(20),
                senha_responsavel VARCHAR(255),
                responsavel_id INTEGER REFERENCES usuarios(id),
                motorista_id INTEGER REFERENCES usuarios(id),
                rota_id INTEGER REFERENCES rotas(id),
                ativo BOOLEAN DEFAULT true,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.query(criarTabelaQuery);
        console.log('✅ Tabela criancas atualizada com sucesso!');
        
        // Verificar estrutura
        const resultado = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'criancas' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Estrutura da tabela criancas:');
        resultado.rows.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type}) - NULL: ${col.is_nullable}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao atualizar tabela:', error.message);
        process.exit(1);
    }
}

atualizarTabelaCriancas();