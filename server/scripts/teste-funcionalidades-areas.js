const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

// Dados de teste dos perfis criados
const PERFIS_TESTE = {
    motorista_escolar: {
        email: 'joao.motorista.basic@teste.kanghoo.com',
        senha: 'TesteBasic@2024'
    },
    motorista_excursao: {
        email: 'maria.motorista.premium@teste.kanghoo.com',
        senha: 'TestePremium@2024'
    },
    responsavel_basic: {
        email: 'ana.responsavel@teste.kanghoo.com',
        senha: 'TesteResp@2024'
    },
    responsavel_premium: {
        email: 'carlos.responsavel@teste.kanghoo.com',
        senha: 'TesteResp@2024'
    }
};

let tokens = {};
let resultados = {
    motorista_escolar: [],
    motorista_excursao: [],
    responsavel_basic: [],
    responsavel_premium: [],
    resumo: {
        total_testes: 0,
        aprovados: 0,
        falharam: 0
    }
};

// Função para fazer login e obter token
async function fazerLogin(email, senha) {
    try {
        const response = await axios.post(`${BASE_URL}/login`, {
            email,
            senha
        });
        
        if (response.data && response.data.token) {
            return response.data.token;
        }
        throw new Error('Token não encontrado na resposta');
    } catch (error) {
        console.error(`❌ Erro no login para ${email}:`, error.response?.data || error.message);
        return null;
    }
}

// Função para testar uma requisição
async function testarRequisicao(nome, metodo, url, dados = null, token = null) {
    try {
        const config = {
            method: metodo,
            url: `${BASE_URL}${url}`,
            timeout: 10000
        };

        if (token) {
            config.headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        }

        if (dados && (metodo === 'POST' || metodo === 'PUT' || metodo === 'PATCH')) {
            config.data = dados;
        }

        const response = await axios(config);
        
        console.log(`✓ ${nome}`);
        return {
            nome,
            sucesso: true,
            status: response.status,
            dados: response.data
        };
    } catch (error) {
        console.log(`✗ ${nome}`);
        console.log(`  Status: ${error.response?.status || 'N/A'}, ${error.response?.data?.message || error.message}`);
        return {
            nome,
            sucesso: false,
            status: error.response?.status || 0,
            erro: error.response?.data?.message || error.message
        };
    }
}

// Testes para Motorista Escolar
async function testarMotoristaEscolar() {
    console.log('\n=== TESTES MOTORISTA ESCOLAR ===');
    
    const token = tokens.motorista_escolar;
    if (!token) {
        console.log('❌ Token não disponível para motorista escolar');
        return;
    }

    const testes = [
        // Dashboard e perfil
        await testarRequisicao('Dashboard motorista escolar', 'GET', '/api/dashboard', null, token),
        await testarRequisicao('Perfil do motorista', 'GET', '/api/usuarios/perfil', null, token),
        
        // Rotas escolares
        await testarRequisicao('Listar rotas escolares', 'GET', '/api/rotas-escolares', null, token),
        await testarRequisicao('Criar nova rota escolar', 'POST', '/api/rotas-escolares', {
            nome: 'Rota Teste Escolar',
            descricao: 'Rota de teste para motorista escolar',
            origem: 'Escola Central',
            destino: 'Bairro Residencial',
            horario_inicio: '07:00',
            horario_fim: '08:00',
            dias_semana: ['segunda', 'terca', 'quarta', 'quinta', 'sexta']
        }, token),
        
        // Crianças e conferência
        await testarRequisicao('Listar crianças da rota', 'GET', '/api/criancas', null, token),
        await testarRequisicao('Iniciar conferência', 'POST', '/api/conferencia/iniciar', {
            rota_id: 1,
            tipo: 'ida'
        }, token),
        
        // GPS e rastreamento
        await testarRequisicao('Status GPS', 'GET', '/api/gps/status', null, token),
        await testarRequisicao('Atualizar posição', 'POST', '/api/gps/posicao', {
            latitude: -23.5505,
            longitude: -46.6333,
            velocidade: 30,
            direcao: 45
        }, token),
        
        // Notificações
        await testarRequisicao('Buscar notificações', 'GET', '/api/notificacoes', null, token)
    ];

    resultados.motorista_escolar = testes;
}

