require('dotenv').config();
const db = require('../../../config/db');

async function criarTabelasCompletas() {
    try {
        console.log('🔧 Criando/verificando todas as tabelas necessárias...\n');
        
        // Executar a criação de todas as tabelas básicas primeiro
        await db.criarTabelas();
        console.log('✅ Tabelas básicas criadas/verificadas');
        
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

        // 5. Tabela para preferências de notificação
        const criarTabelaNotificationPreferencesQuery = `
            CREATE TABLE IF NOT EXISTS notification_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                
                -- Tipos de notificação (boolean)
                embarque_desembarque BOOLEAN DEFAULT true,
                localizacao_tempo_real BOOLEAN DEFAULT true,
                veiculo_chegando BOOLEAN DEFAULT true,
                emergencia BOOLEAN DEFAULT true,
                atraso_detectado BOOLEAN DEFAULT true,
                
                -- Canais de notificação (JSON array)
                canais JSONB DEFAULT '["app"]'::jsonb,
                
                -- Timestamps
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                
                -- Constraints
                CONSTRAINT unique_user_preferences UNIQUE (user_id),
                CONSTRAINT valid_canais CHECK (jsonb_typeof(canais) = 'array')
            );
        `;

        // 6. Tabela para métricas de performance
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

        // 7. Tabela para cache de dados de localização
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

        // 8. Tabela para check-ins
        const criarTabelaCheckinsQuery = `
            CREATE TABLE IF NOT EXISTS checkins (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                rota_id INTEGER,
                tipo VARCHAR(50) NOT NULL, -- 'inicio', 'fim', 'parada'
                localizacao JSONB,
                observacoes TEXT,
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

        await db.query(criarTabelaNotificationPreferencesQuery);
        console.log('✅ Tabela notification_preferences criada/verificada');

        await db.query(criarTabelaMetricasQuery);
        console.log('✅ Tabela metricas_viagem criada/verificada');

        await db.query(criarTabelaCacheLocalizacaoQuery);
        console.log('✅ Tabela cache_localizacao criada/verificada');

        await db.query(criarTabelaCheckinsQuery);
        console.log('✅ Tabela checkins criada/verificada');
        
        // Verificar se a tabela rotas tem a coluna usuario_id
        try {
            await db.query(`
                SELECT usuario_id FROM rotas LIMIT 1
            `);
            console.log('✅ Coluna usuario_id já existe na tabela rotas');
        } catch (error) {
            if (error.message.includes('não existe')) {
                console.log('⚠️  Adicionando coluna usuario_id na tabela rotas...');
                await db.query(`
                    ALTER TABLE rotas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
                `);
                console.log('✅ Coluna usuario_id adicionada na tabela rotas');
            }
        }

        // Criar índices para performance
        console.log('\n🔧 Criando índices para otimização...');
        const indices = [
            'CREATE INDEX IF NOT EXISTS idx_viagens_motorista_data ON viagens(motorista_id, data_viagem);',
            'CREATE INDEX IF NOT EXISTS idx_viagens_status ON viagens(status);',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_viagem ON localizacoes(viagem_id);',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_timestamp ON localizacoes(timestamp);',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_motorista ON localizacoes(motorista_id);',
            'CREATE INDEX IF NOT EXISTS idx_criancas_viagens_viagem ON criancas_viagens(viagem_id);',
            'CREATE INDEX IF NOT EXISTS idx_criancas_viagens_crianca ON criancas_viagens(crianca_id);',
            'CREATE INDEX IF NOT EXISTS idx_eventos_viagem ON eventos_rastreamento(viagem_id);',
            'CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_rastreamento(tipo_evento);',
            'CREATE INDEX IF NOT EXISTS idx_eventos_motorista ON eventos_rastreamento(motorista_id);',
            'CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_metricas_viagem ON metricas_viagem(viagem_id);',
            'CREATE INDEX IF NOT EXISTS idx_metricas_motorista ON metricas_viagem(motorista_id);',
            'CREATE INDEX IF NOT EXISTS idx_cache_motorista ON cache_localizacao(motorista_id);',
            'CREATE INDEX IF NOT EXISTS idx_checkins_usuario ON checkins(usuario_id);'
        ];

        for (const indice of indices) {
            await db.query(indice);
        }
        console.log('✅ Índices criados para otimização de performance');

        // Criar função para atualizar updated_at automaticamente
        console.log('\n🔧 Criando funções e triggers...');
        await db.query(`
            CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await db.query(`
            DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at 
            ON notification_preferences;
            
            CREATE TRIGGER trigger_update_notification_preferences_updated_at
                BEFORE UPDATE ON notification_preferences
                FOR EACH ROW
                EXECUTE FUNCTION update_notification_preferences_updated_at();
        `);
        console.log('✅ Funções e triggers criados');
        
        // Verificar todas as tabelas
        console.log('\n📋 Verificando estrutura final das tabelas:');
        const tabelas = [
            'usuarios', 'veiculos', 'empresas', 'contatos', 
            'criancas', 'rotas', 'pontos_parada', 
            'historico_transportes', 'rastreamento', 'checkins',
            'viagens', 'localizacoes', 'criancas_viagens',
            'eventos_rastreamento', 'notification_preferences',
            'metricas_viagem', 'cache_localizacao'
        ];
        
        for (const tabela of tabelas) {
            try {
                const resultado = await db.query(`SELECT COUNT(*) FROM ${tabela}`);
                console.log(`✅ ${tabela}: ${resultado.rows[0].count} registros`);
            } catch (error) {
                console.log(`❌ ${tabela}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Todas as tabelas foram criadas/verificadas com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        process.exit(0);
    }
}

criarTabelasCompletas();