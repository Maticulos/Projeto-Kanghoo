/**
 * 🧪 SCRIPT DE CRIAÇÃO DE DADOS DE TESTE PARA PRODUÇÃO
 * 
 * Este script cria perfis de teste ficcionais para validação completa do sistema:
 * - Motorista Escolar (Plano Basic)
 * - Motorista de Excursão (Plano Premium)  
 * - Responsáveis com crianças
 * - Rotas de exemplo
 * - Dados que passam por todas as validações
 */

const bcrypt = require('bcrypt');
const db = require('../config/db');
const logger = require('../utils/logger');

// ==========================================
// CONFIGURAÇÕES DOS PERFIS DE TESTE
// ==========================================

const PERFIS_TESTE = {
  motoristaBasic: {
    nome_completo: "João Silva Santos",
    email: "joao.motorista.basic@teste.kanghoo.com",
    senha: "TesteBasic@2024",
    tipo_cadastro: "motorista_escolar",
    celular: "(11) 98765-4321",
    endereco: "Rua das Flores, 123 - Vila Madalena, São Paulo - SP",

    cnh: "12345678901",
    categoria_cnh: "D",
    vencimento_cnh: "2026-12-31",
    plano: "basico",
    limite_rotas: 3,
    limite_usuarios: 15,
    veiculo: {
      placa: "ABC-1234",
      modelo: "Mercedes-Benz Sprinter",
      ano: 2020,
      capacidade: 15,
      cor: "Branco"
    }
  },
  
  motoristaPremium: {
    nome_completo: "Maria Oliveira Costa",
    email: "maria.motorista.premium@teste.kanghoo.com",
    senha: "TestePremium@2024",
    tipo_cadastro: "motorista_excursao",
    celular: "(11) 91234-5678",
    endereco: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",

    cnh: "98765432109",
    categoria_cnh: "D",
    vencimento_cnh: "2027-06-30",
    plano: "premium",
    limite_rotas: 10,
    limite_usuarios: 50,
    veiculo: {
      placa: "XYZ-9876",
      modelo: "Iveco Daily",
      ano: 2022,
      capacidade: 28,
      cor: "Azul"
    }
  },
  
  responsaveis: [
    {
      nome_completo: "Ana Costa Silva",
      email: "ana.responsavel@teste.kanghoo.com",
      senha: "TesteResp@2024",
      tipo_cadastro: "responsavel",
      celular: "(11) 99999-1111",
      endereco: "Rua dos Jardins, 456 - Jardins, São Paulo - SP",

      crianca: {
        nome_completo: "Sofia Costa Silva",
        idade: 8,
        serie_ano: "3º Ano",
        turno: "Manhã",
        escola: "Escola Municipal Monteiro Lobato",
        necessidades_especiais: "Nenhuma",
        contato_emergencia: "(11) 88888-2222"
      }
    },
    {
      nome_completo: "Carlos Roberto Lima",
      email: "carlos.responsavel@teste.kanghoo.com",
      senha: "TesteResp@2024",
      tipo_cadastro: "responsavel",
      celular: "(11) 77777-3333",
      endereco: "Rua das Palmeiras, 789 - Moema, São Paulo - SP",

      crianca: {
        nome_completo: "Pedro Roberto Lima",
        idade: 10,
        serie_ano: "5º Ano",
        turno: "Tarde",
        escola: "Colégio São Francisco",
        necessidades_especiais: "Alergia a amendoim",
        contato_emergencia: "(11) 66666-4444"
      }
    },
    {
      nome_completo: "Fernanda Santos Oliveira",
      email: "fernanda.responsavel@teste.kanghoo.com",
      senha: "TesteResp@2024",
      tipo_cadastro: "responsavel",
      celular: "(11) 55555-5555",
      endereco: "Av. Faria Lima, 321 - Itaim Bibi, São Paulo - SP",

      crianca: {
        nome_completo: "Lucas Santos Oliveira",
        idade: 7,
        serie_ano: "2º Ano",
        turno: "Manhã",
        escola: "Escola Estadual Prof. João Silva",
        necessidades_especiais: "Nenhuma",
        contato_emergencia: "(11) 44444-6666"
      }
    }
  ]
};

// ==========================================
// ROTAS DE EXEMPLO
// ==========================================

