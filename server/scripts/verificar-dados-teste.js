const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'kanghoo_db_prod',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function verificarDadosTeste() {
    console.log('🔍 VERIFICANDO DADOS EXISTENTES PARA TESTES');
    console.log('');

    try {
        // 1. Verificar usuários
        console.log('=== USUÁRIOS ===');
        const usuarios = await pool.query('SELECT id, nome_completo, email FROM usuarios LIMIT 5');
        console.log(`Total de usuários: ${usuarios.rows.length}`);
        if (usuarios.rows.length > 0) {
            console.log('Primeiros usuários:');
            usuarios.rows.forEach((user, index) => {
                console.log(`  ${index + 1}. ID: ${user.id}, Nome: ${user.nome_completo}, Email: ${user.email}`);
            });
        }

        // 2. Verificar rotas escolares
        console.log('\n=== ROTAS ESCOLARES ===');
        const rotas = await pool.query('SELECT id, nome_rota, usuario_id, ativa FROM rotas_escolares LIMIT 5');
        console.log(`Total de rotas: ${rotas.rows.length}`);
        if (rotas.rows.length > 0) {
            console.log('Primeiras rotas:');
            rotas.rows.forEach((rota, index) => {
                console.log(`  ${index + 1}. ID: ${rota.id}, Nome: ${rota.nome_rota}, Usuario ID: ${rota.usuario_id}, Ativa: ${rota.ativa}`);
            });
        }

        // 3. Verificar views novamente
        console.log('\n=== VIEWS ===');
        const views = await pool.query(`
            SELECT viewname 
            FROM pg_views 
            WHERE schemaname = 'public'
            ORDER BY viewname
        `);
        console.log(`Total de views: ${views.rows.length}`);
        if (views.rows.length > 0) {
            console.log('Views disponíveis:');
            views.rows.forEach((view, index) => {
                console.log(`  ${index + 1}. ${view.viewname}`);
            });
        }

        // 4. Verificar especificamente a view vw_rotas_completas
        console.log('\n=== VERIFICAÇÃO ESPECÍFICA DA VIEW vw_rotas_completas ===');
        const viewEspecifica = await pool.query(`
            SELECT viewname 
            FROM pg_views 
            WHERE schemaname = 'public' 
            AND viewname = 'vw_rotas_completas'
        `);
        console.log(`View vw_rotas_completas existe: ${viewEspecifica.rows.length > 0}`);

        // 5. Verificar planos_assinatura
        console.log('\n=== PLANOS ASSINATURA ===');
        const planos = await pool.query('SELECT id, usuario_id, tipo_plano, ativo FROM planos_assinatura LIMIT 5');
        console.log(`Total de assinaturas: ${planos.rows.length}`);
        if (planos.rows.length > 0) {
            console.log('Primeiras assinaturas:');
            planos.rows.forEach((plano, index) => {
                console.log(`  ${index + 1}. ID: ${plano.id}, Usuario ID: ${plano.usuario_id}, Tipo: ${plano.tipo_plano}, Ativo: ${plano.ativo}`);
            });
        }

        // 6. Sugestões para os testes
        console.log('\n=== SUGESTÕES PARA TESTES ===');
        if (usuarios.rows.length > 0) {
            console.log(`✓ Use o ID do usuário ${usuarios.rows[0].id} para testar perfil`);
        } else {
            console.log('✗ Nenhum usuário encontrado - criar dados de teste');
        }

        if (rotas.rows.length > 0) {
            console.log(`✓ Use o ID da rota ${rotas.rows[0].id} para testar busca específica`);
        } else {
            console.log('✗ Nenhuma rota encontrada - criar dados de teste');
        }

    } catch (error) {
        console.error('Erro ao verificar dados:', error.message);
    } finally {
        await pool.end();
    }
}

// Executar verificação
verificarDadosTeste().catch(console.error);