// Testes para Motorista de Excursão
async function testarMotoristaExcursao() {
    console.log('\n=== TESTES MOTORISTA EXCURSÃO ===');
    
    const token = tokens.motorista_excursao;
    if (!token) {
        console.log('❌ Token não disponível para motorista de excursão');
        return;
    }

    const testes = [
        // Dashboard e perfil
        await testarRequisicao('Dashboard motorista excursão', 'GET', '/api/dashboard', null, token),
        await testarRequisicao('Perfil do motorista', 'GET', '/api/usuarios/perfil', null, token),
        
        // Excursões
        await testarRequisicao('Listar excursões', 'GET', '/api/excursoes', null, token),
        await testarRequisicao('Criar nova excursão', 'POST', '/api/excursoes', {
            nome: 'Excursão Teste',
            descricao: 'Excursão de teste para validação',
            destino: 'Parque da Cidade',
            data_inicio: '2024-12-01',
            data_fim: '2024-12-01',
            horario_saida: '08:00',
            horario_retorno: '17:00',
            preco: 50.00,
            vagas_disponiveis: 30
        }, token),
        
        // Participantes
        await testarRequisicao('Listar participantes', 'GET', '/api/excursoes/1/participantes', null, token),
        
        // GPS e rastreamento
        await testarRequisicao('Status GPS', 'GET', '/api/gps/status', null, token),
        await testarRequisicao('Atualizar posição', 'POST', '/api/gps/posicao', {
            latitude: -23.5505,
            longitude: -46.6333,
            velocidade: 40,
            direcao: 90
        }, token),
        
        // Notificações
        await testarRequisicao('Buscar notificações', 'GET', '/api/notificacoes', null, token)
    ];

    resultados.motorista_excursao = testes;
}

// Testes para Responsável Basic
async function testarResponsavelBasic() {
    console.log('\n=== TESTES RESPONSÁVEL BASIC ===');
    
    const token = tokens.responsavel_basic;
    if (!token) {
        console.log('❌ Token não disponível para responsável basic');
        return;
    }

    const testes = [
        // Dashboard e perfil
        await testarRequisicao('Dashboard responsável', 'GET', '/api/dashboard', null, token),
        await testarRequisicao('Perfil do responsável', 'GET', '/api/usuarios/perfil', null, token),
        
        // Planos e assinatura
        await testarRequisicao('Status da assinatura', 'GET', '/api/assinaturas/status', null, token),
        await testarRequisicao('Listar planos disponíveis', 'GET', '/api/planos', null, token),
        
        // Crianças
        await testarRequisicao('Listar crianças cadastradas', 'GET', '/api/criancas', null, token),
        await testarRequisicao('Cadastrar nova criança', 'POST', '/api/criancas', {
            nome: 'Criança Teste Basic',
            data_nascimento: '2015-05-15',
            cpf: '99988877766',
            endereco: 'Rua Teste, 123',
            escola: 'Escola Teste',
            serie: '3º ano',
            turno: 'manhã'
        }, token),
        
        // Rastreamento (limitado no plano Basic)
        await testarRequisicao('Posição atual das crianças', 'GET', '/api/rastreamento/criancas', null, token),
        
        // Notificações
        await testarRequisicao('Preferências de notificação', 'GET', '/api/notificacoes/preferencias', null, token),
        await testarRequisicao('Buscar notificações', 'GET', '/api/notificacoes', null, token)
    ];

    resultados.responsavel_basic = testes;
}

