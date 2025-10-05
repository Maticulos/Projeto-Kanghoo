const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Função para criar TODAS as tabelas necessárias
const criarTabelas = async () => {
  const criarTabelaUsuariosQuery = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    celular VARCHAR(20),
    data_nascimento DATE,
    tipo_cadastro VARCHAR(50), -- <-- ADICIONE ESTA LINHA
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

  // Adicione outras tabelas como 'veiculos', 'empresas', etc., conforme sua necessidade.
  // Exemplo para veículos:
  const criarTabelaVeiculosQuery = `
    CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        placa VARCHAR(10) NOT NULL,
        renavam VARCHAR(20) NOT NULL,
        lotacao_maxima INTEGER,
        -- Adicione todos os outros campos do formulário do veículo aqui
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
 // NOVA TABELA PARA DADOS DA EMPRESA
  const criarTabelaEmpresasQuery = `
    CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        razao_social VARCHAR(255) NOT NULL,
        nome_fantasia VARCHAR(255),
        cnpj VARCHAR(20) UNIQUE NOT NULL,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pool.query(criarTabelaUsuariosQuery);
    await pool.query(criarTabelaVeiculosQuery);
    await pool.query(criarTabelaEmpresasQuery); // Adiciona a criação da nova tabela
    console.log('Tabelas verificadas/criadas com sucesso.');
  } catch (error) {
    console.error('Erro ao criar as tabelas:', error);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  criarTabelas,
};