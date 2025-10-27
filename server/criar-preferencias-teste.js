const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kanghoo_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function criarPreferencias() {
    try {
        // Primeiro, verificar se já existe
        const existeQuery = 'SELECT * FROM notification_preferences WHERE user_id = 1';
        const existeResult = await pool.query(existeQuery);
        
        if (existeResult.rows.length > 0) {
            console.log('✅ Preferências já existem para o usuário 1:');
            console.log(existeResult.rows[0]);
        } else {
            // Inserir novas preferências
            const insertQuery = `
                INSERT INTO notification_preferences 
                (user_id, embarque_desembarque, localizacao_tempo_real, veiculo_chegando, emergencia, atraso_detectado, canais) 
                VALUES (1, true, true, true, true, true, '["app"]') 
                RETURNING *
            `;
            
            const insertResult = await pool.query(insertQuery);
            console.log('✅ Preferências criadas para o usuário 1:');
            console.log(insertResult.rows[0]);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

criarPreferencias();