const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const db = require('../config/db');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  ssl: false,
  connectionTimeoutMillis: 5000,
});

async function executarMelhorias() {
  try {
    console.log('Conectando ao banco de dados...');
    
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('melhorias_bd.sql', 'utf8');
    
    // Dividir em comandos individuais (separados por ponto e vírgula)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Executando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`Executando comando ${i + 1}/${commands.length}...`);
          await pool.query(command);
          console.log(`✓ Comando ${i + 1} executado com sucesso`);
        } catch (error) {
          console.error(`✗ Erro no comando ${i + 1}:`, error.message);
          console.log('Comando:', command);
        }
      }
    }
    
    console.log('\n✓ Melhorias do banco de dados executadas com sucesso!');
    
  } catch (error) {
    console.error('Erro ao executar melhorias:', error);
  } finally {
    await pool.end();
    console.log('Conexão com o banco de dados fechada.');
  }
}

executarMelhorias();