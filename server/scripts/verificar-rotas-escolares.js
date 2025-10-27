require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'kanghoo_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false
});

async function verificarRotasEscolares() {
    try {
        console.log('=== VERIFICAÇÃO DA TABELA ROTAS_ESCOLARES ===');
        
        // Verificar se a tabela existe
        const tabelaExiste = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'rotas_escolares'
            )
        `);
        
        console.log(`✅ Tabela rotas_escolares existe: ${tabelaExiste.rows[0].exists}`);
        
        if (!tabelaExiste.rows[0].exists) {
            console.log('❌ Tabela rotas_escolares não existe! Isso explica o erro.');
            
            // Listar todas as tabelas que contêm "rota" no nome
            const tabelasRota = await db.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name LIKE '%rota%'
                ORDER BY table_name
            `);
            
            console.log('\n📋 Tabelas que contêm "rota" no nome:');
            if (tabelasRota.rows.length > 0) {
                tabelasRota.rows.forEach(row => {
                    console.log(`- ${row.table_name}`);
                });
            } else {
                console.log('Nenhuma tabela encontrada com "rota" no nome.');
            }
            
            return;
        }
        
        // Se a tabela existe, mostrar sua estrutura
        const colunas = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'rotas_escolares'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Colunas da tabela rotas_escolares:');
        colunas.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
        
        // Contar registros
        const count = await db.query('SELECT COUNT(*) FROM rotas_escolares');
        console.log(`\n📊 Total de rotas: ${count.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erro ao verificar tabela rotas_escolares:', error.message);
    } finally {
        await db.end();
    }
}

verificarRotasEscolares();