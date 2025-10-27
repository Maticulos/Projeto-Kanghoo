const { Pool } = require('pg');

async function testarConfiguracoes() {
    const configuracoes = [
        {
            nome: 'Configuração 1: DATABASE_URL do .env',
            config: {
                connectionString: 'postgres://postgres:postgres@localhost:5432/kanghoo_db'
            }
        },
        {
            nome: 'Configuração 2: Credenciais separadas (postgres/postgres)',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'kanghoo_db',
                user: 'postgres',
                password: 'postgres'
            }
        },
        {
            nome: 'Configuração 3: Credenciais separadas (postgres/admin123)',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'kanghoo_db',
                user: 'postgres',
                password: 'admin123'
            }
        },
        {
            nome: 'Configuração 4: Banco alternativo (kanghoo)',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'kanghoo',
                user: 'postgres',
                password: 'postgres'
            }
        },
        {
            nome: 'Configuração 5: Banco alternativo (kanghoo) com admin123',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'kanghoo',
                user: 'postgres',
                password: 'admin123'
            }
        }
    ];
    
    const emailTeste = 'joao.motorista.basic@teste.kanghoo.com';
    
    for (const { nome, config } of configuracoes) {
        console.log(`\n🔍 ${nome}`);
        console.log('='.repeat(50));
        
        const pool = new Pool(config);
        
        try {
            const client = await pool.connect();
            
            // Testar conexão
            const totalResult = await client.query('SELECT COUNT(*) FROM usuarios');
            console.log(`✅ Conexão OK - Total de usuários: ${totalResult.rows[0].count}`);
            
            // Buscar usuário específico
            const userResult = await client.query('SELECT * FROM usuarios WHERE email = $1', [emailTeste]);
            console.log(`Usuário de teste encontrado: ${userResult.rows.length > 0 ? '✅ SIM' : '❌ NÃO'}`);
            
            if (userResult.rows.length > 0) {
                console.log(`🎯 ENCONTRADO! Email: "${userResult.rows[0].email}"`);
                console.log(`Nome: ${userResult.rows[0].nome_completo}`);
            }
            
            // Listar alguns emails de teste
            const testEmailsResult = await client.query(`
                SELECT email, nome_completo 
                FROM usuarios 
                WHERE email LIKE '%teste.kanghoo.com%' 
                LIMIT 3
            `);
            
            if (testEmailsResult.rows.length > 0) {
                console.log('Emails de teste encontrados:');
                testEmailsResult.rows.forEach(row => {
                    console.log(`  - ${row.email} (${row.nome_completo})`);
                });
            }
            
            client.release();
            
        } catch (error) {
            console.log(`❌ Erro: ${error.message}`);
        }
        
        await pool.end();
    }
    
    process.exit(0);
}

testarConfiguracoes();