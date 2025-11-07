const db = require('./config/db');
const bcrypt = require('bcrypt');

async function fixResponsavelPasswords() {
    try {
        console.log('🔧 Definindo senhas para responsáveis...\n');
        
        // Buscar responsáveis sem senha
        const responsaveis = await db.query(`
            SELECT id, nome_responsavel, email_responsavel, nome_completo
            FROM criancas 
            WHERE ativo = true AND (senha_responsavel IS NULL OR senha_responsavel = '')
            ORDER BY id
        `);
        
        if (responsaveis.rows.length === 0) {
            console.log('✅ Todos os responsáveis já têm senhas definidas!');
            return;
        }
        
        console.log(`📋 Encontrados ${responsaveis.rows.length} responsáveis sem senha:`);
        
        const senhaDefault = 'teste123';
        const senhaHash = await bcrypt.hash(senhaDefault, 10);
        
        for (const resp of responsaveis.rows) {
            console.log(`🔐 Definindo senha para: ${resp.nome_responsavel} (${resp.email_responsavel})`);
            
            await db.query(`
                UPDATE criancas 
                SET senha_responsavel = $1, atualizado_em = NOW()
                WHERE id = $2
            `, [senhaHash, resp.id]);
            
            console.log(`   ✅ Senha definida para ${resp.nome_responsavel}`);
        }
        
        console.log(`\n🎉 Senhas definidas para ${responsaveis.rows.length} responsáveis!`);
        console.log(`📝 Senha padrão: ${senhaDefault}`);
        console.log('\n📋 Responsáveis atualizados:');
        
        responsaveis.rows.forEach(resp => {
            console.log(`   - ${resp.email_responsavel} (${resp.nome_responsavel}) - Senha: ${senhaDefault}`);
        });
        
    } catch (error) {
        console.error('❌ Erro ao definir senhas:', error.message);
    } finally {
        process.exit(0);
    }
}

fixResponsavelPasswords();