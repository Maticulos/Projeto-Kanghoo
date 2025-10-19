const db = require('./db');

async function melhorarTabelasRastreamento() {
    try {
        console.log('🔧 Melhorando sistema de persistência de dados de rastreamento...\n');
        
        // Primeiro criar as tabelas básicas se não existirem
        await db.criarTabelas();
        
        // 1. Tabela para viagens (sessões de rastreamento)
        const criarTabelaViagensQuery = `
            CREATE TABLE IF NOT EXISTS viagens (
                id SERIAL PRIMARY KEY,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                rota_id INTEGER REFERENCES rotas(id) ON DELETE CASCADE,
                data_viagem DATE NOT NULL DEFAULT CURRENT_DATE,
                horario_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                horario_fim TIMESTAMP WITH TIME ZONE,
                tipo_viagem VARCHAR(50) DEFAULT 'ida', -- 'ida', 'volta', 'excursao'
                status VARCHAR(50) DEFAULT 'iniciada', -- 'iniciada', 'em_andamento', 'finalizada', 'cancelada'
                distancia_total DECIMAL(8, 2), -- em km
                tempo_total INTEGER, -- em minutos
                combustivel_inicial DECIMAL(5, 2),
                combustivel_final DECIMAL(5, 2),
                observacoes TEXT,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 2. Tabela para localizações detalhadas
        const criarTabelaLocalizacoesQuery = `
            CREATE TABLE IF NOT EXISTS localizacoes (
                id SERIAL PRIMARY KEY,
                viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                altitude DECIMAL(8, 2),
                velocidade DECIMAL(5, 2), -- km/h
                direcao INTEGER, -- graus (0-360)
                precisao DECIMAL(5, 2), -- metros
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                endereco TEXT, -- endereço geocodificado
                tipo_ponto VARCHAR(50) DEFAULT 'tracking', -- 'tracking', 'embarque', 'desembarque', 'parada'
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 3. Tabela para crianças em viagens
        const criarTabelaCriancasViagensQuery = `
            CREATE TABLE IF NOT EXISTS criancas_viagens (
                id SERIAL PRIMARY KEY,
                viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
                crianca_id INTEGER REFERENCES criancas(id) ON DELETE CASCADE,
                horario_embarque TIMESTAMP WITH TIME ZONE,
                horario_desembarque TIMESTAMP WITH TIME ZONE,
                local_embarque TEXT,
                local_desembarque TEXT,
                latitude_embarque DECIMAL(10, 8),
                longitude_embarque DECIMAL(11, 8),
                latitude_desembarque DECIMAL(10, 8),
                longitude_desembarque DECIMAL(11, 8),
                status VARCHAR(50) DEFAULT 'agendada', -- 'agendada', 'embarcada', 'desembarcada', 'faltou'
                observacoes TEXT,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(viagem_id, crianca_id)
            );
        `;

        // 4. Tabela para eventos de rastreamento
        const criarTabelaEventosRastreamentoQuery = `
            CREATE TABLE IF NOT EXISTS eventos_rastreamento (
                id SERIAL PRIMARY KEY,
                viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                tipo_evento VARCHAR(100) NOT NULL, -- 'inicio_viagem', 'fim_viagem', 'embarque', 'desembarque', 'parada', 'emergencia', 'atraso'
                descricao TEXT,
                dados_evento JSONB, -- dados específicos do evento
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 5. Tabela para métricas de performance
        const criarTabelaMetricasQuery = `
            CREATE TABLE IF NOT EXISTS metricas_viagem (
                id SERIAL PRIMARY KEY,
                viagem_id INTEGER REFERENCES viagens(id) ON DELETE CASCADE,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                velocidade_media DECIMAL(5, 2),
                velocidade_maxima DECIMAL(5, 2),
                tempo_parado INTEGER, -- em minutos
                tempo_movimento INTEGER, -- em minutos
                distancia_percorrida DECIMAL(8, 2), -- em km
                consumo_combustivel DECIMAL(5, 2), -- em litros
                numero_paradas INTEGER,
                numero_criancas INTEGER,
                pontuacao_conduta DECIMAL(3, 1), -- 0.0 a 10.0
                data_calculo TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // 6. Tabela para cache de dados de localização
        const criarTabelaCacheLocalizacaoQuery = `
            CREATE TABLE IF NOT EXISTS cache_localizacao (
                id SERIAL PRIMARY KEY,
                motorista_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                ultima_latitude DECIMAL(10, 8),
                ultima_longitude DECIMAL(11, 8),
                ultima_velocidade DECIMAL(5, 2),
                ultima_direcao INTEGER,
                ultimo_endereco TEXT,
                ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status_online BOOLEAN DEFAULT true,
                viagem_ativa_id INTEGER REFERENCES viagens(id) ON DELETE SET NULL,
                UNIQUE(motorista_id)
            );
        `;

        // Executar criação das tabelas
        await db.query(criarTabelaViagensQuery);
        console.log('✅ Tabela viagens criada/verificada');

        await db.query(criarTabelaLocalizacoesQuery);
        console.log('✅ Tabela localizacoes criada/verificada');

        await db.query(criarTabelaCriancasViagensQuery);
        console.log('✅ Tabela criancas_viagens criada/verificada');

        await db.query(criarTabelaEventosRastreamentoQuery);
        console.log('✅ Tabela eventos_rastreamento criada/verificada');

        await db.query(criarTabelaMetricasQuery);
        console.log('✅ Tabela metricas_viagem criada/verificada');

        await db.query(criarTabelaCacheLocalizacaoQuery);
        console.log('✅ Tabela cache_localizacao criada/verificada');

        // Criar índices para performance
        const indices = [
            'CREATE INDEX IF NOT EXISTS idx_viagens_motorista_data ON viagens(motorista_id, data_viagem);',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_viagem ON localizacoes(viagem_id);',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_timestamp ON localizacoes(timestamp);',
            'CREATE INDEX IF NOT EXISTS idx_eventos_viagem ON eventos_rastreamento(viagem_id);',
            'CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_rastreamento(tipo_evento);',
            'CREATE INDEX IF NOT EXISTS idx_cache_motorista ON cache_localizacao(motorista_id);'
        ];

        for (const indice of indices) {
            await db.query(indice);
        }
        console.log('✅ Índices criados para otimização de performance');

        console.log('\n🎉 Sistema de persistência de rastreamento melhorado com sucesso!');
        console.log('\n📊 Tabelas criadas:');
        console.log('   • viagens - Sessões de rastreamento');
        console.log('   • localizacoes - Pontos GPS detalhados');
        console.log('   • criancas_viagens - Embarque/desembarque');
        console.log('   • eventos_rastreamento - Log de eventos');
        console.log('   • metricas_viagem - Análise de performance');
        console.log('   • cache_localizacao - Cache em tempo real');

    } catch (error) {
        console.error('❌ Erro ao melhorar tabelas de rastreamento:', error);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    melhorarTabelasRastreamento()
        .then(() => {
            console.log('\n✅ Script executado com sucesso!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Erro na execução:', error);
            process.exit(1);
        });
}

module.exports = { melhorarTabelasRastreamento };