const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env.local' });
const db = require('../config/db');

async function testarLogin() {
    try {
        console.log('🔍 Testando login...');
        
        const email = 'motorista.escolar@teste.com';
        const senha = 'teste123';
        
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Senha: ${senha}`);
        
        // Buscar usuário
        console.log('\n1. Buscando usuário no banco...');
        const userQuery = 'SELECT * FROM usuarios WHERE email = $1';
        const userResult = await db.query(userQuery, [email]);
        
        console.log(`📊 Usuários encontrados: ${userResult.rows.length}`);
        
        if (userResult.rows.length === 0) {
            console.log('❌ Usuário não encontrado!');
            return;
        }
        
        const user = userResult.rows[0];
        console.log(`✅ Usuário encontrado: ${user.nome_completo}`);
        console.log(`📧 Email no banco: ${user.email}`);
        console.log(`🔒 Hash da senha: ${user.senha}`);
        console.log(`👤 Tipo: ${user.tipo_usuario}`);
        
        // Testar senha
        console.log('\n2. Testando senha...');
        const senhaValida = await bcrypt.compare(senha, user.senha);
        console.log(`🔐 Senha válida: ${senhaValida}`);
        
        if (senhaValida) {
            console.log('✅ Login seria bem-sucedido!');
        } else {
            console.log('❌ Senha incorreta!');
            
            // Testar hash da senha fornecida
            console.log('\n3. Testando hash da senha fornecida...');
            const hashTeste = await bcrypt.hash(senha, 10);
            console.log(`🔒 Hash da senha fornecida: ${hashTeste}`);
            
            const testeComparacao = await bcrypt.compare(senha, hashTeste);
            console.log(`🔐 Teste de comparação: ${testeComparacao}`);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        // await db.end(); // Comentado para evitar fechar a conexão global
    }
}

testarLogin();