const db = require('../config/db');

async function testeInsertCrianca() {
  try {
    console.log('🧪 Testando INSERT na tabela criancas...\n');
    
    // Primeiro, vamos verificar se há algum responsável existente
    const responsaveis = await db.query('SELECT id, nome_completo, email, celular FROM usuarios WHERE tipo_cadastro = $1 LIMIT 1', ['responsavel']);
    
    if (responsaveis.rows.length === 0) {
      console.log('❌ Nenhum responsável encontrado. Criando um primeiro...');
      
      const novoResponsavel = await db.query(`
        INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro, celular, endereco, ativo)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nome_completo, email, celular
      `, [
        'Teste Responsável',
        'teste@teste.com',
        'senha123',
        'responsavel',
        '(11) 99999-9999',
        'Endereço de teste',
        true
      ]);
      
      console.log('✅ Responsável criado:', novoResponsavel.rows[0]);
      var responsavel = novoResponsavel.rows[0];
    } else {
      var responsavel = responsaveis.rows[0];
      console.log('✅ Responsável encontrado:', responsavel);
    }
    
    console.log('\n🧪 Tentando inserir criança...');
    
    const resultado = await db.query(`
      INSERT INTO criancas (
        nome_completo, 
        data_nascimento, 
        endereco_residencial, 
        escola, 
        endereco_escola,
        responsavel_id,
        cpf,
        nome_responsavel,
        telefone_responsavel,
        email_responsavel
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING id, nome_completo
    `, [
      'Criança Teste',
      '2015-03-15',
      'Endereço residencial teste',
      'Escola Teste',
      'Endereço escola teste',
      responsavel.id,
      '12345678901',
      responsavel.nome_completo,
      responsavel.celular,
      responsavel.email
    ]);
    
    console.log('✅ Criança inserida com sucesso:', resultado.rows[0]);
    
  } catch (error) {
    console.error('❌ Erro ao inserir criança:', error.message);
    console.error('Detalhes:', error);
  } finally {
    process.exit(0);
  }
}

testeInsertCrianca();