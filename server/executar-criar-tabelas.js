const db = require('./db');

async function executarCriarTabelas() {
    try {
        console.log('🔧 Executando criação de tabelas...');
        await db.criarTabelas();
        console.log('✅ Todas as tabelas foram criadas com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error.message);
        process.exit(1);
    }
}

executarCriarTabelas();