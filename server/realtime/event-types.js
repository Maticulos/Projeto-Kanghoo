/**
 * DEFINIÇÕES DE TIPOS DE EVENTOS
 * 
 * Este arquivo centraliza todos os tipos de eventos e estruturas de dados
 * para o sistema de notificações em tempo real.
 * 
 * Padroniza a comunicação entre frontend e backend, garantindo
 * consistência nas mensagens e facilitando manutenção.
 * 
 * @author Sistema Kanghoo
 * @version 1.0.0
 */

/**
 * TIPOS DE EVENTOS PRINCIPAIS
 */
const EVENT_TYPES = {
    // Eventos de Embarque/Desembarque
    CRIANCA_EMBARCOU: 'crianca_embarcou',
    CRIANCA_DESEMBARCOU: 'crianca_desembarcou',
    
    // Eventos de Localização
    LOCALIZACAO_ATUALIZADA: 'localizacao_atualizada',
    VEICULO_CHEGANDO: 'veiculo_chegando',
    VEICULO_CHEGOU: 'veiculo_chegou',
    
    // Eventos de Viagem
    VIAGEM_INICIADA: 'viagem_iniciada',
    VIAGEM_FINALIZADA: 'viagem_finalizada',
    VIAGEM_PAUSADA: 'viagem_pausada',
    VIAGEM_RETOMADA: 'viagem_retomada',
    
    // Eventos de Alerta
    ATRASO_DETECTADO: 'atraso_detectado',
    EMERGENCIA: 'emergencia',
    VELOCIDADE_EXCESSIVA: 'velocidade_excessiva',
    DESVIO_ROTA: 'desvio_rota',
    
    // Eventos de Sistema
    MANUTENCAO_PROGRAMADA: 'manutencao_programada',
    SISTEMA_INDISPONIVEL: 'sistema_indisponivel',
    CONEXAO_PERDIDA: 'conexao_perdida',
    CONEXAO_RESTAURADA: 'conexao_restaurada',
    
    // Eventos de Usuário
    USUARIO_CONECTADO: 'usuario_conectado',
    USUARIO_DESCONECTADO: 'usuario_desconectado',
    PERFIL_ATUALIZADO: 'perfil_atualizado',
    
    // Eventos de Chat/Mensagens
    NOVA_MENSAGEM: 'nova_mensagem',
    MENSAGEM_LIDA: 'mensagem_lida',
    USUARIO_DIGITANDO: 'usuario_digitando',
    
    // Eventos de Pagamento
    PAGAMENTO_APROVADO: 'pagamento_aprovado',
    PAGAMENTO_REJEITADO: 'pagamento_rejeitado',
    FATURA_GERADA: 'fatura_gerada',
    FATURA_VENCIDA: 'fatura_vencida'
};

/**
 * NÍVEIS DE PRIORIDADE
 */
const PRIORITY_LEVELS = {
    CRITICAL: 'critical',    // Emergências, falhas críticas
    HIGH: 'high',           // Embarque/desembarque, chegadas
    MEDIUM: 'medium',       // Atualizações de localização, início/fim viagem
    LOW: 'low'              // Manutenções, atualizações de sistema
};

/**
 * TIPOS DE USUÁRIO
 */
const USER_TYPES = {
    RESPONSAVEL: 'responsavel',
    MOTORISTA: 'motorista',
    ADMIN: 'admin',
    ESCOLA: 'escola',
    MONITOR: 'monitor'
};

/**
 * ESTRUTURAS DE DADOS PARA EVENTOS
 */

/**
 * Estrutura base para todas as notificações
 */
const BASE_NOTIFICATION_SCHEMA = {
    id: 'string',                    // ID único da notificação
    type: 'string',                  // Tipo do evento (EVENT_TYPES)
    priority: 'string',              // Prioridade (PRIORITY_LEVELS)
    timestamp: 'Date',               // Timestamp do evento
    data: 'object',                  // Dados específicos do evento
    recipients: 'array',             // Lista de destinatários
    read: 'boolean',                 // Se foi lida
    expires_at: 'Date'               // Quando expira (opcional)
};

