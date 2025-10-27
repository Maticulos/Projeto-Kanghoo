const db = require('../config/db');

async function verificarAssinaturas() {
    try {
        console.log('=== ESTRUTURA DA TABELA ASSINATURAS ===');
        
        // Verificar se a tabela existe
        const tabelaExiste = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'assinaturas'
            );
        `);
        
        if (!tabelaExiste.rows[0].exists) {
            console.log('❌ Tabela assinaturas não existe!');
            return;
        }
        
        console.log('✅ Tabela assinaturas existe');
        
        // Verificar estrutura da tabela
        const estrutura = await db.query(`
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'assinaturas' 
            ORDER BY ordinal_position;
        `);
        
        console.log('\n📋 Colunas da tabela assinaturas:');
        estrutura.rows.forEach((col, index) => {
            console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - NULL: ${col.is_nullable} - Default: ${col.column_default || 'N/A'}`);
        });
        
        // Contar registros
        const count = await db.query('SELECT COUNT(*) FROM assinaturas');
        console.log(`\n📊 Total de assinaturas: ${count.rows[0].count}`);
        
        // Mostrar exemplos se existirem
        if (parseInt(count.rows[0].count) > 0) {
            const exemplos = await db.query('SELECT * FROM assinaturas LIMIT 2');
            console.log('\n📝 Exemplos de registros:');
            exemplos.rows.forEach((row, index) => {
                console.log(`\nRegistro ${index + 1}:`);
                Object.keys(row).forEach(key => {
                    console.log(`  ${key}: ${row[key]}`);
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar tabela assinaturas:', error);
    } finally {
        await db.end();
    }
}

verificarAssinaturas();