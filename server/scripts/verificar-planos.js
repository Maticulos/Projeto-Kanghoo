const { Pool } = require('pg');

const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
});

async function verificarPlanos() {
    try {
        console.log('=== VERIFICANDO TABELA PLANOS_ASSINATURA ===');
        
        // Verificar se a tabela existe
        const tabelaExiste = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'planos_assinatura'
            );
        `);
        
        console.log('Tabela planos_assinatura existe:', tabelaExiste.rows[0].exists);
        
        if (tabelaExiste.rows[0].exists) {
            // Verificar estrutura da tabela
            const estrutura = await db.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'planos_assinatura'
                ORDER BY ordinal_position;
            `);
            
            console.log('\n=== ESTRUTURA DA TABELA ===');
            estrutura.rows.forEach(col => {
                console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
            });
            
            // Contar registros
            const count = await db.query('SELECT COUNT(*) FROM planos_assinatura');
            console.log(`\nTotal de registros: ${count.rows[0].count}`);
            
            // Mostrar alguns exemplos
            const exemplos = await db.query('SELECT * FROM planos_assinatura LIMIT 3');
            console.log('\n=== EXEMPLOS DE DADOS ===');
            exemplos.rows.forEach((row, index) => {
                console.log(`Registro ${index + 1}:`, row);
            });
        }
        
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await db.end();
    }
}

verificarPlanos();