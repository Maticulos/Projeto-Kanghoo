const db = require('./config/db');

async function verificarEstruturaCriancas() {
    try {
        console.log('=== VERIFICANDO ESTRUTURA DA TABELA CRIANCAS ===');
        
        // Verificar estrutura da tabela
        const estruturaQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'criancas' 
            ORDER BY ordinal_position;
        `;
        
        const estruturaResult = await db.query(estruturaQuery);
        
        console.log('\nColunas da tabela criancas:');
        estruturaResult.rows.forEach((col, index) => {
            console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable} - Default: ${col.column_default || 'NULL'}`);
        });
        
        // Contar registros
        const countResult = await db.query('SELECT COUNT(*) as total FROM criancas');
        console.log(`\nTotal de crianças: ${countResult.rows[0].total}`);
        
        // Mostrar alguns registros de exemplo
        const exemploResult = await db.query('SELECT * FROM criancas LIMIT 2');
        console.log('\nExemplo de registros:');
        console.log(JSON.stringify(exemploResult.rows, null, 2));
        
    } catch (error) {
        console.error('Erro ao verificar estrutura:', error);
    } finally {
        process.exit(0);
    }
}

verificarEstruturaCriancas();