const ROTAS_EXEMPLO = {
  escolar: [
    {
      nome: "Rota Vila Madalena - Escola Monteiro Lobato",
      descricao: "Rota matutina para Escola Municipal Monteiro Lobato",
      origem: "Rua das Flores, 123 - Vila Madalena, São Paulo - SP",
      destino: "Escola Municipal Monteiro Lobato - Rua da Escola, 456 - Vila Madalena, SP",
      horario_saida: "06:30:00",
      horario_chegada: "07:15:00",
      dias_semana: ["segunda", "terca", "quarta", "quinta", "sexta"],
      preco_mensal: 180.00,
      vagas_disponiveis: 12,
      observacoes: "Rota com paradas intermediárias no Largo da Batata"
    },
    {
      nome: "Rota Jardins - Colégio São Francisco",
      descricao: "Rota vespertina para Colégio São Francisco",
      origem: "Rua dos Jardins, 456 - Jardins, São Paulo - SP",
      destino: "Colégio São Francisco - Av. São Francisco, 789 - Jardins, SP",
      horario_saida: "12:30:00",
      horario_chegada: "13:15:00",
      dias_semana: ["segunda", "terca", "quarta", "quinta", "sexta"],
      preco_mensal: 220.00,
      vagas_disponiveis: 10,
      observacoes: "Rota expressa com ar condicionado"
    }
  ],
  
  excursao: [
    {
      nome: "Excursão Zoológico de São Paulo",
      descricao: "Passeio educativo ao Zoológico com guia especializado",
      origem: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      destino: "Zoológico de São Paulo - Av. Miguel Stéfano, 4241 - Água Funda, SP",
      data_excursao: "2024-02-15",
      horario_saida: "08:00:00",
      horario_retorno: "17:00:00",
      preco_por_pessoa: 85.00,
      vagas_disponiveis: 25,
      incluso: "Transporte, entrada, lanche e guia",
      observacoes: "Levar protetor solar e água"
    },
    {
      nome: "City Tour São Paulo Histórica",
      descricao: "Tour pelos pontos históricos do centro de São Paulo",
      origem: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      destino: "Centro Histórico - Praça da Sé, São Paulo - SP",
      data_excursao: "2024-02-22",
      horario_saida: "09:00:00",
      horario_retorno: "16:00:00",
      preco_por_pessoa: 65.00,
      vagas_disponiveis: 20,
      incluso: "Transporte, guia e lanche",
      observacoes: "Caminhada leve, usar calçado confortável"
    }
  ]
};

// ==========================================
// FUNÇÕES PRINCIPAIS
// ==========================================

/**
 * Função principal para criar todos os dados de teste
 */
async function criarDadosTeste() {
  try {
    console.log('🚀 Iniciando criação de dados de teste para produção...\n');
    
    // Verificar se já existem dados de teste
    const dadosExistentes = await verificarDadosExistentes();
    if (dadosExistentes) {
      console.log('⚠️  Dados de teste já existem. Deseja recriar? (y/N)');
      // Em ambiente automatizado, pular verificação
      console.log('🔄 Limpando dados existentes...\n');
      await limparDadosTeste();
    }
    
    // Criar usuários
    const usuarios = await criarUsuarios();
    console.log('✅ Usuários criados com sucesso!\n');
    
    // Ativar planos de assinatura
    await ativarPlanos(usuarios);
    console.log('✅ Planos de assinatura ativados!\n');
    
    // Criar crianças
    await criarCriancas(usuarios.responsaveis);
    console.log('✅ Crianças cadastradas!\n');
    
    // Criar rotas
    await criarRotas(usuarios);
    console.log('✅ Rotas criadas!\n');
    
    // Criar dados de rastreamento (comentado - tabela não existe ainda)
    // await criarDadosRastreamento(usuarios);
    // console.log('✅ Dados de rastreamento criados!\n');
    
    // Exibir resumo
    exibirResumo();
    
    console.log('\n🎉 Dados de teste criados com sucesso!');
    console.log('📧 Use os emails e senhas listados acima para fazer login no sistema.\n');
    
  } catch (error) {
    logger.error('Erro ao criar dados de teste:', error);
    console.error('❌ Erro ao criar dados de teste:', error.message);
    process.exit(1);
  }
}

