/**
 * Integração com API de Rastreamento
 * Funções para comunicação com os endpoints de rastreamento do backend
 */

class RastreamentoAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = null;
        this.viagemAtiva = null;
        this.intervalos = new Map();
        this.callbacks = new Map();
        
        // Cliente WebSocket para notificações em tempo real
        this.realtimeClient = null;
        this.isRealtimeEnabled = false;
        this.fallbackToPolling = false;
    }

    // Obter token de autenticação
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // Verificar se há viagem ativa
    async obterViagemAtiva() {
        try {
            const response = await fetch('/api/rastreamento/viagem-ativa', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao obter viagem ativa:', error);
            return null;
        }
    }

    // Obter histórico de viagens
    async obterHistoricoViagens(pagina = 1, limite = 20) {
        try {
            const response = await fetch(`/api/rastreamento/historico?pagina=${pagina}&limite=${limite}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao obter histórico:', error);
            return null;
        }
    }

    // Testar conectividade da API
    async testarAPI() {
        try {
            const response = await fetch('/api/rastreamento/test', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao testar API:', error);
            return null;
        }
    }

    // Atualizar status da viagem na interface
    async atualizarStatusViagem() {
        const viagemAtiva = await this.obterViagemAtiva();
        const statusElement = document.getElementById('trip-status-text');
        const statusIndicator = document.querySelector('.status-indicator');

        if (viagemAtiva && viagemAtiva.sucesso) {
            if (viagemAtiva.viagem_ativa) {
                // Há uma viagem ativa real
                statusElement.textContent = `Viagem ${viagemAtiva.viagem_ativa.tipo_viagem} em andamento`;
                statusIndicator.className = 'status-indicator active';
                this.exibirDetalhesViagem(viagemAtiva.viagem_ativa);
            } else if (viagemAtiva.dados_simulados) {
                // Dados simulados para demonstração
                statusElement.textContent = 'Nenhuma viagem ativa (dados simulados disponíveis)';
                statusIndicator.className = 'status-indicator';
                this.exibirDetalhesViagem(viagemAtiva.dados_simulados);
            } else {
                statusElement.textContent = 'Nenhuma viagem ativa';
                statusIndicator.className = 'status-indicator';
            }
        } else {
            statusElement.textContent = 'Erro ao verificar status';
            statusIndicator.className = 'status-indicator error';
        }
    }

    // Exibir detalhes da viagem
    exibirDetalhesViagem(viagem) {
        // Atualizar elementos da interface com dados da viagem
        const detalhesContainer = document.getElementById('viagem-detalhes');
        if (detalhesContainer) {
            detalhesContainer.innerHTML = `
                <div class="viagem-info">
                    <h4>Detalhes da Viagem</h4>
                    <p><strong>Data:</strong> ${viagem.data_viagem}</p>
                    <p><strong>Horário:</strong> ${viagem.horario_inicio}</p>
                    <p><strong>Tipo:</strong> ${viagem.tipo_viagem}</p>
                    <p><strong>Rota:</strong> ${viagem.nome_rota}</p>
                    <p><strong>Crianças:</strong> ${viagem.total_criancas}</p>
                    <p><strong>Status:</strong> ${viagem.status}</p>
                </div>
            `;
        }
    }

    // Carregar histórico na interface
    async carregarHistorico() {
        const historico = await this.obterHistoricoViagens();
        const tbody = document.getElementById('trips-tbody');

        if (historico && historico.sucesso && tbody) {
            tbody.innerHTML = '';
            
            historico.historico.forEach(viagem => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${viagem.data_viagem}</td>
                    <td>${viagem.horario_inicio}</td>
                    <td>${viagem.nome_rota}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>${viagem.total_criancas}</td>
                    <td><span style="color: var(--success-color);">${viagem.status}</span></td>
                `;
                tbody.appendChild(row);
            });

            // Mostrar informação sobre dados simulados
            if (historico.dados_simulados) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'dados-simulados-info';
                infoDiv.innerHTML = `
                    <p style="color: var(--info-color); font-style: italic; margin-top: 1rem;">
                        <i class="fas fa-info-circle"></i> 
                        Dados simulados para demonstração. Em produção, estes seriam dados reais do banco.
                    </p>
                `;
                tbody.parentNode.appendChild(infoDiv);
            }
        }
    }

    /**
     * Inicializa o cliente WebSocket para notificações em tempo real
     */
    async inicializarRealtimeClient() {
        try {
            // Verificar se já está inicializado
            if (this.realtimeClient && this.isRealtimeEnabled) {
                return true;
            }

            // Obter token de autenticação
            const token = this.obterToken();
            if (!token) {
                console.warn('[RASTREAMENTO-API] Token não encontrado, usando fallback');
                this.fallbackToPolling = true;
                return false;
            }

            // Criar cliente WebSocket
            this.realtimeClient = new RealtimeClient({
                serverUrl: 'ws://localhost:5000/ws',
                enableFallback: true,
                debug: false
            });

            // Configurar listeners de eventos
            this.configurarEventListeners();

            // Inicializar cliente
            const success = await this.realtimeClient.initialize(token);
            
            if (success) {
                this.isRealtimeEnabled = true;
                console.log('[RASTREAMENTO-API] Cliente WebSocket inicializado com sucesso');
                return true;
            } else {
                console.warn('[RASTREAMENTO-API] Falha ao inicializar WebSocket, usando polling');
                this.fallbackToPolling = true;
                return false;
            }

        } catch (error) {
            console.error('[RASTREAMENTO-API] Erro ao inicializar cliente WebSocket:', error);
            this.fallbackToPolling = true;
            return false;
        }
    }

    /**
     * Configura listeners para eventos de notificação
     */
    configurarEventListeners() {
        if (!this.realtimeClient) return;

        // Evento de conexão estabelecida
        this.realtimeClient.on('connected', () => {
            console.log('[RASTREAMENTO-API] Conectado ao servidor de notificações');
            this.atualizarStatusConexao('connected');
        });

        // Evento de desconexão
        this.realtimeClient.on('disconnected', () => {
            console.log('[RASTREAMENTO-API] Desconectado do servidor de notificações');
            this.atualizarStatusConexao('disconnected');
        });

        // Notificações de embarque/desembarque
        this.realtimeClient.on('notification:crianca_embarcou', (notification) => {
            this.processarNotificacaoEmbarque(notification);
        });

        this.realtimeClient.on('notification:crianca_desembarcou', (notification) => {
            this.processarNotificacaoDesembarque(notification);
        });

        // Notificações de localização
        this.realtimeClient.on('notification:localizacao_atualizada', (notification) => {
            this.processarNotificacaoLocalizacao(notification);
        });

        // Notificações de chegada
        this.realtimeClient.on('notification:veiculo_chegando', (notification) => {
            this.processarNotificacaoChegada(notification);
        });

        // Notificações de atraso
        this.realtimeClient.on('notification:atraso_detectado', (notification) => {
            this.processarNotificacaoAtraso(notification);
        });

        // Notificações de emergência
        this.realtimeClient.on('notification:emergencia', (notification) => {
            this.processarNotificacaoEmergencia(notification);
        });

        // Fallback ativado
        this.realtimeClient.on('fallback_started', () => {
            console.log('[RASTREAMENTO-API] Fallback para polling ativado');
            this.atualizarStatusConexao('fallback');
        });

        // Fallback desativado
        this.realtimeClient.on('fallback_stopped', () => {
            console.log('[RASTREAMENTO-API] Fallback para polling desativado');
            this.atualizarStatusConexao('connected');
        });
    }

    /**
     * Processa notificação de embarque
     */
    processarNotificacaoEmbarque(notification) {
        console.log('[RASTREAMENTO-API] Criança embarcou:', notification);
        
        // Atualizar interface
        this.atualizarStatusCrianca(notification.data.criancaId, 'embarcada');
        
        // Executar callbacks registrados
        this.executarCallbacks('embarque', notification.data);
    }

    /**
     * Processa notificação de desembarque
     */
    processarNotificacaoDesembarque(notification) {
        console.log('[RASTREAMENTO-API] Criança desembarcou:', notification);
        
        // Atualizar interface
        this.atualizarStatusCrianca(notification.data.criancaId, 'desembarcada');
        
        // Executar callbacks registrados
        this.executarCallbacks('desembarque', notification.data);
    }

    /**
     * Processa notificação de localização
     */
    processarNotificacaoLocalizacao(notification) {
        console.log('[RASTREAMENTO-API] Localização atualizada:', notification);
        
        // Atualizar mapa se estiver visível
        this.atualizarLocalizacaoMapa(notification.data);
        
        // Executar callbacks registrados
        this.executarCallbacks('localizacao', notification.data);
    }

    /**
     * Processa notificação de chegada
     */
    processarNotificacaoChegada(notification) {
        console.log('[RASTREAMENTO-API] Veículo chegando:', notification);
        
        // Executar callbacks registrados
        this.executarCallbacks('chegada', notification.data);
    }

    /**
     * Processa notificação de atraso
     */
    processarNotificacaoAtraso(notification) {
        console.log('[RASTREAMENTO-API] Atraso detectado:', notification);
        
        // Executar callbacks registrados
        this.executarCallbacks('atraso', notification.data);
    }

    /**
     * Processa notificação de emergência
     */
    processarNotificacaoEmergencia(notification) {
        console.log('[RASTREAMENTO-API] Emergência:', notification);
        
        // Executar callbacks registrados
        this.executarCallbacks('emergencia', notification.data);
    }

    /**
     * Atualiza status da conexão na interface
     */
    atualizarStatusConexao(status) {
        const statusElement = document.querySelector('.connection-status');
        if (statusElement) {
            statusElement.className = `connection-status ${status}`;
            
            const statusText = {
                'connected': 'Conectado',
                'connecting': 'Conectando...',
                'disconnected': 'Desconectado',
                'fallback': 'Modo Offline'
            };
            
            statusElement.textContent = statusText[status] || status;
        }
    }

    /**
     * Atualiza status de uma criança na interface
     */
    atualizarStatusCrianca(criancaId, status) {
        const criancaElement = document.querySelector(`[data-crianca-id="${criancaId}"]`);
        if (criancaElement) {
            criancaElement.setAttribute('data-status', status);
            
            const statusElement = criancaElement.querySelector('.status-crianca');
            if (statusElement) {
                statusElement.textContent = status === 'embarcada' ? 'No Ônibus' : 'Fora do Ônibus';
                statusElement.className = `status-crianca status-${status}`;
            }
        }
    }

    /**
     * Atualiza localização no mapa
     */
    atualizarLocalizacaoMapa(dados) {
        // Verificar se existe mapa na página
        if (typeof window.atualizarMapa === 'function') {
            window.atualizarMapa(dados.latitude, dados.longitude, dados.velocidade);
        }
    }

    /**
     * Executa callbacks registrados para um tipo de evento
     */
    executarCallbacks(tipo, dados) {
        if (this.callbacks.has(tipo)) {
            this.callbacks.get(tipo).forEach(callback => {
                try {
                    callback(dados);
                } catch (error) {
                    console.error(`[RASTREAMENTO-API] Erro no callback de ${tipo}:`, error);
                }
            });
        }
    }

    /**
     * Registra callback para um tipo de evento
     */
    registrarCallback(tipo, callback) {
        if (!this.callbacks.has(tipo)) {
            this.callbacks.set(tipo, []);
        }
        this.callbacks.get(tipo).push(callback);
    }

    /**
     * Remove callback de um tipo de evento
     */
    removerCallback(tipo, callback) {
        if (this.callbacks.has(tipo)) {
            const callbacks = this.callbacks.get(tipo);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // Inicializar monitoramento automático
    iniciarMonitoramento() {
        // Atualizar status inicial
        this.atualizarStatusViagem();
        
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.atualizarStatusViagem();
        }, 30000);
    }

    pararMonitoramento() {
        console.log('Parando monitoramento...');
        
        // Parar todos os intervalos
        this.intervalos.forEach((intervalo, viagemId) => {
            clearInterval(intervalo);
            console.log(`Intervalo parado para viagem: ${viagemId}`);
        });
        
        // Limpar mapa de intervalos
        this.intervalos.clear();
        
        // Desconectar cliente WebSocket se estiver ativo
        if (this.realtimeClient && this.isRealtimeEnabled) {
            this.realtimeClient.disconnect();
            this.isRealtimeEnabled = false;
            console.log('[RASTREAMENTO-API] Cliente WebSocket desconectado');
        }
        
        // Limpar callbacks
        this.callbacks.clear();
        
        this.viagemAtiva = null;
        
        console.log('Monitoramento parado');
    }

    /**
     * Obtém o token de autenticação do localStorage
     * @returns {string|null} Token de autenticação
     */
    obterToken() {
        try {
            return localStorage.getItem('token') || sessionStorage.getItem('token');
        } catch (error) {
            console.error('[RASTREAMENTO-API] Erro ao obter token:', error);
            return null;
        }
    }
}

// Instância global da API
const rastreamentoAPI = new RastreamentoAPI();

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página do motorista
    if (document.getElementById('trip-status-text')) {
        rastreamentoAPI.iniciarMonitoramento();
    }
});

// Função para testar conectividade (pode ser chamada do console)
async function testarConectividadeAPI() {
    const resultado = await rastreamentoAPI.testarAPI();
    return resultado;
}

// Função para forçar atualização do status
async function atualizarStatus() {
    await rastreamentoAPI.atualizarStatusViagem();
}

// Função para carregar histórico manualmente
async function carregarHistoricoManual() {
    await rastreamentoAPI.carregarHistorico();
}