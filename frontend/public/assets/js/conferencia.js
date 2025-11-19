document.addEventListener('DOMContentLoaded', () => {
    const conferenceManager = {
        // Elementos da UI
        ui: {
            loading: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message'),
            tripSelection: document.getElementById('trip-selection'),
            activeTripDisplay: document.getElementById('active-trip-display'),
            activeTripInfo: document.getElementById('active-trip-info'),
            startTripForm: document.getElementById('start-trip-form'),
            conferenceSection: document.getElementById('conference-section'),
            childrenList: document.getElementById('children-list'),
            conferenceLog: document.getElementById('conference-log').querySelector('.card-body'),
            selectRoute: document.getElementById('select-route'),
            selectVehicle: document.getElementById('select-vehicle'),
            btnStartTrip: document.getElementById('btn-start-trip'),
            btnEndTrip: document.getElementById('btn-end-trip'),
        },

        // Estado da aplicação
        state: {
            activeTrip: null,
            routes: [],
            vehicles: [],
            children: [],
        },
        
        // Inicializador
        init() {
            this.showLoading(true);
            this.addEventListeners();
            this.checkInitialState();
        },

        // Adiciona os event listeners para os botões
        addEventListeners() {
            this.ui.btnStartTrip.addEventListener('click', () => this.startTrip());
            this.ui.btnEndTrip.addEventListener('click', () => this.endTrip());
        },

        // Verifica o estado inicial (viagem ativa, etc.)
        async checkInitialState() {
            try {
                const token = this.getToken();
                if (!token) {
                    this.showError('Você não está autenticado. Por favor, faça o login.');
                    window.location.href = '/login.html'; // Redireciona para o login
                    return;
                }

                // Tenta buscar uma viagem ativa
                const activeTrip = await this.fetchApi('/api/viagens/ativas');
                if (activeTrip.success && activeTrip.data.length > 0) {
                    this.state.activeTrip = activeTrip.data[0];
                    this.renderActiveTrip();
                } else {
                    // Se não houver viagem ativa, prepara o formulário para iniciar uma
                    await this.prepareStartForm();
                }
            } catch (error) {
                this.showError('Erro ao verificar o estado da viagem.');
                console.error(error);
            } finally {
                this.showLoading(false);
            }
        },

        // Prepara o formulário para iniciar uma nova viagem
        async prepareStartForm() {
            try {
                const [routesRes, vehiclesRes] = await Promise.all([
                    this.fetchApi('/api/rotas-escolares/motorista'), // Supondo que este endpoint exista
                    this.fetchApi('/api/veiculos/motorista')      // Supondo que este endpoint exista
                ]);

                if (routesRes.success) {
                    this.state.routes = routesRes.data;
                    this.populateSelect(this.ui.selectRoute, this.state.routes, 'id', 'nome_rota');
                } else {
                    this.showError('Não foi possível carregar suas rotas.');
                }

                if (vehiclesRes.success) {
                    this.state.vehicles = vehiclesRes.data;
                    this.populateSelect(this.ui.selectVehicle, this.state.vehicles, 'id', 'placa');
                } else {
                    this.showError('Não foi possível carregar seus veículos.');
                }
            } catch (error) {
                this.showError('Erro ao carregar dados para iniciar viagem.');
                console.error(error);
            }
        },

        // Inicia uma nova viagem
        async startTrip() {
            const rota_id = this.ui.selectRoute.value;
            const veiculo_id = this.ui.selectVehicle.value;

            if (!rota_id || !veiculo_id) {
                this.showError('Por favor, selecione uma rota e um veículo.');
                return;
            }

            this.showLoading(true);
            try {
                const result = await this.fetchApi('/api/viagens/iniciar', 'POST', { rota_id, veiculo_id });
                if (result.success) {
                    this.state.activeTrip = result.data;
                    this.renderActiveTrip();
                } else {
                    this.showError(result.message || 'Não foi possível iniciar a viagem.');
                }
            } catch (error) {
                this.showError('Erro ao iniciar a viagem.');
                console.error(error);
            } finally {
                this.showLoading(false);
            }
        },

        // Finaliza a viagem ativa
        async endTrip() {
            if (!this.state.activeTrip) return;

            this.showLoading(true);
            try {
                const result = await this.fetchApi(`/api/viagens/${this.state.activeTrip.id}/finalizar`, 'POST');
                if (result.success) {
                    this.state.activeTrip = null;
                    this.renderStartForm();
                    alert('Viagem finalizada com sucesso!');
                } else {
                    this.showError(result.message || 'Não foi possível finalizar a viagem.');
                }
            } catch (error) {
                this.showError('Erro ao finalizar a viagem.');
                console.error(error);
            } finally {
                this.showLoading(false);
            }
        },

        // Renderiza o estado de viagem ativa
        async renderActiveTrip() {
            this.ui.startTripForm.style.display = 'none';
            this.ui.activeTripDisplay.style.display = 'block';
            this.ui.conferenceSection.style.display = 'block';
            this.ui.activeTripInfo.textContent = `Rota: ${this.state.activeTrip.nome_rota}`;

            await this.loadChildrenForTrip();
            this.renderChildrenList();
            this.loadConferenceLog();
        },

        // Renderiza o formulário para iniciar uma viagem
        renderStartForm() {
            this.ui.startTripForm.style.display = 'block';
            this.ui.activeTripDisplay.style.display = 'none';
            this.ui.conferenceSection.style.display = 'none';
            this.ui.childrenList.innerHTML = '';
            this.ui.conferenceLog.innerHTML = '';
        },
        
        // Carrega as crianças da rota ativa
        async loadChildrenForTrip() {
            try {
                // Supondo que exista um endpoint para buscar crianças de uma rota
                const childrenRes = await this.fetchApi(`/api/rotas-escolares/${this.state.activeTrip.rota_id}/criancas`);
                if(childrenRes.success) {
                    this.state.children = childrenRes.data;
                } else {
                    this.showError('Não foi possível carregar as crianças da rota.');
                }
            } catch (error) {
                this.showError('Erro ao carregar crianças.');
                console.error(error);
            }
        },

        // Renderiza a lista de crianças
        renderChildrenList() {
            this.ui.childrenList.innerHTML = '';
            if (this.state.children.length === 0) {
                this.ui.childrenList.innerHTML = '<p>Nenhuma criança cadastrada nesta rota.</p>';
                return;
            }
            this.state.children.forEach(child => {
                const card = document.createElement('div');
                card.className = 'child-card';
                card.innerHTML = `
                    <div class="child-info">
                        <img src="${child.foto_url || '/assets/img/avatar_placeholder.png'}" alt="Foto de ${child.nome_completo}">
                        <span>${child.nome_completo}</span>
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="conferenceManager.confirmAction(${child.id}, 'embarque_ida')">Embarque Ida</button>
                        <button class="btn btn-warning btn-sm" onclick="conferenceManager.confirmAction(${child.id}, 'desembarque_ida')">Desemb. Ida</button>
                        <button class="btn btn-success btn-sm" onclick="conferenceManager.confirmAction(${child.id}, 'embarque_volta')">Embarque Volta</button>
                        <button class="btn btn-warning btn-sm" onclick="conferenceManager.confirmAction(${child.id}, 'desembarque_volta')">Desemb. Volta</button>
                    </div>
                `;
                this.ui.childrenList.appendChild(card);
            });
        },
        
        // Confirma uma ação (embarque/desembarque)
        async confirmAction(childId, actionType) {
            this.showLoading(true);
            try {
                // Obter localização
                const location = await this.getCurrentLocation();
                
                const body = {
                    crianca_id: childId,
                    tipo_conferencia: actionType,
                    latitude: location.latitude,
                    longitude: location.longitude,
                };
                
                const result = await this.fetchApi(`/api/viagens/${this.state.activeTrip.id}/conferencia`, 'POST', body);

                if (result.success) {
                    this.addLogEntry(result.data);
                } else {
                    this.showError(result.message || 'Erro ao registrar conferência.');
                }

            } catch (error) {
                this.showError('Erro ao registrar conferência.');
                console.error(error);
            } finally {
                this.showLoading(false);
            }
        },

        // Carrega o log de conferências da viagem ativa
        async loadConferenceLog() {
            try {
                const logRes = await this.fetchApi(`/api/viagens/${this.state.activeTrip.id}`);
                if (logRes.success && logRes.data.conferencias) {
                    this.ui.conferenceLog.innerHTML = '';
                    logRes.data.conferencias.forEach(entry => this.addLogEntry(entry, false));
                }
            } catch (error) {
                console.error('Erro ao carregar log:', error);
            }
        },

        // Adiciona uma entrada ao log na UI
        addLogEntry(entry, prepend = true) {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            const timestamp = new Date(entry.horario).toLocaleTimeString();
            logItem.textContent = `[${timestamp}] Criança ID ${entry.crianca_id} - Ação: ${entry.tipo_conferencia}`;
            
            if(prepend) {
                this.ui.conferenceLog.prepend(logItem);
            } else {
                this.ui.conferenceLog.appendChild(logItem);
            }
        },

        // Utilitários

        // Função wrapper para chamadas fetch
        async fetchApi(endpoint, method = 'GET', body = null) {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`,
                },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(endpoint, options);
            return response.json();
        },

        // Obtém o token JWT (do localStorage, por exemplo)
        getToken() {
            return localStorage.getItem('jwt_token'); // Assumindo que o token é guardado aqui
        },

        // Popula um elemento <select>
        populateSelect(selectElement, items, valueKey, textKey) {
            selectElement.innerHTML = '<option value="">Selecione...</option>';
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item[valueKey];
                option.textContent = item[textKey];
                selectElement.appendChild(option);
            });
        },
        
        // Obter geolocalização atual
        getCurrentLocation() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocalização não suportada.'));
                }
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }),
                    (error) => reject(error)
                );
            });
        },

        showLoading(isLoading) {
            this.ui.loading.style.display = isLoading ? 'block' : 'none';
        },

        showError(message) {
            this.ui.errorMessage.textContent = message;
            this.ui.errorMessage.style.display = 'block';
            setTimeout(() => {
                this.ui.errorMessage.style.display = 'none';
            }, 5000);
        },
    };
    
    // Deixar o objeto acessível globalmente para os botões inline
    window.conferenceManager = conferenceManager;
    // Iniciar o gerenciador
    conferenceManager.init();
});
