/**
 * Constantes Centralizadas da Aplicação
 * 
 * Este módulo centraliza todas as constantes utilizadas
 * em toda a aplicação, facilitando manutenção e consistência.
 * 
 * @author Sistema de Transporte Escolar
 * @version 1.0.0
 */

/**
 * Tipos de usuário do sistema
 */
const USER_TYPES = {
    RESPONSAVEL: 'responsavel',
    MOTORISTA_ESCOLAR: 'motorista_escolar',
    MOTORISTA_EXCURSAO: 'motorista_excursao'
};

/**
 * Status de usuário
 */
const USER_STATUS = {
    ATIVO: 'ativo',
    INATIVO: 'inativo',
    PENDENTE: 'pendente',
    BLOQUEADO: 'bloqueado'
};

/**
 * Configurações de paginação
 */
const PAGINATION = {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    DEFAULT_PAGE: 1
};

/**
 * Tipos de transporte
 */
const TRANSPORT_TYPES = {
    ESCOLAR: 'escolar',
    EXCURSAO: 'excursao',
    TODOS: 'todos'
};

/**
 * Status de viagem
 */
const TRIP_STATUS = {
    AGENDADA: 'agendada',
    EM_ANDAMENTO: 'em_andamento',
    FINALIZADA: 'finalizada',
    CANCELADA: 'cancelada'
};

/**
 * Tipos de notificação
 */
const NOTIFICATION_TYPES = {
    VIAGEM_INICIADA: 'viagem_iniciada',
    VIAGEM_FINALIZADA: 'viagem_finalizada',
    EMBARQUE: 'embarque',
    DESEMBARQUE: 'desembarque',
    ATRASO: 'atraso',
    CANCELAMENTO: 'cancelamento',
    NOVA_MENSAGEM: 'nova_mensagem',
    AVALIACAO: 'avaliacao'
};

/**
 * Canais de notificação
 */
const NOTIFICATION_CHANNELS = {
    EMAIL: 'email',
    SMS: 'sms',
    WHATSAPP: 'whatsapp',
    PUSH: 'push',
    WEBSOCKET: 'websocket'
};

/**
 * Prioridades de notificação
 */
const NOTIFICATION_PRIORITIES = {
    BAIXA: 'baixa',
    MEDIA: 'media',
    ALTA: 'alta',
    CRITICA: 'critica'
};

/**
 * Status de notificação
 */
const NOTIFICATION_STATUS = {
    PENDENTE: 'pendente',
    ENVIADA: 'enviada',
    ENTREGUE: 'entregue',
    LIDA: 'lida',
    FALHOU: 'falhou'
};

/**
 * Características de veículos
 */
const VEHICLE_FEATURES = {
    AR_CONDICIONADO: 'ar_condicionado',
    WIFI: 'wifi',
    ACESSIBILIDADE: 'acessibilidade',
    CINTOS_SEGURANCA: 'cintos_seguranca',
    CAMERA_SEGURANCA: 'camera_seguranca',
    GPS: 'gps',
    SEGURO: 'seguro'
};

/**
 * Status de veículo
 */
const VEHICLE_STATUS = {
    ATIVO: 'ativo',
    INATIVO: 'inativo',
    MANUTENCAO: 'manutencao',
    INDISPONIVEL: 'indisponivel'
};

/**
 * Turnos escolares
 */
const SCHOOL_SHIFTS = {
    MATUTINO: 'matutino',
    VESPERTINO: 'vespertino',
    NOTURNO: 'noturno',
    INTEGRAL: 'integral'
};

/**
 * Dias da semana
 */
const WEEKDAYS = {
    SEGUNDA: 'segunda',
    TERCA: 'terca',
    QUARTA: 'quarta',
    QUINTA: 'quinta',
    SEXTA: 'sexta',
    SABADO: 'sabado',
    DOMINGO: 'domingo'
};

/**
 * Status de avaliação
 */
const REVIEW_STATUS = {
    PENDENTE: 'pendente',
    APROVADA: 'aprovada',
    REJEITADA: 'rejeitada'
};

