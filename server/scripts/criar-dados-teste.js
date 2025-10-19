const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function criarDadosTeste() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Iniciando criação de dados de teste...');
        
        // 1. Criar usuário motorista
        console.log('👤 Criando usuário motorista...');
        const motoristaExistente = await client.query(`
            SELECT id FROM usuarios WHERE email = $1
        `, ['motorista.teste@escola.com']);
        
        let motoristaId;
        if (motoristaExistente.rows.length > 0) {
            motoristaId = motoristaExistente.rows[0].id;
            console.log(`✅ Motorista já existe com ID: ${motoristaId}`);
        } else {
            const senhaHash = await bcrypt.hash('senha123', 12);
            const motoristaResult = await client.query(`
                INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, ['João Silva', 'motorista.teste@escola.com', senhaHash, 'motorista_escolar']);
            motoristaId = motoristaResult.rows[0].id;
            console.log(`✅ Motorista criado com ID: ${motoristaId}`);
        }
        
        // 2. Criar uma rota de teste
        console.log('📍 Criando rota de teste...');
        
        // Primeiro verificar se já existe
        const rotaExistente = await client.query(`
            SELECT id FROM rotas WHERE nome_rota = $1 AND motorista_id = $2
        `, ['Rota Centro - Escola Municipal', motoristaId]);
        
        let rotaId;
        if (rotaExistente.rows.length > 0) {
            rotaId = rotaExistente.rows[0].id;
            console.log(`✅ Rota já existe com ID: ${rotaId}`);
        } else {
            const rotaResult = await client.query(`
                INSERT INTO rotas (nome_rota, descricao, motorista_id, ativo, horario_inicio, horario_fim, dias_semana)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [
                'Rota Centro - Escola Municipal',
                'Transporte escolar da região central para a Escola Municipal',
                motoristaId, // ID do motorista de teste
                true,
                '07:00:00',
                '08:30:00',
                '1,2,3,4,5' // Segunda a sexta
            ]);
            rotaId = rotaResult.rows[0].id;
            console.log(`✅ Rota criada com ID: ${rotaId}`);
        }
         
         // 3. Criar pontos de parada
        console.log('🚏 Criando pontos de parada...');
        const pontosParada = [
            {
                nome: 'Praça Central',
                endereco: 'Praça Central, 123 - Centro',
                latitude: -23.5505,
                longitude: -46.6333,
                ordem: 1
            },
            {
                nome: 'Rua das Flores',
                endereco: 'Rua das Flores, 456 - Centro',
                latitude: -23.5515,
                longitude: -46.6343,
                ordem: 2
            },
            {
                nome: 'Escola Municipal',
                endereco: 'Av. Educação, 789 - Vila Escolar',
                latitude: -23.5525,
                longitude: -46.6353,
                ordem: 3
            }
        ];
        
        for (const ponto of pontosParada) {
            // Verificar se já existe
            const pontoExistente = await client.query(`
                SELECT id FROM pontos_parada WHERE rota_id = $1 AND ordem_parada = $2
            `, [rotaId, ponto.ordem]);
            
            if (pontoExistente.rows.length === 0) {
                await client.query(`
                    INSERT INTO pontos_parada (rota_id, endereco, latitude, longitude, ordem_parada)
                    VALUES ($1, $2, $3, $4, $5)
                `, [rotaId, ponto.endereco, ponto.latitude, ponto.longitude, ponto.ordem]);
            }
        }
        console.log(`✅ ${pontosParada.length} pontos de parada criados`);
        
        // 4. Criar usuários responsáveis
         console.log('👨‍👩‍👧‍👦 Criando usuários responsáveis...');
         const responsaveis = [
             {
                 nome_completo: 'Maria Silva',
                 email: 'maria.silva@email.com',
                 senha: 'senha123',
                 tipo_cadastro: 'responsavel'
             },
             {
                 nome_completo: 'João Santos',
                 email: 'joao.santos@email.com',
                 senha: 'senha123',
                 tipo_cadastro: 'responsavel'
             },
             {
                 nome_completo: 'Ana Oliveira',
                 email: 'ana.oliveira@email.com',
                 senha: 'senha123',
                 tipo_cadastro: 'responsavel'
             }
         ];

         const responsaveisIds = [];
         for (const responsavel of responsaveis) {
             const responsavelExistente = await client.query(`
                 SELECT id FROM usuarios WHERE email = $1
             `, [responsavel.email]);
             
             let responsavelId;
             if (responsavelExistente.rows.length === 0) {
                 const senhaHash = await bcrypt.hash(responsavel.senha, 12);
                 const result = await client.query(`
                     INSERT INTO usuarios (nome_completo, email, senha, tipo_cadastro)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id
                 `, [responsavel.nome_completo, responsavel.email, senhaHash, responsavel.tipo_cadastro]);
                 responsavelId = result.rows[0].id;
                 console.log(`✅ Responsável ${responsavel.nome_completo} criado com ID: ${responsavelId}`);
             } else {
                 responsavelId = responsavelExistente.rows[0].id;
                 console.log(`✅ Responsável ${responsavel.nome_completo} já existe com ID: ${responsavelId}`);
             }
             responsaveisIds.push(responsavelId);
         }

         // 5. Criar crianças de teste
         console.log('👶 Criando crianças de teste...');
         const criancas = [
             {
                 nome_completo: 'Ana Silva',
                 data_nascimento: '2016-03-15',
                 cpf: '12345678901',
                 idade: 8,
                 escola: 'Escola Municipal',
                 endereco_residencial: 'Rua A, 100 - Centro',
                 endereco_escola: 'Av. Educação, 789 - Vila Escolar',
                 nome_responsavel: 'Maria Silva',
                 telefone_responsavel: '(11) 99999-1111',
                 email_responsavel: 'maria.silva@email.com'
             },
             {
                 nome_completo: 'Carlos Santos',
                 data_nascimento: '2015-07-22',
                 cpf: '23456789012',
                 idade: 9,
                 escola: 'Escola Municipal',
                 endereco_residencial: 'Rua B, 200 - Centro',
                 endereco_escola: 'Av. Educação, 789 - Vila Escolar',
                 nome_responsavel: 'João Santos',
                 telefone_responsavel: '(11) 99999-2222',
                 email_responsavel: 'joao.santos@email.com'
             },
             {
                 nome_completo: 'Maria Oliveira',
                 data_nascimento: '2017-01-10',
                 cpf: '34567890123',
                 idade: 7,
                 escola: 'Escola Municipal',
                 endereco_residencial: 'Rua C, 300 - Centro',
                 endereco_escola: 'Av. Educação, 789 - Vila Escolar',
                 nome_responsavel: 'Ana Oliveira',
                 telefone_responsavel: '(11) 99999-3333',
                 email_responsavel: 'ana.oliveira@email.com'
             }
         ];
        
        const criancasIds = [];
        for (const crianca of criancas) {
            // Verificar se já existe
            const criancaExistente = await client.query(`
                SELECT id FROM criancas WHERE cpf = $1
            `, [crianca.cpf]);
            
            let criancaId;
            if (criancaExistente.rows.length > 0) {
                criancaId = criancaExistente.rows[0].id;
            } else {
                const responsavelIndex = criancas.indexOf(crianca);
                 const result = await client.query(`
                     INSERT INTO criancas (nome_completo, data_nascimento, cpf, idade, escola, endereco_residencial, endereco_escola, nome_responsavel, telefone_responsavel, email_responsavel, responsavel_id, motorista_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                     RETURNING id
                 `, [crianca.nome_completo, crianca.data_nascimento, crianca.cpf, crianca.idade, crianca.escola, crianca.endereco_residencial, crianca.endereco_escola, crianca.nome_responsavel, crianca.telefone_responsavel, crianca.email_responsavel, responsaveisIds[responsavelIndex], motoristaId]);
                criancaId = result.rows[0].id;
            }
            
            criancasIds.push(criancaId);
        }
        console.log(`✅ ${criancas.length} crianças criadas`);
        
        // 6. Criar alguns registros de rastreamento
         console.log('📍 Criando dados de rastreamento...');
        const hoje = new Date();
        const localizacoes = [
            { lat: -23.5505, lng: -46.6333, vel: 25.5 },
            { lat: -23.5515, lng: -46.6343, vel: 30.0 },
            { lat: -23.5525, lng: -46.6353, vel: 15.2 }
        ];
        
        for (let i = 0; i < localizacoes.length; i++) {
            const loc = localizacoes[i];
            const timestamp = new Date(hoje.getTime() - (i * 5 * 60 * 1000)); // 5 minutos atrás
            
            await client.query(`
                INSERT INTO rastreamento (motorista_id, rota_id, latitude, longitude, velocidade, timestamp_localizacao)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [motoristaId, rotaId, loc.lat, loc.lng, loc.vel, timestamp]);
        }
        console.log(`✅ ${localizacoes.length} registros de rastreamento criados`);
        
        // 7. Criar histórico de transportes
         console.log('📚 Criando histórico de transportes...');
        const datasHistoricas = [
            '2024-10-17',
            '2024-10-16',
            '2024-10-15'
        ];
        
        for (const data of datasHistoricas) {
            for (const criancaId of criancasIds) {
                // Verificar se já existe transporte de ida
                const transporteIdaExistente = await client.query(`
                    SELECT id FROM historico_transportes 
                    WHERE crianca_id = $1 AND data_transporte = $2 AND motorista_id = $3 AND local_embarque = $4
                `, [criancaId, data, motoristaId, 'Praça Central']);
                
                if (transporteIdaExistente.rows.length === 0) {
                    await client.query(`
                        INSERT INTO historico_transportes (crianca_id, motorista_id, rota_id, data_transporte, horario_embarque, horario_desembarque, local_embarque, local_desembarque, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [criancaId, motoristaId, rotaId, data, `${data} 07:15:00`, `${data} 08:00:00`, 'Praça Central', 'Escola Municipal', 'concluido']);
                }
                
                // Verificar se já existe transporte de volta
                const transporteVoltaExistente = await client.query(`
                    SELECT id FROM historico_transportes 
                    WHERE crianca_id = $1 AND data_transporte = $2 AND motorista_id = $3 AND local_embarque = $4
                `, [criancaId, data, motoristaId, 'Escola Municipal']);
                
                if (transporteVoltaExistente.rows.length === 0) {
                    await client.query(`
                        INSERT INTO historico_transportes (crianca_id, motorista_id, rota_id, data_transporte, horario_embarque, horario_desembarque, local_embarque, local_desembarque, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [criancaId, motoristaId, rotaId, data, `${data} 17:00:00`, `${data} 17:45:00`, 'Escola Municipal', 'Praça Central', 'concluido']);
                }
            }
        }
        console.log(`✅ ${datasHistoricas.length * criancasIds.length * 2} registros de histórico criados`);
        
        console.log('🎉 Dados de teste criados com sucesso!');
        console.log('\n📊 Resumo dos dados criados:');
        console.log(`- 1 rota: "Rota Centro - Escola Municipal"`);
        console.log(`- ${pontosParada.length} pontos de parada`);
        console.log(`- ${criancas.length} crianças`);
        console.log(`- ${localizacoes.length} registros de rastreamento`);
        console.log(`- ${datasHistoricas.length * criancas.length * 2} registros de histórico`);
        console.log('\n🔗 Agora você pode testar os endpoints:');
        console.log('- GET /api/rastreamento/viagem-ativa');
        console.log('- GET /api/rastreamento/historico');
        console.log('- POST /api/rastreamento/localizacao');
        console.log('- POST /api/rastreamento/embarque');
        console.log('- POST /api/rastreamento/desembarque');
        
    } catch (error) {
        console.error('❌ Erro ao criar dados de teste:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    criarDadosTeste()
        .then(() => {
            console.log('\n✅ Script executado com sucesso!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Erro na execução:', error);
            process.exit(1);
        });
}

module.exports = { criarDadosTeste };