// Testes para Responsável Premium
async function testarResponsavelPremium() {
    console.log('\n=== TESTES RESPONSÁVEL PREMIUM ===');
    
    const token = tokens.responsavel_premium;
    if (!token) {
        console.log('❌ Token não disponível para responsável premium');
        return;
    }

    const testes = [
        // Dashboard e perfil
        await testarRequisicao('Dashboard responsável premium', 'GET', '/api/dashboard', null, token),
        await testarRequisicao('Perfil do responsável', 'GET', '/api/usuarios/perfil', null, token),
        
        // Planos e assinatura
        await testarRequisicao('Status da assinatura premium', 'GET', '/api/assinaturas/status', null, token),
        
        // Crianças
        await testarRequisicao('Listar crianças cadastradas', 'GET', '/api/criancas', null, token),
        await testarRequisicao('Cadastrar nova criança', 'POST', '/api/criancas', {
            nome: 'Criança Teste Premium',
            data_nascimento: '2016-08-20',
            cpf: '88877766655',
            endereco: 'Avenida Premium, 456',
            escola: 'Escola Premium',
            serie: '2º ano',
            turno: 'tarde'
        }, token),
        
        // Rastreamento avançado (disponível no Premium)
        await testarRequisicao('Posição atual das crianças', 'GET', '/api/rastreamento/criancas', null, token),
        await testarRequisicao('Histórico de rastreamento', 'GET', '/api/rastreamento/historico', null, token),
        await testarRequisicao('Relatórios de viagem', 'GET', '/api/relatorios/viagens', null, token),
        
        // Funcionalidades premium
        await testarRequisicao('Configurar geofencing', 'POST', '/api/geofencing', {
            nome: 'Casa',
            latitude: -23.5505,
            longitude: -46.6333,
            raio: 100
        }, token),
        
        // Notificações avançadas
        await testarRequisicao('Preferências de notificação', 'GET', '/api/notificacoes/preferencias', null, token),
        await testarRequisicao('Atualizar preferências', 'PUT', '/api/notificacoes/preferencias', {
            email: true,
            sms: true,
            push: true,
            tipos: ['chegada', 'saida', 'atraso', 'emergencia']
        }, token),
        
        // Excursões
        await testarRequisicao('Listar excursões disponíveis', 'GET', '/api/excursoes', null, token)
    ];

    resultados.responsavel_premium = testes;
}

// Função principal
async function executarTestes() {
    console.log('🚀 INICIANDO TESTES DAS FUNCIONALIDADES POR ÁREA');
    console.log(`Servidor: ${BASE_URL}\n`);

    // Fazer login para todos os perfis
    console.log('=== FAZENDO LOGIN DOS PERFIS DE TESTE ===');
    for (const [tipo, dados] of Object.entries(PERFIS_TESTE)) {
        console.log(`Fazendo login: ${dados.email}`);
        const token = await fazerLogin(dados.email, dados.senha);
        if (token) {
            tokens[tipo] = token;
            console.log(`✓ Login realizado com sucesso`);
        } else {
            console.log(`✗ Falha no login`);
        }
    }

    // Executar testes por área
    await testarMotoristaEscolar();
    await testarMotoristaExcursao();
    await testarResponsavelBasic();
    await testarResponsavelPremium();

    // Calcular estatísticas
    let totalTestes = 0;
    let totalAprovados = 0;

    for (const area of Object.keys(resultados)) {
        if (area === 'resumo') continue;
        
        const testesArea = resultados[area];
        totalTestes += testesArea.length;
        totalAprovados += testesArea.filter(t => t.sucesso).length;
    }

    resultados.resumo = {
        total_testes: totalTestes,
        aprovados: totalAprovados,
        falharam: totalTestes - totalAprovados,
        taxa_sucesso: totalTestes > 0 ? ((totalAprovados / totalTestes) * 100).toFixed(2) : 0
    };

    // Exibir resumo
    console.log('\n=== RESUMO DOS TESTES POR ÁREA ===');
    console.log(`Total de testes: ${resultados.resumo.total_testes}`);
    console.log(`Testes aprovados: ${resultados.resumo.aprovados}`);
    console.log(`Testes falharam: ${resultados.resumo.falharam}`);
    console.log(`Taxa de sucesso: ${resultados.resumo.taxa_sucesso}%`);

    if (resultados.resumo.falharam > 0) {
        console.log('\n⚠️  Alguns testes falharam. Verifique os detalhes acima.');
    } else {
        console.log('\n🎉 Todos os testes passaram com sucesso!');
    }

    // Salvar resultados
    const arquivoResultados = path.join(__dirname, 'resultados-teste-areas.json');
    fs.writeFileSync(arquivoResultados, JSON.stringify(resultados, null, 2));
    console.log(`\nResultados salvos em: ${arquivoResultados}`);
}

// Executar os testes
executarTestes().catch(error => {
    console.error('❌ Erro durante a execução dos testes:', error);
    process.exit(1);
});