/**
 * Esquemas específicos para cada tipo de evento
 */
const EVENT_SCHEMAS = {
    [EVENT_TYPES.CRIANCA_EMBARCOU]: {
        crianca: {
            id: 'string',
            nome: 'string',
            responsavel_id: 'string'
        },
        motorista: {
            id: 'string',
            nome: 'string',
            telefone: 'string'
        },
        veiculo: {
            id: 'string',
            placa: 'string'
        },
        localizacao: {
            latitude: 'number',
            longitude: 'number',
            endereco: 'string'
        },
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.CRIANCA_DESEMBARCOU]: {
        crianca: {
            id: 'string',
            nome: 'string',
            responsavel_id: 'string'
        },
        motorista: {
            id: 'string',
            nome: 'string',
            telefone: 'string'
        },
        veiculo: {
            id: 'string',
            placa: 'string'
        },
        localizacao: {
            latitude: 'number',
            longitude: 'number',
            endereco: 'string'
        },
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.LOCALIZACAO_ATUALIZADA]: {
        motorista: {
            id: 'string',
            nome: 'string'
        },
        veiculo: {
            id: 'string',
            placa: 'string'
        },
        localizacao: {
            latitude: 'number',
            longitude: 'number',
            endereco: 'string'
        },
        velocidade: 'number',
        direcao: 'number',
        criancas_embarcadas: 'number',
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.VEICULO_CHEGANDO]: {
        motorista: {
            id: 'string',
            nome: 'string'
        },
        veiculo: {
            id: 'string',
            placa: 'string'
        },
        destino: {
            nome: 'string',
            endereco: 'string',
            latitude: 'number',
            longitude: 'number'
        },
        tempo_estimado: 'number',      // em minutos
        distancia: 'number',           // em metros
        criancas_embarcadas: 'array',
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.VIAGEM_INICIADA]: {
        viagem: {
            id: 'string',
            tipo: 'string',            // 'ida' ou 'volta'
            origem: 'string',
            destino: 'string',
            horario_previsto: 'Date'
        },
        motorista: {
            id: 'string',
            nome: 'string',
            telefone: 'string'
        },
        veiculo: {
            id: 'string',
            placa: 'string'
        },
        criancas: 'array',
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.VIAGEM_FINALIZADA]: {
        viagem: {
            id: 'string',
            tipo: 'string'
        },
        motorista: {
            id: 'string',
            nome: 'string'
        },
        veiculo: {
            id: 'string',
            placa: 'string'
        },
        duracao: 'number',             // em minutos
        distancia_percorrida: 'number', // em km
        criancas_transportadas: 'number',
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.ATRASO_DETECTADO]: {
        motorista: {
            id: 'string',
            nome: 'string',
            telefone: 'string'
        },
        veiculo: {
            id: 'string',
            placa: 'string'
        },
        atraso_minutos: 'number',
        motivo: 'string',
        localizacao_atual: {
            latitude: 'number',
            longitude: 'number',
            endereco: 'string'
        },
        criancas_afetadas: 'array',
        novo_horario_estimado: 'Date',
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.EMERGENCIA]: {
        tipo: 'string',                // 'acidente', 'pane', 'medica', 'seguranca'
        gravidade: 'string',           // 'baixa', 'media', 'alta', 'critica'
        motorista: {
            id: 'string',
            nome: 'string',
            telefone: 'string'
        },
        veiculo: {
            id: 'string',
            placa: 'string'
        },
        localizacao: {
            latitude: 'number',
            longitude: 'number',
            endereco: 'string'
        },
        descricao: 'string',
        criancas_embarcadas: 'array',
        autoridades_acionadas: 'boolean',
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.NOVA_MENSAGEM]: {
        remetente: {
            id: 'string',
            nome: 'string',
            tipo: 'string'
        },
        destinatario: {
            id: 'string',
            nome: 'string',
            tipo: 'string'
        },
        mensagem: {
            id: 'string',
            conteudo: 'string',
            tipo: 'string',            // 'texto', 'imagem', 'audio'
            anexos: 'array'
        },
        conversa_id: 'string',
        timestamp: 'Date',
        message: 'string'
    },

    [EVENT_TYPES.PAGAMENTO_APROVADO]: {
        pagamento: {
            id: 'string',
            valor: 'number',
            metodo: 'string',          // 'pix', 'cartao', 'boleto'
            referencia: 'string'
        },
        responsavel: {
            id: 'string',
            nome: 'string'
        },
        periodo: {
            inicio: 'Date',
            fim: 'Date'
        },
        timestamp: 'Date',
        message: 'string'
    }
};

