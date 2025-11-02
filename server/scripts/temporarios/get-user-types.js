const db = require('../../config/db');

async function getDistinctUserTypes() {
    try {
        const result = await db.query('SELECT DISTINCT tipo_cadastro FROM usuarios');
        console.log('Tipos de cadastro de usuário existentes:', result.rows.map(row => row.tipo_cadastro));
    } catch (error) {
        console.error('Erro ao buscar tipos de cadastro de usuário:', error);
    } finally {
        // await db.end(); // Removido para corrigir TypeError: db.end is not a function
    }
}

getDistinctUserTypes();