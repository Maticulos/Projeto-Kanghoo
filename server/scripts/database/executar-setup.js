require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function executarSetupCompleto() {
    // Primeiro, conectar ao postgres para criar o banco de dados
    const poolInicial = new Pool({
        user: 'postgres',
        password: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'postgres'
    });

    try {
        console.log('🔧 Iniciando configuração completa do banco de dados...\n');

        // Ler o script SQL
        const scriptPath = path.join(__dirname, 'setup-completo.sql');
        const scriptSQL = fs.readFileSync(scriptPath, 'utf8');

        // Executar o script SQL
        await poolInicial.query(scriptSQL);
        
        console.log('✅ Script SQL executado com sucesso!');
        console.log('✅ Banco de dados configurado com sucesso!');

    } catch (error) {
        console.error('❌ Erro durante a configuração do banco de dados:', error);
        throw error;
    } finally {
        await poolInicial.end();
    }
}

// Executar o script
executarSetupCompleto().catch(console.error);