/**
 * CONFIGURAÇÕES DE NOTIFICAÇÃO POR TIPO DE USUÁRIO
 */
const USER_NOTIFICATION_PREFERENCES = {
    [USER_TYPES.RESPONSAVEL]: {
        default_channels: ['websocket', 'push', 'email'],
        priority_filter: [PRIORITY_LEVELS.CRITICAL, PRIORITY_LEVELS.HIGH, PRIORITY_LEVELS.MEDIUM],
        event_subscriptions: [
            EVENT_TYPES.CRIANCA_EMBARCOU,
            EVENT_TYPES.CRIANCA_DESEMBARCOU,
            EVENT_TYPES.VEICULO_CHEGANDO,
            EVENT_TYPES.ATRASO_DETECTADO,
            EVENT_TYPES.EMERGENCIA,
            EVENT_TYPES.NOVA_MENSAGEM,
            EVENT_TYPES.PAGAMENTO_APROVADO,
            EVENT_TYPES.PAGAMENTO_REJEITADO
        ]
    },

    [USER_TYPES.MOTORISTA]: {
        default_channels: ['websocket', 'push'],
        priority_filter: [PRIORITY_LEVELS.CRITICAL, PRIORITY_LEVELS.HIGH],
        event_subscriptions: [
            EVENT_TYPES.VIAGEM_INICIADA,
            EVENT_TYPES.EMERGENCIA,
            EVENT_TYPES.NOVA_MENSAGEM,
            EVENT_TYPES.MANUTENCAO_PROGRAMADA,
            EVENT_TYPES.SISTEMA_INDISPONIVEL
        ]
    },

    [USER_TYPES.ADMIN]: {
        default_channels: ['websocket', 'email'],
        priority_filter: [PRIORITY_LEVELS.CRITICAL, PRIORITY_LEVELS.HIGH, PRIORITY_LEVELS.MEDIUM, PRIORITY_LEVELS.LOW],
        event_subscriptions: Object.values(EVENT_TYPES) // Todos os eventos
    },

    [USER_TYPES.ESCOLA]: {
        default_channels: ['websocket', 'email'],
        priority_filter: [PRIORITY_LEVELS.CRITICAL, PRIORITY_LEVELS.HIGH, PRIORITY_LEVELS.MEDIUM],
        event_subscriptions: [
            EVENT_TYPES.VIAGEM_INICIADA,
            EVENT_TYPES.VIAGEM_FINALIZADA,
            EVENT_TYPES.ATRASO_DETECTADO,
            EVENT_TYPES.EMERGENCIA,
            EVENT_TYPES.SISTEMA_INDISPONIVEL
        ]
    }
};

/**
 * TEMPLATES DE MENSAGEM
 */
