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

async function verificarUsuarios() {
    try {
        console.log('=== ESTRUTURA DA TABELA USUARIOS ===');
        
        // Verificar se a tabela existe
        const tabelaExiste = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'usuarios'
            )
        `);
        
        if (!tabelaExiste.rows[0].exists) {
            console.log('❌ Tabela usuarios não existe!');
            return;
        }
        
        console.log('✅ Tabela usuarios existe');
        
        // Listar todas as colunas
        const colunas = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'usuarios'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Colunas da tabela usuarios:');
        colunas.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
        
        // Contar registros
        const count = await db.query('SELECT COUNT(*) FROM usuarios');
        console.log(`\n📊 Total de usuários: ${count.rows[0].count}`);
        
        // Mostrar alguns exemplos
        if (count.rows[0].count > 0) {
            const exemplos = await db.query('SELECT * FROM usuarios LIMIT 2');
            console.log('\n📝 Exemplos de dados:');
            exemplos.rows.forEach((row, index) => {
                console.log(`\nUsuário ${index + 1}:`);
                Object.keys(row).forEach(key => {
                    console.log(`  ${key}: ${row[key]}`);
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar tabela usuarios:', error);
    } finally {
        await db.end();
    }
}

verificarUsuarios();