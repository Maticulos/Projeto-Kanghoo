const db = require('./config/db');

async function testarPreferencias() {
    try {
        const userId = 999; // ID do usuário de teste
        
        console.log('1. Verificando preferências existentes...');
        const existing = await db.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
        console.log('Preferências existentes:', existing.rows.length);
        
        if (existing.rows.length > 0) {
            console.log('Dados existentes:', existing.rows[0]);
            
            console.log('\n2. Testando atualização...');
            const updateQuery = `
                UPDATE notification_preferences 
                SET embarque_desembarque = $2, canais = $3, updated_at = NOW()
                WHERE user_id = $1
                RETURNING *
            `;
            
            const updateResult = await db.query(updateQuery, [userId, false, JSON.stringify(['email', 'app'])]);
            console.log('Resultado da atualização:', updateResult.rows[0]);
        } else {
            console.log('\n2. Criando preferências padrão...');
            const insertQuery = `
                INSERT INTO notification_preferences 
                (user_id, embarque_desembarque, localizacao_tempo_real, veiculo_chegando, emergencia, atraso_detectado, canais)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            
            const insertResult = await db.query(insertQuery, [
                userId, true, true, true, true, true, JSON.stringify(['app'])
            ]);
            console.log('Preferências criadas:', insertResult.rows[0]);
        }
        
    } catch (error) {
        console.error('Erro ao testar preferências:', error);
    } finally {
        process.exit();
    }
}

testarPreferencias();