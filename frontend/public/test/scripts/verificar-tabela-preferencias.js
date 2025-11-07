const db = require('./config/db');

async function verificarTabela() {
    try {
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'notification_preferences'
        `);
        
        console.log('Tabela notification_preferences existe:', result.rows.length > 0 ? 'SIM' : 'NÃO');
        
        if (result.rows.length > 0) {
            // Verificar estrutura da tabela
            const columns = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'notification_preferences'
                ORDER BY ordinal_position
            `);
            
            console.log('\nColunas da tabela:');
            columns.rows.forEach(col => {
                console.log(`- ${col.column_name}: ${col.data_type}`);
            });
        }
        
    } catch (error) {
        console.error('Erro ao verificar tabela:', error.message);
    } finally {
        process.exit();
    }
}

verificarTabela();