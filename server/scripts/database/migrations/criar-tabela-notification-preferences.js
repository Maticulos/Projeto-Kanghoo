const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kanghoo_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function criarTabelaNotificationPreferences() {
    try {
        console.log('🔄 Iniciando criação da tabela notification_preferences...');
        
        // Ler o arquivo SQL
        const sqlPath = path.join(__dirname, 'criar-tabela-notification-preferences.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Executar o SQL
        await pool.query(sqlContent);
        
        console.log('✅ Tabela notification_preferences criada com sucesso!');
        
        // Verificar se a tabela foi criada
        const checkQuery = `
            SELECT 
                table_name,
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'notification_preferences'
            ORDER BY ordinal_position;
        `;
        
        const result = await pool.query(checkQuery);
        
        if (result.rows.length > 0) {
            console.log('\n📋 Estrutura da tabela criada:');
            console.table(result.rows);
        } else {
            console.log('⚠️  Tabela não encontrada após criação');
        }
        
    } catch (error) {
        console.error('❌ Erro ao criar tabela:', error.message);
        console.error('Detalhes:', error);
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    criarTabelaNotificationPreferences();
}

module.exports = { criarTabelaNotificationPreferences };