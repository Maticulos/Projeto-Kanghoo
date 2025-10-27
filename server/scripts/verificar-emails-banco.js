const db = require('../config/db');

async function verificarEmails() {
    try {
        console.log('🔍 VERIFICANDO EMAILS NO BANCO\n');
        
        // Buscar todos os emails que contêm "teste.kanghoo.com"
        const result = await db.query(`
            SELECT id, email, nome_completo, tipo_cadastro, LENGTH(email) as email_length
            FROM usuarios 
            WHERE email LIKE '%teste.kanghoo.com%' 
            ORDER BY email
        `);
        
        console.log(`Total de usuários de teste encontrados: ${result.rows.length}\n`);
        
        for (const usuario of result.rows) {
            console.log(`ID: ${usuario.id}`);
            console.log(`Email: "${usuario.email}"`);
            console.log(`Nome: ${usuario.nome_completo}`);
            console.log(`Tipo: ${usuario.tipo_cadastro}`);
            console.log(`Tamanho do email: ${usuario.email_length}`);
            
            // Verificar caracteres especiais
            const emailBytes = Buffer.from(usuario.email, 'utf8');
            console.log(`Bytes do email: ${emailBytes.toString('hex')}`);
            
            // Testar busca exata
            const testResult = await db.query('SELECT COUNT(*) FROM usuarios WHERE email = $1', [usuario.email]);
            console.log(`Busca exata funciona: ${testResult.rows[0].count > 0 ? '✅' : '❌'}`);
            
            console.log('---');
        }
        
        // Testar busca específica do email problemático
        console.log('\n🧪 TESTANDO BUSCA ESPECÍFICA\n');
        
        const emailTeste = 'joao.motorista.basic@teste.kanghoo.com';
        console.log(`Buscando por: "${emailTeste}"`);
        
        const buscaExata = await db.query('SELECT * FROM usuarios WHERE email = $1', [emailTeste]);
        console.log(`Resultado busca exata: ${buscaExata.rows.length} usuários`);
        
        const buscaLike = await db.query('SELECT * FROM usuarios WHERE email LIKE $1', [`%${emailTeste}%`]);
        console.log(`Resultado busca LIKE: ${buscaLike.rows.length} usuários`);
        
        const buscaIlike = await db.query('SELECT * FROM usuarios WHERE email ILIKE $1', [emailTeste]);
        console.log(`Resultado busca ILIKE: ${buscaIlike.rows.length} usuários`);
        
        // Buscar emails similares
        const buscaSimilar = await db.query(`
            SELECT email, similarity(email, $1) as sim 
            FROM usuarios 
            WHERE email LIKE '%joao%' OR email LIKE '%motorista%' OR email LIKE '%basic%'
            ORDER BY sim DESC
        `, [emailTeste]);
        
        console.log('\nEmails similares encontrados:');
        for (const row of buscaSimilar.rows) {
            console.log(`"${row.email}" (similaridade: ${row.sim || 'N/A'})`);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
    
    process.exit(0);
}

verificarEmails();