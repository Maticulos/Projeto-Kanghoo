const db = require('../config/db');

async function verificarUsuarios() {
    try {
        console.log('🔍 Verificando usuários de teste...\n');
        
        const result = await db.query(`
            SELECT email, tipo_usuario, criado_em 
            FROM usuarios 
            WHERE email LIKE '%@teste.kanghoo.com' 
            ORDER BY email
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ Nenhum usuário de teste encontrado!');
            console.log('Execute o script criar-dados-teste-producao.js primeiro.');
        } else {
            console.log(`✅ Encontrados ${result.rows.length} usuários de teste:`);
            console.log('');
            
            result.rows.forEach((usuario, index) => {
                console.log(`${index + 1}. ${usuario.email}`);
                console.log(`   Tipo: ${usuario.tipo_usuario}`);
                console.log(`   Criado em: ${usuario.criado_em}`);
                console.log('');
            });
        }
        
        // Verificar também as crianças
        const criancasResult = await db.query(`
            SELECT c.nome, c.cpf, u.email as email_responsavel
            FROM criancas c
            JOIN usuarios u ON c.responsavel_id = u.id
            WHERE u.email LIKE '%@teste.kanghoo.com'
            ORDER BY c.nome
        `);
        
        if (criancasResult.rows.length > 0) {
            console.log(`👶 Encontradas ${criancasResult.rows.length} crianças de teste:`);
            criancasResult.rows.forEach((crianca, index) => {
                console.log(`${index + 1}. ${crianca.nome} (CPF: ${crianca.cpf})`);
                console.log(`   Responsável: ${crianca.email_responsavel}`);
                console.log('');
            });
        }
        
        // Verificar rotas
        const rotasResult = await db.query(`
            SELECT r.nome, r.descricao, u.email as email_motorista
            FROM rotas_escolares r
            JOIN usuarios u ON r.usuario_id = u.id
            WHERE u.email LIKE '%@teste.kanghoo.com'
            ORDER BY r.nome
        `);
        
        if (rotasResult.rows.length > 0) {
            console.log(`🚌 Encontradas ${rotasResult.rows.length} rotas de teste:`);
            rotasResult.rows.forEach((rota, index) => {
                console.log(`${index + 1}. ${rota.nome}`);
                console.log(`   Descrição: ${rota.descricao}`);
                console.log(`   Motorista: ${rota.email_motorista}`);
                console.log('');
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar usuários:', error);
    } finally {
        process.exit(0);
    }
}

verificarUsuarios();