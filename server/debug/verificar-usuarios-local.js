const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');

// Configuração local do banco
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD),
    port: process.env.DB_PORT,
});

async function verificarUsuarios() {
    try {
        console.log('🔍 Verificando estrutura da tabela usuarios...\n');
        
        // Verificar estrutura da tabela
        const colunas = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'usuarios'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Colunas da tabela usuarios:');
        colunas.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Contar usuários
        const count = await pool.query('SELECT COUNT(*) FROM usuarios');
        console.log(`\n📊 Total de usuários: ${count.rows[0].count}`);
        
        // Mostrar usuários se existirem
        if (count.rows[0].count > 0) {
            const usuarios = await pool.query('SELECT * FROM usuarios LIMIT 5');
            console.log('\n📝 Usuários encontrados:');
            usuarios.rows.forEach((usuario, index) => {
                console.log(`\nUsuário ${index + 1}:`);
                Object.keys(usuario).forEach(key => {
                    console.log(`  ${key}: ${usuario[key]}`);
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarUsuarios();