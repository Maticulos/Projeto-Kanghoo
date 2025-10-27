const { Pool } = require('pg');

const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
});

async function listarTabelas() {
    try {
        console.log('=== LISTANDO TODAS AS TABELAS ===');
        
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('Tabelas encontradas:');
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.table_name}`);
        });
        
        // Procurar por tabelas relacionadas a assinatura
        console.log('\n=== TABELAS RELACIONADAS A ASSINATURA ===');
        const assinaturaTabelas = result.rows.filter(row => 
            row.table_name.includes('assinatura') || 
            row.table_name.includes('plano') ||
            row.table_name.includes('subscription')
        );
        
        assinaturaTabelas.forEach(row => {
            console.log(`- ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await db.end();
    }
}

listarTabelas();