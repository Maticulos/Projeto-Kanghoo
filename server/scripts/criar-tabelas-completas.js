const db = require('../config/db');

async function criarTabelasCompletas() {
    try {
        console.log('🔧 Criando/verificando todas as tabelas necessárias...\n');
        
        // Tabela para check-ins (que estava faltando)
        const criarTabelaCheckinsQuery = `
            CREATE TABLE IF NOT EXISTS checkins (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                rota_id INTEGER,
                tipo VARCHAR(50) NOT NULL, -- 'inicio', 'fim', 'parada'
                localizacao JSONB,
                observacoes TEXT,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        // Executar criação das tabelas
        await db.query(criarTabelaCheckinsQuery);
        console.log('✅ Tabela checkins criada/verificada');
        
        // Verificar se a tabela rotas tem a coluna usuario_id
        try {
            await db.query(`
                SELECT usuario_id FROM rotas LIMIT 1
            `);
            console.log('✅ Coluna usuario_id já existe na tabela rotas');
        } catch (error) {
            if (error.message.includes('não existe')) {
                console.log('⚠️  Adicionando coluna usuario_id na tabela rotas...');
                await db.query(`
                    ALTER TABLE rotas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
                `);
                console.log('✅ Coluna usuario_id adicionada na tabela rotas');
            }
        }
        
        // Executar a criação de todas as outras tabelas
        await db.criarTabelas();
        
        // Verificar todas as tabelas
        console.log('\n📋 Verificando estrutura final das tabelas:');
        const tabelas = [
            'usuarios', 'veiculos', 'empresas', 'contatos', 
            'criancas', 'rotas', 'pontos_parada', 
            'historico_transportes', 'rastreamento', 'checkins'
        ];
        
        for (const tabela of tabelas) {
            try {
                const resultado = await db.query(`SELECT COUNT(*) FROM ${tabela}`);
                console.log(`✅ ${tabela}: ${resultado.rows[0].count} registros`);
            } catch (error) {
                console.log(`❌ ${tabela}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Todas as tabelas foram criadas/verificadas com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        process.exit(0);
    }
}

criarTabelasCompletas();