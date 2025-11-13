const axios = require('axios');
const bcrypt = require('bcrypt');
const db = require('../config/db');

const BASE_URL = 'http://localhost:3001';

async function verificarSenhasBanco() {
    try {
        console.log('🔍 Verificando senhas no banco de dados...\n');
        
        const result = await db.query(`
            SELECT email, senha 
            FROM usuarios 
            WHERE email LIKE '%@teste.kanghoo.com' 
            ORDER BY email
        `);
        
        console.log('Usuários encontrados:');
        for (const usuario of result.rows) {
            console.log(`Email: ${usuario.email}`);
            console.log(`Senha hash: ${usuario.senha.substring(0, 20)}...`);
            
            // Testar se a senha está correta
            const senhasParaTestar = ['TesteBasic@2024', 'TestePremium@2024', 'TesteResp@2024'];
            
            for (const senha of senhasParaTestar) {
                const match = await bcrypt.compare(senha, usuario.senha);
                if (match) {
                    console.log(`✅ Senha correta: ${senha}`);
                    break;
                }
            }
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar senhas:', error);
    }
}

async function testarLoginDireto() {
    try {
        console.log('🧪 Testando login direto...\n');
        
        const testesLogin = [
            { email: 'joao.motorista.basic@teste.kanghoo.com', senha: 'TesteBasic@2024' },
            { email: 'maria.motorista.premium@teste.kanghoo.com', senha: 'TestePremium@2024' },
            { email: 'ana.responsavel@teste.kanghoo.com', senha: 'TesteResp@2024' },
            { email: 'carlos.responsavel@teste.kanghoo.com', senha: 'TesteResp@2024' }
        ];
        
        for (const teste of testesLogin) {
            console.log(`Testando login: ${teste.email}`);
            
            try {
                const response = await axios.post(`${BASE_URL}/login`, {
                    email: teste.email,
                    senha: teste.senha
                });
                
                if (response.data && response.data.token) {
                    console.log(`✅ Login bem-sucedido! Token: ${response.data.token.substring(0, 20)}...`);
                } else {
                    console.log(`❌ Login falhou - resposta inesperada:`, response.data);
                }
            } catch (error) {
                console.log(`❌ Login falhou:`, error.response?.data || error.message);
            }
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Erro durante teste de login:', error);
    }
}

async function executarTestes() {
    await verificarSenhasBanco();
    await testarLoginDireto();
    process.exit(0);
}

executarTestes();
