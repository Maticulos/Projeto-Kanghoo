const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function verificarPlanosAssinatura() {
    console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA planos_assinatura');
    console.log('');

    try {
        // 1. Verificar se a tabela existe
        const tabelaExiste = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'planos_assinatura'
            );
        `);

        if (!tabelaExiste.rows[0].exists) {
            console.log('❌ Tabela planos_assinatura não existe!');
            return;
        }

        console.log('✅ Tabela planos_assinatura existe');

        // 2. Listar todas as colunas
        const colunas = await pool.query(`
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'planos_assinatura' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 Colunas da tabela planos_assinatura:');
        colunas.rows.forEach((col, index) => {
            console.log(`${index + 1}. ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
        });

        // 3. Contar registros
        const contagem = await pool.query('SELECT COUNT(*) as total FROM planos_assinatura');
        console.log(`\n📊 Total de registros: ${contagem.rows[0].total}`);

        // 4. Mostrar alguns exemplos de dados (se existirem)
        if (parseInt(contagem.rows[0].total) > 0) {
            const exemplos = await pool.query('SELECT * FROM planos_assinatura LIMIT 3');
            console.log('\n📝 Exemplos de dados:');
            exemplos.rows.forEach((row, index) => {
                console.log(`${index + 1}. ID: ${row.id}, Usuario ID: ${row.usuario_id}, Status: ${row.status}`);
            });
        }

        // 5. Verificar se existe coluna plano_id ou similar
        const colunasNomes = colunas.rows.map(col => col.column_name);
        console.log('\n🔍 Análise de colunas relacionadas a plano:');
        const colunasPlano = colunasNomes.filter(nome => nome.toLowerCase().includes('plano'));
        if (colunasPlano.length > 0) {
            console.log('Colunas relacionadas a plano encontradas:', colunasPlano.join(', '));
        } else {
            console.log('Nenhuma coluna relacionada a plano encontrada');
        }

        // 6. Verificar tabela planos (se existir)
        const tabelaPlanosExiste = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'planos'
            );
        `);

        if (tabelaPlanosExiste.rows[0].exists) {
            console.log('\n✅ Tabela planos também existe');
            const colunasPlanos = await pool.query(`
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_name = 'planos' 
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            `);
            console.log('Colunas da tabela planos:', colunasPlanos.rows.map(col => col.column_name).join(', '));
        } else {
            console.log('\n❌ Tabela planos não existe');
        }

    } catch (error) {
        console.error('Erro ao verificar planos_assinatura:', error.message);
    } finally {
        await pool.end();
    }
}

// Executar verificação
verificarPlanosAssinatura().catch(console.error);