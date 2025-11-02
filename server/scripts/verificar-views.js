require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'kanghoo_db_prod',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false
});

async function verificarViews() {
    try {
        console.log('=== VERIFICAÇÃO DE VIEWS ===');
        
        // Verificar se a view vw_rotas_completas existe
        const viewExiste = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.views 
                WHERE table_name = 'vw_rotas_completas'
            )
        `);
        
        console.log(`✅ View vw_rotas_completas existe: ${viewExiste.rows[0].exists}`);
        
        if (!viewExiste.rows[0].exists) {
            console.log('❌ View vw_rotas_completas não existe! Isso explica o erro na posição 22.');
        }
        
        // Listar todas as views disponíveis
        const todasViews = await db.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('\n📋 Views disponíveis no banco:');
        if (todasViews.rows.length > 0) {
            todasViews.rows.forEach(row => {
                console.log(`- ${row.table_name}`);
            });
        } else {
            console.log('Nenhuma view encontrada.');
        }
        
        // Verificar se há alguma view relacionada a rotas
        const viewsRotas = await db.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_name LIKE '%rota%'
            ORDER BY table_name
        `);
        
        console.log('\n📋 Views relacionadas a rotas:');
        if (viewsRotas.rows.length > 0) {
            viewsRotas.rows.forEach(row => {
                console.log(`- ${row.table_name}`);
            });
        } else {
            console.log('Nenhuma view relacionada a rotas encontrada.');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar views:', error.message);
    } finally {
        await db.end();
    }
}

verificarViews();