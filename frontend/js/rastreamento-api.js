/**
 * Integração com API de Rastreamento
 * Funções para comunicação com os endpoints de rastreamento do backend
 */

class RastreamentoAPI {
    constructor() {
        this.baseURL = '';
        this.token = localStorage.getItem('authToken');
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

    // Inicializar monitoramento automático
    iniciarMonitoramento() {
        // Atualizar status inicial
        this.atualizarStatusViagem();
        
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.atualizarStatusViagem();
        }, 30000);
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