/**
 * Tipos de evento de rastreamento
 */
const TRACKING_EVENTS = {
    LOCALIZACAO: 'localizacao',
    EMBARQUE: 'embarque',
    DESEMBARQUE: 'desembarque',
    PARADA: 'parada',
    INICIO_VIAGEM: 'inicio_viagem',
    FIM_VIAGEM: 'fim_viagem'
};

/**
 * Códigos de erro HTTP
 */
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500
};

/**
 * Configurações de arquivo
 */
const FILE_CONFIG = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: {
        IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    },
    UPLOAD_PATHS: {
        IMAGES: './uploads/images',
        DOCUMENTS: './uploads/documents',
        TEMP: './uploads/temp'
    }
};

/**
 * Configurações de cache
 */
const CACHE_CONFIG = {
    TTL: {
        SHORT: 5 * 60 * 1000,      // 5 minutos
        MEDIUM: 30 * 60 * 1000,    // 30 minutos
        LONG: 60 * 60 * 1000,      // 1 hora
        VERY_LONG: 24 * 60 * 60 * 1000  // 24 horas
    },
    KEYS: {
        USER_SESSION: 'user_session',
        VEHICLE_DATA: 'vehicle_data',
        ROUTE_DATA: 'route_data',
        LOCATION_DATA: 'location_data'
    }
};

/**
 * Configurações de rate limiting
 */
const RATE_LIMIT = {
    WINDOW_MS: 15 * 60 * 1000,  // 15 minutos
    MAX_REQUESTS: {
        GENERAL: 100,
        AUTH: 5,
        UPLOAD: 10
    }
};

/**
 * Configurações de WebSocket
 */
const WEBSOCKET_CONFIG = {
    HEARTBEAT_INTERVAL: 30000,  // 30 segundos
    CONNECTION_TIMEOUT: 60000,  // 1 minuto
    MAX_CONNECTIONS_PER_USER: 5,
    EVENTS: {
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        MESSAGE: 'message',
        PING: 'ping',
        PONG: 'pong',
        SUBSCRIBE: 'subscribe',
        UNSUBSCRIBE: 'unsubscribe'
    }
};

/**
 * Configurações de segurança
 */
const SECURITY_CONFIG = {
    JWT_EXPIRES_IN: '24h',
    PASSWORD_MIN_LENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME: 15 * 60 * 1000,  // 15 minutos
    SALT_ROUNDS: 12
};

/**
 * Mensagens padrão do sistema
 */
const MESSAGES = {
    SUCCESS: {
        CREATED: 'Registro criado com sucesso',
        UPDATED: 'Registro atualizado com sucesso',
        DELETED: 'Registro excluído com sucesso',
        LOGIN: 'Login realizado com sucesso',
        LOGOUT: 'Logout realizado com sucesso'
    },
    ERROR: {
        NOT_FOUND: 'Registro não encontrado',
        UNAUTHORIZED: 'Acesso não autorizado',
        FORBIDDEN: 'Acesso negado',
        VALIDATION: 'Dados inválidos fornecidos',
        INTERNAL: 'Erro interno do servidor',
        DUPLICATE: 'Registro já existe',
        INVALID_CREDENTIALS: 'Credenciais inválidas'
    }
};

/**
 * Expressões regulares comuns
 */
const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
    CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    PLATE: /^[A-Z]{3}-\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
};

module.exports = {
    USER_TYPES,
    USER_STATUS,
    PAGINATION,
    TRANSPORT_TYPES,
    TRIP_STATUS,
    NOTIFICATION_TYPES,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_PRIORITIES,
    NOTIFICATION_STATUS,
    VEHICLE_FEATURES,
    VEHICLE_STATUS,
    SCHOOL_SHIFTS,
    WEEKDAYS,
    REVIEW_STATUS,
    TRACKING_EVENTS,
    HTTP_STATUS,
    FILE_CONFIG,
    CACHE_CONFIG,
    RATE_LIMIT,
    WEBSOCKET_CONFIG,
    SECURITY_CONFIG,
    MESSAGES,
    REGEX
};