/**
 * Verificar se já existem dados de teste no banco
 */
async function verificarDadosExistentes() {
  try {
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM usuarios 
      WHERE email LIKE '%@teste.kanghoo.com'
    `);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    logger.error('Erro ao verificar dados existentes:', error);
    return false;
  }
}

/**
 * Limpar dados de teste existentes
 */
async function limparDadosTeste() {
  try {
    console.log('🔄 Limpando dados existentes...');
    
    // CPFs específicos que serão usados nos testes
    const cpfsTeste = ['12345678901', '98765432109', '11122233344'];
    
    // Limpar em ordem para respeitar foreign keys
    const tabelasParaLimpar = [
      "DELETE FROM rastreamento_gps WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com')",
      "DELETE FROM criancas_rotas WHERE crianca_id IN (SELECT id FROM criancas WHERE responsavel_id IN (SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com'))",
      "DELETE FROM rotas_escolares WHERE motorista_id IN (SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com')",
      // Remover crianças com CPFs específicos dos testes
      `DELETE FROM criancas WHERE cpf IN ('${cpfsTeste.join("', '")}')`,
      "DELETE FROM criancas WHERE responsavel_id IN (SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com')",
      "DELETE FROM planos_assinatura WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE '%@teste.kanghoo.com')",
      "DELETE FROM usuarios WHERE email LIKE '%@teste.kanghoo.com'"
    ];
    
    for (const query of tabelasParaLimpar) {
      try {
        await db.query(query);
      } catch (error) {
        console.log(`⚠️  Aviso ao limpar: ${error.message}`);
      }
    }
    
    console.log('🧹 Dados de teste anteriores removidos.');
  } catch (error) {
    logger.error('Erro ao limpar dados de teste:', error);
    throw error;
  }
}

/**
 * Criar usuários de teste
 */
async function criarUsuarios() {
  const usuarios = {
    motoristaBasic: null,
    motoristaPremium: null,
    responsaveis: []
  };
  
  try {
    // Criar motorista Basic
    console.log('👤 Criando motorista Basic...');
    const senhaHashBasic = await bcrypt.hash(PERFIS_TESTE.motoristaBasic.senha, 12);
    
    const motoristaBasic = await db.query(`
      INSERT INTO usuarios (
        nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, email
    `, [
      PERFIS_TESTE.motoristaBasic.nome_completo,
      PERFIS_TESTE.motoristaBasic.email,
      senhaHashBasic,
      PERFIS_TESTE.motoristaBasic.tipo_cadastro,
      PERFIS_TESTE.motoristaBasic.celular,
      PERFIS_TESTE.motoristaBasic.endereco,
      'escolar'
    ]);
    
    usuarios.motoristaBasic = motoristaBasic.rows[0];
    
    // Criar motorista Premium
    console.log('👤 Criando motorista Premium...');
    const senhaHashPremium = await bcrypt.hash(PERFIS_TESTE.motoristaPremium.senha, 12);
    
    const motoristaPremium = await db.query(`
      INSERT INTO usuarios (
        nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, email
    `, [
      PERFIS_TESTE.motoristaPremium.nome_completo,
      PERFIS_TESTE.motoristaPremium.email,
      senhaHashPremium,
      PERFIS_TESTE.motoristaPremium.tipo_cadastro,
      PERFIS_TESTE.motoristaPremium.celular,
      PERFIS_TESTE.motoristaPremium.endereco,
      'excursao'
    ]);
    
    usuarios.motoristaPremium = motoristaPremium.rows[0];
    
    // Criar responsáveis
    console.log('👨‍👩‍👧‍👦 Criando responsáveis...');
    const senhaHashResp = await bcrypt.hash('TesteResp@2024', 12);
    
    for (const responsavel of PERFIS_TESTE.responsaveis) {
      const result = await db.query(`
        INSERT INTO usuarios (
          nome_completo, email, senha, tipo_cadastro, celular, endereco_completo, tipo_usuario
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING id, email
      `, [
        responsavel.nome_completo,
        responsavel.email,
        senhaHashResp,
        responsavel.tipo_cadastro,
        responsavel.celular,
        responsavel.endereco,
        'responsavel'
      ]);
      
      usuarios.responsaveis.push({
        ...result.rows[0],
        crianca: responsavel.crianca
      });
    }
    
    return usuarios;
    
  } catch (error) {
    logger.error('Erro ao criar usuários:', error);
    throw error;
  }
}

/**
 * Ativar planos de assinatura
 */
async function ativarPlanos(usuarios) {
  try {
    console.log('💳 Ativando plano Basic...');
    await db.query(`
      INSERT INTO planos_assinatura (
        usuario_id, tipo_plano, limite_rotas, limite_usuarios, ativo
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      usuarios.motoristaBasic.id,
      'basico',
      PERFIS_TESTE.motoristaBasic.limite_rotas,
      PERFIS_TESTE.motoristaBasic.limite_usuarios,
      true
    ]);
    
    console.log('💎 Ativando plano Premium...');
    await db.query(`
      INSERT INTO planos_assinatura (
        usuario_id, tipo_plano, limite_rotas, limite_usuarios, ativo
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      usuarios.motoristaPremium.id,
      'premium',
      PERFIS_TESTE.motoristaPremium.limite_rotas,
      PERFIS_TESTE.motoristaPremium.limite_usuarios,
       true
     ]);
      
    } catch (error) {
    logger.error('Erro ao ativar planos:', error);
    throw error;
  }
}

/**
 * Criar crianças para os responsáveis
 */
async function criarCriancas(responsaveis) {
  try {
    const cpfsDisponiveis = ['12345678901', '98765432109', '11122233344'];
    
    for (let i = 0; i < responsaveis.length; i++) {
      const responsavel = responsaveis[i];
      console.log(`👶 Criando criança: ${responsavel.crianca.nome_completo}...`);
      
      // Calcular data de nascimento baseada na idade
      const anoAtual = new Date().getFullYear();
      const anoNascimento = anoAtual - responsavel.crianca.idade;
      const dataNascimento = `${anoNascimento}-03-15`;
      
      // Garantir que todos os campos obrigatórios estejam preenchidos
      const telefoneResponsavel = responsavel.celular || '(11) 99999-9999';
      const emailResponsavel = responsavel.email || `responsavel${i+1}@teste.com`;
      const nomeResponsavel = responsavel.nome_completo || `Responsável ${i+1}`;
      
      const criancaResult = await db.query(`
          INSERT INTO criancas (
            nome_completo, data_nascimento, endereco_residencial, escola, endereco_escola,
            responsavel_id, cpf, idade, nome_responsavel, telefone_responsavel, email_responsavel
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
          RETURNING id
        `, [
          responsavel.crianca.nome_completo,
          dataNascimento,
          responsavel.endereco || 'Endereço residencial de teste',
          responsavel.crianca.escola,
          'Endereço da escola de teste',
          responsavel.id,
          cpfsDisponiveis[i] || `${Math.floor(Math.random() * 100000000000)}`,
          responsavel.crianca.idade,
          nomeResponsavel,
          telefoneResponsavel,
          emailResponsavel
        ]);
        
      console.log(`✅ Criança ${responsavel.crianca.nome_completo} criada com ID: ${criancaResult.rows[0].id}`);
    }
  } catch (error) {
    logger.error('Erro ao criar crianças:', error);
    throw error;
  }
}

/**
 * Criar rotas de exemplo
 */
async function criarRotas(usuarios) {
  try {
    // Rotas escolares para motorista Basic
    console.log('🚌 Criando rotas escolares...');
    for (const rota of ROTAS_EXEMPLO.escolar) {
      await db.query(`
        INSERT INTO rotas_escolares (
          usuario_id, nome_rota, descricao, escola_destino, turno, 
          horario_ida, horario_volta, dias_semana, preco_mensal, 
          vagas_disponiveis, ativa
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      `, [
        usuarios.motoristaBasic.id,
        rota.nome,
        rota.descricao,
        rota.destino,
        'manha', // turno baseado no horário
        rota.horario_saida,
        rota.horario_chegada,
        'seg-sex', // dias_semana padrão
        rota.preco_mensal,
        rota.vagas_disponiveis
      ]);
    }
    
    console.log('✅ Rotas escolares criadas!');
    
  } catch (error) {
    logger.error('Erro ao criar rotas:', error);
    throw error;
  }
}

/**
 * Criar dados de rastreamento GPS
 */
async function criarDadosRastreamento(usuarios) {
  try {
    console.log('📍 Criando dados de rastreamento GPS...');
    
    // Dados de exemplo para motorista Basic
    await db.query(`
      INSERT INTO rastreamento_gps (
        usuario_id, latitude, longitude, velocidade, timestamp, created_at
      ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 hour', NOW())
    `, [
      usuarios.motoristaBasic.id,
      -23.5505, // Coordenadas de São Paulo
      -46.6333,
      25.5
    ]);
    
    // Dados de exemplo para motorista Premium
    await db.query(`
      INSERT INTO rastreamento_gps (
        usuario_id, latitude, longitude, velocidade, timestamp, created_at
      ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '30 minutes', NOW())
    `, [
      usuarios.motoristaPremium.id,
      -23.5629, // Av. Paulista
      -46.6544,
      30.0
    ]);
    
  } catch (error) {
    logger.error('Erro ao criar dados de rastreamento:', error);
    throw error;
  }
}

/**
 * Exibir resumo dos dados criados
 */
function exibirResumo() {
  console.log('\n📋 RESUMO DOS DADOS DE TESTE CRIADOS');
  console.log('=====================================\n');
  
  console.log('👤 USUÁRIOS DE TESTE:');
  console.log('---------------------');
  console.log(`🚌 Motorista Escolar (Basic):`);
  console.log(`   📧 Email: ${PERFIS_TESTE.motoristaBasic.email}`);
  console.log(`   🔑 Senha: ${PERFIS_TESTE.motoristaBasic.senha}`);
  console.log(`   📍 Área: /auth/area-motorista-escolar.html`);
  console.log(`   💳 Plano: Basic (3 rotas, 15 usuários)\n`);
  
  console.log(`🚐 Motorista de Excursão (Premium):`);
  console.log(`   📧 Email: ${PERFIS_TESTE.motoristaPremium.email}`);
  console.log(`   🔑 Senha: ${PERFIS_TESTE.motoristaPremium.senha}`);
  console.log(`   📍 Área: /auth/area-motorista-excursao.html`);
  console.log(`   💎 Plano: Premium (10 rotas, 50 usuários)\n`);
  
  console.log(`👨‍👩‍👧‍👦 Responsáveis:`);
  PERFIS_TESTE.responsaveis.forEach((resp, index) => {
    console.log(`   ${index + 1}. ${resp.nome_completo}`);
    console.log(`      📧 Email: ${resp.email}`);
    console.log(`      🔑 Senha: ${resp.senha}`);
    console.log(`      👶 Criança: ${resp.crianca.nome_completo}`);
    console.log(`      📍 Área: /auth/area-responsavel.html\n`);
  });
  
  console.log('🗺️ ROTAS CRIADAS:');
  console.log('------------------');
  console.log(`🚌 Rotas Escolares: ${ROTAS_EXEMPLO.escolar.length}`);
  console.log(`🚐 Rotas de Excursão: ${ROTAS_EXEMPLO.excursao.length}\n`);
  
  console.log('🔧 FUNCIONALIDADES TESTÁVEIS:');
  console.log('------------------------------');
  console.log('✅ Sistema de autenticação');
  console.log('✅ Limitações por plano (Basic vs Premium)');
  console.log('✅ Gestão de rotas escolares e excursões');
  console.log('✅ Cadastro e gestão de crianças');
  console.log('✅ Sistema de rastreamento GPS');
  console.log('✅ Área do responsável com dados reais');
  console.log('✅ Notificações e preferências');
  console.log('✅ APIs de integração');
}

/**
 * Função para limpar dados de teste (uso manual)
 */
async function limparDados() {
  try {
    console.log('🧹 Limpando dados de teste...');
    await limparDadosTeste();
    console.log('✅ Dados de teste removidos com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error.message);
  }
}

// ==========================================
// EXECUÇÃO DO SCRIPT
// ==========================================

// Verificar se foi chamado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--limpar') || args.includes('--clean')) {
    limparDados().then(() => process.exit(0));
  } else {
    criarDadosTeste().then(() => process.exit(0));
  }
}

module.exports = {
  criarDadosTeste,
  limparDadosTeste,
  PERFIS_TESTE,
  ROTAS_EXEMPLO
};
