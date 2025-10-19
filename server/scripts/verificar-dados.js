require('dotenv').config();
const db = require('../config/db');

async function verificarDados() {
    try {
        console.log('🔍 Verificando dados no banco...\n');

        // Verificar usuários motoristas
        console.log('👨‍🚗 Usuários motoristas:');
        const motoristas = await db.query(
            "SELECT id, nome_completo, email, tipo_cadastro FROM usuarios WHERE tipo_cadastro = 'motorista_escolar'"
        );
        console.log(motoristas.rows);

        // Verificar todas as rotas
        console.log('\n🛣️ Rotas:');
        const rotas = await db.query('SELECT id, nome_rota, motorista_id FROM rotas');
        console.log(rotas.rows);

        // Verificar crianças
        console.log('\n👶 Crianças:');
        const criancas = await db.query('SELECT id, nome_completo, cpf, responsavel_id FROM criancas LIMIT 5');
        console.log(criancas.rows);

        // Verificar registros de rastreamento
        console.log('\n📍 Registros de rastreamento:');
        const rastreamento = await db.query('SELECT id, motorista_id, latitude, longitude, timestamp_localizacao FROM rastreamento LIMIT 5');
        console.log(rastreamento.rows);

        console.log('\n✅ Verificação concluída!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        process.exit(0);
    }
}

verificarDados();