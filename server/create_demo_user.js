require('dotenv').config({ path: '../../.env' });
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function createDemoUser() {
  try {
    console.log('Creating demo user...');
    const email = 'ana.responsavel@teste.kanghoo.com';
    const senha = 'teste123';
    const hash = await bcrypt.hash(senha, 12);
    
    await db.query(`
      INSERT INTO usuarios (
        nome_completo, email, senha, tipo_usuario, tipo_cadastro, 
        celular, data_nascimento, endereco_completo, cidade, estado
      ) VALUES (
        'Ana Responsável Demo', $1, $2, 'responsavel', 'responsavel',
        '(48) 99999-9999', '1990-01-01', 'Rua Demo, 123, Centro', 'Tubarão', 'SC'
      )
    `, [email, hash]);
    
    console.log('Demo user created.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

createDemoUser();