const MESSAGE_TEMPLATES = {
    [EVENT_TYPES.CRIANCA_EMBARCOU]: {
        pt: '{crianca_nome} embarcou no veículo às {horario}',
        en: '{crianca_nome} boarded the vehicle at {horario}'
    },
    
    [EVENT_TYPES.CRIANCA_DESEMBARCOU]: {
        pt: '{crianca_nome} desembarcou do veículo às {horario}',
        en: '{crianca_nome} got off the vehicle at {horario}'
    },
    
    [EVENT_TYPES.VEICULO_CHEGANDO]: {
        pt: 'Veículo chegando em {destino} - ETA: {tempo_estimado} minutos',
        en: 'Vehicle arriving at {destino} - ETA: {tempo_estimado} minutes'
    },
    
    [EVENT_TYPES.ATRASO_DETECTADO]: {
        pt: 'Atraso de {atraso_minutos} minutos detectado. Motivo: {motivo}',
        en: '{atraso_minutos} minutes delay detected. Reason: {motivo}'
    },
    
    [EVENT_TYPES.EMERGENCIA]: {
        pt: 'EMERGÊNCIA: {tipo} - {descricao}',
        en: 'EMERGENCY: {tipo} - {descricao}'
    }
};

/**
 * FUNÇÕES UTILITÁRIAS
 */

/**
 * Valida se um evento está no formato correto
 */
function validateEvent(eventType, eventData) {
    if (!EVENT_TYPES[eventType] && !Object.values(EVENT_TYPES).includes(eventType)) {
        return { valid: false, error: 'Tipo de evento inválido' };
    }

    const schema = EVENT_SCHEMAS[eventType];
    if (!schema) {
        return { valid: false, error: 'Schema não encontrado para este tipo de evento' };
    }

    // Validação básica - pode ser expandida
    const requiredFields = Object.keys(schema);
    const missingFields = requiredFields.filter(field => !(field in eventData));
    
    if (missingFields.length > 0) {
        return { 
            valid: false, 
            error: `Campos obrigatórios ausentes: ${missingFields.join(', ')}` 
        };
    }

    return { valid: true };
}

/**
 * Cria uma notificação padronizada
 */
function createNotification(eventType, eventData, recipients = [], priority = PRIORITY_LEVELS.MEDIUM) {
    const validation = validateEvent(eventType, eventData);
    if (!validation.valid) {
        throw new Error(`Evento inválido: ${validation.error}`);
    }

    return {
        id: generateNotificationId(),
        type: eventType,
        priority,
        timestamp: new Date(),
        data: eventData,
        recipients,
        read: false,
        expires_at: getExpirationDate(priority)
    };
}

/**
 * Gera ID único para notificação
 */
function generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Define data de expiração baseada na prioridade
 */
function getExpirationDate(priority) {
    const now = new Date();
    const hours = {
        [PRIORITY_LEVELS.CRITICAL]: 72,    // 3 dias
        [PRIORITY_LEVELS.HIGH]: 48,        // 2 dias
        [PRIORITY_LEVELS.MEDIUM]: 24,      // 1 dia
        [PRIORITY_LEVELS.LOW]: 12          // 12 horas
    };

    return new Date(now.getTime() + (hours[priority] || 24) * 60 * 60 * 1000);
}

/**
 * Formata mensagem usando template
 */
function formatMessage(eventType, eventData, language = 'pt') {
    const template = MESSAGE_TEMPLATES[eventType];
    if (!template || !template[language]) {
        return eventData.message || 'Notificação sem template';
    }

    let message = template[language];
    
    // Substituir placeholders
    Object.keys(eventData).forEach(key => {
        const placeholder = `{${key}}`;
        if (message.includes(placeholder)) {
            message = message.replace(new RegExp(placeholder, 'g'), eventData[key]);
        }
    });

    return message;
}

module.exports = {
    EVENT_TYPES,
    PRIORITY_LEVELS,
    USER_TYPES,
    EVENT_SCHEMAS,
    USER_NOTIFICATION_PREFERENCES,
    MESSAGE_TEMPLATES,
    validateEvent,
    createNotification,
    formatMessage,
    generateNotificationId
};