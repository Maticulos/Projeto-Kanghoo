const KoaRouter = require('koa-router');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth-utils');
const { validateInput, sanitizeForLog } = require('../config/security-config');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const router = new KoaRouter();

// Configuração do banco de dados
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kanghoo_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});



// GET /api/notification-preferences - Obter preferências do usuário
router.get('/api/notification-preferences', authenticateToken, async (ctx) => {
    try {
        const userId = ctx.user.id;
        
        const query = `
            SELECT * FROM notification_preferences 
            WHERE user_id = $1
        `;
        
        const result = await pool.query(query, [userId]);
        
        if (result.rows.length === 0) {
            // Retornar preferências padrão se não existirem
            const defaultPreferences = {
                user_id: userId,
                embarque_desembarque: true,
                localizacao_tempo_real: true,
                veiculo_chegando: true,
                emergencia: true,
                atraso_detectado: true,
                canais: ['app'],
                created_at: new Date(),
                updated_at: new Date()
            };
            
            ctx.body = {
                success: true,
                data: defaultPreferences
            };
        } else {
            ctx.body = {
                success: true,
                data: result.rows[0]
            };
        }
    } catch (error) {
        logger.error('Erro ao buscar preferências:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: 'Erro interno do servidor'
        };
    }
});

// POST /api/notification-preferences - Salvar/atualizar preferências
router.post('/api/notification-preferences', authenticateToken, async (ctx) => {
    try {
        const userId = ctx.user.id;
        const {
            embarque_desembarque,
            localizacao_tempo_real,
            veiculo_chegando,
            emergencia,
            atraso_detectado,
            canais
        } = ctx.request.body;

        // Validar dados de entrada
        if (typeof embarque_desembarque !== 'boolean' ||
            typeof localizacao_tempo_real !== 'boolean' ||
            typeof veiculo_chegando !== 'boolean' ||
            typeof emergencia !== 'boolean' ||
            typeof atraso_detectado !== 'boolean' ||
            !Array.isArray(canais)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Dados inválidos'
            };
            return;
        }

        // Validar canais
        const validChannels = ['app', 'email', 'whatsapp'];
        const invalidChannels = canais.filter(canal => !validChannels.includes(canal));
        if (invalidChannels.length > 0) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: `Canais inválidos: ${invalidChannels.join(', ')}`
            };
            return;
        }

        // Verificar se já existem preferências para o usuário
        const checkQuery = `
            SELECT id FROM notification_preferences 
            WHERE user_id = $1
        `;
        const checkResult = await pool.query(checkQuery, [userId]);

        let query;
        let params;

        if (checkResult.rows.length === 0) {
            // Inserir novas preferências
            query = `
                INSERT INTO notification_preferences 
                (user_id, embarque_desembarque, localizacao_tempo_real, veiculo_chegando, 
                 emergencia, atraso_detectado, canais, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                RETURNING *
            `;
            params = [userId, embarque_desembarque, localizacao_tempo_real, veiculo_chegando,
                     emergencia, atraso_detectado, JSON.stringify(canais)];
        } else {
            // Atualizar preferências existentes
            query = `
                UPDATE notification_preferences 
                SET embarque_desembarque = $2, localizacao_tempo_real = $3, 
                    veiculo_chegando = $4, emergencia = $5, atraso_detectado = $6,
                    canais = $7, updated_at = NOW()
                WHERE user_id = $1
                RETURNING *
            `;
            params = [userId, embarque_desembarque, localizacao_tempo_real, veiculo_chegando,
                     emergencia, atraso_detectado, JSON.stringify(canais)];
        }

        const result = await pool.query(query, params);

        ctx.body = {
            success: true,
            message: 'Preferências salvas com sucesso',
            data: result.rows[0]
        };

    } catch (error) {
        logger.error('Erro ao salvar preferências:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: 'Erro interno do servidor'
        };
    }
});

// PUT /api/notification-preferences - Atualizar preferências específicas
router.put('/api/notification-preferences', authenticateToken, async (ctx) => {
    try {
        const userId = ctx.user.id;
        const updates = ctx.request.body;

        // Campos permitidos para atualização
        const allowedFields = [
            'embarque_desembarque',
            'localizacao_tempo_real', 
            'veiculo_chegando',
            'emergencia',
            'atraso_detectado',
            'canais'
        ];

        // Filtrar apenas campos válidos
        const validUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                validUpdates[key] = updates[key];
            }
        });

        if (Object.keys(validUpdates).length === 0) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Nenhum campo válido para atualização'
            };
            return;
        }

        // Construir query dinâmica
        const setClause = Object.keys(validUpdates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        const query = `
            UPDATE notification_preferences 
            SET ${setClause}, updated_at = NOW()
            WHERE user_id = $1
            RETURNING *
        `;

        const params = [userId, ...Object.values(validUpdates).map(value => 
            Array.isArray(value) ? JSON.stringify(value) : value
        )];

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'Preferências não encontradas'
            };
            return;
        }

        ctx.body = {
            success: true,
            message: 'Preferências atualizadas com sucesso',
            data: result.rows[0]
        };

    } catch (error) {
        logger.error('Erro ao atualizar preferências:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: 'Erro interno do servidor'
        };
    }
});

// DELETE /api/notification-preferences - Resetar para padrões
router.delete('/api/notification-preferences', authenticateToken, async (ctx) => {
    try {
        const userId = ctx.user.id;

        const query = `
            DELETE FROM notification_preferences 
            WHERE user_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [userId]);

        ctx.body = {
            success: true,
            message: 'Preferências resetadas para os padrões',
            data: result.rows[0] || null
        };

    } catch (error) {
        logger.error('Erro ao resetar preferências:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: 'Erro interno do servidor'
        };
    }
});

module.exports = router;