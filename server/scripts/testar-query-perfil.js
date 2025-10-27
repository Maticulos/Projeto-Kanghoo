const { Pool } = require('pg');

const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
});

async function testarQuery() {
    try {
        console.log('=== TESTANDO QUERY DE PERFIL ===');
        
        // Testar a query exata que está falhando
        const query = `
            SELECT a.id, a.plano_id, a.status, a.data_inicio, a.data_vencimento,
                   p.tipo_plano, p.limite_rotas, p.limite_usuarios
            FROM assinaturas a
            LEFT JOIN planos_assinatura p ON a.plano_id = p.id
            WHERE a.usuario_id = $1 AND a.status = 'ativa'
        `;
        
        console.log('Query a ser testada:');
        console.log(query);
        
        // Testar com um usuário que sabemos que existe
        const result = await db.query(query, [125]);
        
        console.log('\n=== RESULTADO ===');
        console.log('Registros encontrados:', result.rows.length);
        result.rows.forEach((row, index) => {
            console.log(`Registro ${index + 1}:`, row);
        });
        
    } catch (error) {
        console.error('Erro na query:', error);
        console.error('Código do erro:', error.code);
        console.error('Posição do erro:', error.position);
        console.error('Mensagem:', error.message);
    } finally {
        await db.end();
    }
}

testarQuery();