const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'kanghoo_db_prod',
    password: 'postgres',
    port: 5432,
});

async function verificarEstrutura() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'planos_assinatura'
            ORDER BY ordinal_position
        `);
        
        console.log('Estrutura da tabela planos_assinatura:');
        result.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarEstrutura();