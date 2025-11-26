/**
 * Funcionalidades da página Encontrar Transporte
 * Versão melhorada com validação, filtros avançados e UX aprimorada
 */

const DEFAULT_CENTER = [-23.5505, -46.6333];
const MATCH_MODE = 'AND'; // Estratégia de filtros: AND (todos) ou OR (qualquer)
const REALTIME_POLL_MS = 12000;

class TransportesGateway {
    constructor(config = {}) {
        const app = window.APP_CONFIG || {};
        this.apiBase = config.apiBase || app.apiBasePath || '/api';
        this.wsBase = config.wsBase || app.wsBaseUrl || '';
        this.demoMode = !!app.demoMode;
        this.defaultCenter = config.defaultCenter || DEFAULT_CENTER;
        this.realtimeStopper = null;
    }

    buildQueryFromFilters(filtros = {}) {
        const params = new URLSearchParams();
        if (filtros.tipo) params.set('tipo', filtros.tipo);
        if (filtros.tipo_rota) params.set('tipo_rota', filtros.tipo_rota);
        if (filtros.escola) params.set('escola', filtros.escola);
        if (filtros.turno) params.set('turno', filtros.turno);
        if (filtros.valor_max) params.set('valor_max', filtros.valor_max);
        if (filtros.idade_min) params.set('idade_min', filtros.idade_min);
        if (filtros.idade_max) params.set('idade_max', filtros.idade_max);
        if (filtros.capacidade) params.set('capacidade', filtros.capacidade);
        if (Array.isArray(filtros.caracteristicas) && filtros.caracteristicas.length) {
            params.set('caracteristicas', filtros.caracteristicas.join(','));
        }
        if (filtros.latitude && filtros.longitude) {
            params.set('latitude', filtros.latitude);
            params.set('longitude', filtros.longitude);
            if (filtros.raio_km) params.set('raio_km', filtros.raio_km);
            if (filtros.raio) params.set('raio', filtros.raio);
        }
        params.set('page', filtros.page || 1);
        params.set('limit', filtros.limit || 10);
        return params.toString();
    }

    async buscarRotas(filtros = {}) {
        if (this.demoMode) {
            return { rotas: this.mockRotas(filtros) };
        }
        const query = this.buildQueryFromFilters(filtros);
        let res = null;
        try {
            res = await fetch(`${this.apiBase}/public/transportes?${query}`);
        } catch (_) {
            // segue para fallback
        }
        if (!res || !res.ok) {
            try {
                res = await fetch(`${this.apiBase}/buscar-rotas?${query}`);
            } catch (_) {
                // manter erro
            }
        }
        if (!res || !res.ok) throw new Error(`Erro na API (${res ? res.status : 'offline'})`);
        const json = await res.json();
        if (!json) throw new Error('Resposta vazia da API');
        const payload = json.data || json;
        return payload.rotas || payload.transportes || payload.data || payload;
    }

    async listarAtivos(tipo = 'escolar') {
        if (this.demoMode) {
            return this.mockAtivos(tipo);
        }
        let res = null;
        try {
            res = await fetch(`${this.apiBase}/public/transportes/ativos?tipo=${tipo}`);
        } catch (_) { /* fallback logo abaixo */ }
        if (!res || !res.ok) {
            try {
                res = await fetch(`${this.apiBase}/transportes-ativos?tipo=${tipo}`);
            } catch (_) { /* offline */ }
        }
        if (!res || !res.ok) throw new Error(`Erro HTTP ${res ? res.status : 'offline'}`);
        const json = await res.json();
        return json.transportes || json.data || [];
    }

    streamAtivos(tipo = 'escolar', onData = () => {}, onError = () => {}) {
        if (this.realtimeStopper) {
            this.realtimeStopper();
        }

        if (this.demoMode || !this.wsBase || typeof WebSocket === 'undefined') {
            const demoTick = setInterval(async () => {
                try {
                    const data = await this.listarAtivos(tipo);
                    onData(data);
                } catch (err) {
                    onError(err);
                }
            }, Math.max(REALTIME_POLL_MS * 0.75, 6000));
            this.realtimeStopper = () => clearInterval(demoTick);
            return this.realtimeStopper;
        }

        try {
            const wsUrl = `${this.wsBase}/public/transportes/ativos`;
            const socket = new WebSocket(wsUrl);
            socket.onmessage = (evt) => {
                try {
                    const payload = JSON.parse(evt.data);
                    const data = payload.transportes || payload.data || payload;
                    if (Array.isArray(data)) onData(data);
                } catch (err) {
                    onError(err);
                }
            };
            socket.onerror = (err) => {
                onError(err);
                if (socket.readyState !== WebSocket.CLOSED) {
                    socket.close();
                }
            };
            socket.onclose = () => {
                this.realtimeStopper = null;
            };
            this.realtimeStopper = () => socket.close();
            return this.realtimeStopper;
        } catch (err) {
            onError(err);
            const poll = setInterval(async () => {
                try {
                    const data = await this.listarAtivos(tipo);
                    onData(data);
                } catch (error) {
                    onError(error);
                }
            }, REALTIME_POLL_MS);
            this.realtimeStopper = () => clearInterval(poll);
            return this.realtimeStopper;
        }
    }

    stopStream() {
        if (this.realtimeStopper) {
            this.realtimeStopper();
            this.realtimeStopper = null;
        }
    }

    mockRotas(filtros = {}) {
        const base = this.defaultCenter;
        const rotas = [
            { id: 'demo-escolar-1', nome_rota: 'Van Azul - Zona Norte', tipo_rota: 'escolar', horario_ida: '07:00', horario_volta: '18:00', capacidade_maxima: 25, valor_mensal: 180, caracteristicas: ['ar-condicionado', 'seguro'], escola_destino: 'Colégio Horizonte', latitude_origem: base[0] + 0.01, longitude_origem: base[1] + 0.01 },
            { id: 'demo-escolar-2', nome_rota: 'Transporte Seguro Kids', tipo_rota: 'escolar', horario_ida: '06:45', horario_volta: '18:30', capacidade_maxima: 30, valor_mensal: 200, caracteristicas: ['ar-condicionado', 'wifi', 'seguro'], escola_destino: 'Colégio Lirio', latitude_origem: base[0] - 0.008, longitude_origem: base[1] + 0.006 },
            { id: 'demo-excursao-1', nome_rota: 'Excursão Serra', tipo_rota: 'excursao', horario_ida: 'Flexível', horario_volta: 'Flexível', capacidade_maxima: 45, valor_mensal: 0, preco: 150, caracteristicas: ['wifi', 'ar-condicionado'], escola_destino: 'Passeio cultural', latitude_origem: base[0] + 0.02, longitude_origem: base[1] - 0.008 }
        ];

        const tipo = filtros.tipo_rota || 'escolar';
        return rotas.filter(r => r.tipo_rota === tipo);
    }

    mockAtivos(tipo = 'escolar') {
        const base = this.defaultCenter;
        const lista = [
            { id: 'demo-esc-1', nome: 'Van Azul - Zona Norte', tipo: 'escolar', latitude: base[0] + 0.01, longitude: base[1] + 0.01, capacidade: 20, preco: 480, status: 'embarque' },
            { id: 'demo-esc-2', nome: 'Circuito Leste', tipo: 'escolar', latitude: base[0] - 0.012, longitude: base[1] + 0.006, capacidade: 18, preco: 420, status: 'em_rota' },
            { id: 'demo-exc-1', nome: 'Excursão Serra', tipo: 'excursao', latitude: base[0] + 0.02, longitude: base[1] - 0.008, capacidade: 40, preco: 150, status: 'embarque' }
        ];
        return lista.filter(item => item.tipo === (tipo || 'escolar'));
    }
}

class TransporteFinder {
    constructor() {
        this.apiBase = (window.APP_CONFIG?.apiBasePath) || '/api';
        this.gateway = new TransportesGateway();
        this.currentTransportType = 'escolar';
        this.currentResults = [];
        this.filteredResults = [];
        this.activeVehicles = [];
        this.activeRefresh = null;
        this.realtimeStopper = null;
        this.demoEvents = [];
        this.demoTimer = null;
        this.currentPage = 1;
        this.resultsPerPage = 10;
        this.isLoading = false;
        this.matchMode = MATCH_MODE;
        this.userCoords = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTransportTypeTabs();
        this.initializeFilterGroups();
        this.applyIntentFromQuery();
        this.loadInitialResults();
        this.setupFormValidation();
    }

    applyIntentFromQuery() {
        try {
            const params = new URLSearchParams(window.location.search);
            const tipo = params.get('tipo');
            if (tipo && (tipo === 'escolar' || tipo === 'excursao')) {
                this.currentTransportType = tipo;
                this.toggleFilterGroups(tipo);
            }
        } catch (_) { /* noop */ }
    }

    initializeFilterGroups() {
        // Inicializar com filtros escolares visíveis por padrão
        this.toggleFilterGroups(this.currentTransportType);
    }

    setupEventListeners() {
        // Tabs de tipo de transporte
        document.querySelectorAll('.transport-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTransportType(e));
        });

        // Botões de ação
        document.getElementById('btn-buscar')?.addEventListener('click', () => this.buscarTransportes());
        document.getElementById('btn-limpar')?.addEventListener('click', () => this.limparFiltros());
        
        // Ordenação
        document.getElementById('ordenacao')?.addEventListener('change', () => this.ordenarResultados());

        // Filtros em tempo real
        this.setupRealTimeFilters();

        // Geolocalização
        this.setupGeolocation();
    }

    setupTransportTypeTabs() {
        const tabs = document.querySelectorAll('.transport-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const type = tab.dataset.type;
                this.switchTransportType({ target: { dataset: { type } } });
            });
        });
    }

    setupRealTimeFilters() {
        // Filtros que atualizam em tempo real
        const realTimeInputs = [
            'endereco', 'raio', 'capacidade', 'faixa-preco'
        ];

        realTimeInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', this.debounce(() => {
                    this.aplicarFiltros();
                }, 500));
            }
        });

        // Checkboxes
        document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.aplicarFiltros());
        });
    }

    setupGeolocation() {
        const enderecoInput = document.getElementById('endereco');
        if (enderecoInput && navigator.geolocation) {
            const geoButton = document.createElement('button');
            geoButton.type = 'button';
            geoButton.className = 'btn btn-outline btn-small';
            geoButton.textContent = 'Usar minha localizacao';
            geoButton.style.marginTop = '0.5rem';
            
            geoButton.addEventListener('click', () => this.getCurrentLocation());
            enderecoInput.parentNode.appendChild(geoButton);
        }
    }

    getCurrentLocation() {
        this.showLoading('Obtendo sua localização...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.handleGeolocationSuccess(latitude, longitude);
            },
            (error) => {
                this.hideLoading();
                this.showError('Não foi possível obter sua localização. Verifique as permissões do navegador.');
                console.error('Erro de geolocalização:', error);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    handleGeolocationSuccess(lat, lng) {
        this.userCoords = [lat, lng];
        const enderecoEl = document.getElementById('endereco');
        if (enderecoEl) {
            enderecoEl.value = 'Minha localização';
        }
        if (window.mapsIntegration) {
            window.mapsIntegration.userLocation = [lat, lng];
            if (typeof window.mapsIntegration.setUserLocationMarker === 'function') {
                window.mapsIntegration.setUserLocationMarker([lat, lng]);
            }
            if (window.mapsIntegration.map?.setView) {
                window.mapsIntegration.map.setView([lat, lng], 14);
            }
        }
        this.hideLoading();
        this.showSuccess('Localização obtida com sucesso!');
        this.aplicarFiltros();
    }
    setupFormValidation() {
        const form = document.querySelector('.filters-container');
        if (!form) return;

        // Validação de campos obrigatórios
        const requiredFields = ['endereco'];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(field));
                field.addEventListener('input', () => this.clearFieldError(field));
            }
        });

        // Validação de números
        const numberFields = ['raio'];
        numberFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.validateNumberField(field));
            }
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.placeholder || field.id;

        if (!value) {
            this.showFieldError(field, `${fieldName} é obrigatório`);
            return false;
        }

        if (field.id === 'endereco' && value.length < 3) {
            this.showFieldError(field, 'Endereço deve ter pelo menos 3 caracteres');
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    validateNumberField(field) {
        const value = parseFloat(field.value);
        const min = parseFloat(field.min) || 0;
        const max = parseFloat(field.max) || Infinity;

        if (isNaN(value) || value < min || value > max) {
            this.showFieldError(field, `Valor deve estar entre ${min} e ${max}`);
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.color = '#c53030';
        errorDiv.style.fontSize = '0.8rem';
        errorDiv.style.marginTop = '0.25rem';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
        field.style.borderColor = '#c53030';
    }

    clearFieldError(field) {
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
        field.style.borderColor = '';
    }

    switchTransportType(e) {
        const type = e.target.dataset.type;
        if (!type) return;

        this.currentTransportType = type;
        this.stopRealtimeStream();
        
        // Mostrar/ocultar grupos de filtros específicos
        this.toggleFilterGroups(type);
        
        // Recarregar resultados
        this.loadInitialResults();
    }

    toggleFilterGroups(type) {
        // Grupos de filtros para transporte escolar
        const escolarFilters = document.getElementById('escolar-filters');
        // Grupos de filtros para excursão
        const excursaoFilters = document.getElementById('excursao-filters');
        

        
        if (type === 'escolar') {
            // Mostrar filtros escolares
            if (escolarFilters) {
                escolarFilters.classList.remove('hidden');
                escolarFilters.style.display = 'grid';
            }
            
            // Ocultar filtros de excursão
            if (excursaoFilters) {
                excursaoFilters.classList.add('hidden');
                excursaoFilters.style.display = 'none';
            }
        } else if (type === 'excursao') {
            // Mostrar filtros de excursão
            if (excursaoFilters) {
                excursaoFilters.classList.remove('hidden');
                excursaoFilters.style.display = 'grid';
            }
            
            // Ocultar filtros escolares
            if (escolarFilters) {
                escolarFilters.classList.add('hidden');
                escolarFilters.style.display = 'none';
            }
        }
        
        // Limpar filtros aplicados quando trocar de tipo
        this.clearAppliedFilters();
    }

    clearAppliedFilters() {
        // Limpar filtros aplicados visualmente
        const appliedFiltersSection = document.getElementById('applied-filters-section');
        if (appliedFiltersSection) {
            appliedFiltersSection.style.display = 'none';
        }
        
        const container = document.getElementById('applied-filters-container');
        if (container) {
            container.innerHTML = '';
        }
        
        // Limpar o Map de filtros aplicados
        if (this.appliedFilters) {
            this.appliedFilters.clear();
        }
        
        // Reset dos formulários dos modais
        this.resetAllFilterModals();
    }

    resetAllFilterModals() {
        // Lista de todos os modais de filtro
        const modalIds = [
            'Localização-modal', 'horarios-escolar-modal', 'idade-modal', 'escola-modal', 
            'caracteristicas-escolar-modal', 'capacidade-modal', 'preco-modal',
            'destino-modal', 'duracao-modal', 'tipo-excursao-modal', 'caracteristicas-excursao-modal'
        ];
        
        modalIds.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                // Reset de inputs de texto
                modal.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]').forEach(input => {
                    input.value = '';
                });
                
                // Reset de selects
                modal.querySelectorAll('select').forEach(select => {
                    select.selectedIndex = 0;
                });
                
                // Reset de checkboxes
                modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
                
                // Reset de radio buttons
                modal.querySelectorAll('input[type="radio"]').forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }

    async buscarTransportes() {
        if (this.isLoading) return;

        if (!this.validateForm()) {
            this.showError('Por favor, corrija os erros no formulario antes de buscar.');
            return;
        }

        this.setMapState('loading', 'Buscando transportes...');
        this.showLoading('Buscando transportes...');

        try {
            const data = await this.fetchRotasFromApi();
            const rotas = data.rotas || [];

            this.currentResults = rotas.map((r) => this.mapRouteToResult(r));
            this.filteredResults = this.aplicarFiltrosLocais(this.currentResults);
            this.currentPage = 1;
            this.loadResults();

            await this.loadActiveVehicles();
            this.updateMapMarkersFromApi(this.filteredResults, this.filterActiveVehicles(this.activeVehicles));
            this.ensureRealtimeStream();

            this.hideLoading();
            this.setMapState(this.filteredResults.length ? 'ready' : 'empty');
            this.showSuccess(`${this.filteredResults.length} transportes encontrados!`);
        } catch (error) {
            this.hideLoading();
            this.setMapState('error', 'Erro ao buscar transportes');
            this.showError('Erro ao buscar transportes. Tente novamente.');
            console.error('Erro na busca:', error);
        }
    }

    validateForm() {
        const endereco = document.getElementById('endereco');
        const raio = document.getElementById('raio');
        
        let isValid = true;
        
        if (endereco && !this.userCoords && !this.validateField(endereco)) {
            isValid = false;
        }
        
        if (raio && raio.value && !this.validateNumberField(raio)) {
            isValid = false;
        }

        return isValid;
    }

    async fetchRotasFromApi() {
        const filtros = this.obterFiltrosParaApi();
        return this.gateway.buscarRotas(filtros);
    }

    obterFiltrosParaApi() {
        const transportType = this.currentTransportType || 'escolar';
        const endereco = document.getElementById('endereco')?.value || '';
        const raio = parseFloat(document.getElementById('raio')?.value) || 10;
        const turno = document.getElementById('turno-escolar')?.value || document.getElementById('turno')?.value || '';
        const escola = document.getElementById('nome-escola')?.value || '';
        const capacidade = document.getElementById('capacidade')?.value || '';
        const precoMax = document.getElementById('preco-max')?.value || '';
        const idadeMin = document.getElementById('idade-min')?.value || '';
        const idadeMax = document.getElementById('idade-max')?.value || '';
        const caracteristicasSelecionadas = this.obterCaracteristicasSelecionadas();

        // Tentar usar geolocalização atual do mapa
        const coords = this.userCoords || window.mapsIntegration?.userLocation || [null, null];
        const lat = coords[0];
        const lng = coords[1];

        return {
            tipo_rota: transportType === 'escolar' ? 'escolar' : 'excursao',
            tipo: transportType === 'escolar' ? 'escolar' : 'excursao',
            escola: escola.trim(),
            turno: turno.trim(),
            valor_max: precoMax ? parseFloat(precoMax) : '',
            idade_min: idadeMin,
            idade_max: idadeMax,
            capacidade: capacidade,
            caracteristicas: caracteristicasSelecionadas,
            latitude: lat,
            longitude: lng,
            raio_km: raio,
            raio: raio,
            endereco: endereco.trim(),
            page: this.currentPage || 1,
            limit: this.resultsPerPage || 10,
        };
    }

    mapRouteToResult(rota = {}) {
        const rotaPublica = rota.rota || {};
        const horarioIda = rota.horario_ida || rotaPublica.horarioIda;
        const horarioVolta = rota.horario_volta || rotaPublica.horarioVolta;
        const horarioTurno = rota.turno || rotaPublica.turno || rota.dias_semana || '-';
        const horario = (horarioIda && horarioVolta)
            ? `${horarioIda} - ${horarioVolta}`
            : horarioTurno;
        const capacidadeRaw = rota.capacidade_maxima || rota.capacidade || rota.capacidade_atual || rota.veiculo?.capacidade;
        const capacidadeLabel = capacidadeRaw
            ? `At\u00e9 ${capacidadeRaw} crian\u00e7as`
            : '-';
        const precoValor = rota.valor_mensal || rota.preco || rota.preco_mensal || rotaPublica.precoMensal || null;
        const precoLabel = precoValor
            ? `R$ ${precoValor}/m\u00eas`
            : (rota.preco ? `R$ ${rota.preco}` : '-');
        const caracteristicasList = Array.isArray(rota.caracteristicas)
            ? rota.caracteristicas
            : Array.isArray(rotaPublica.caracteristicas)
                ? rotaPublica.caracteristicas
                : Object.entries(rota.veiculo?.caracteristicas || {}).filter(([, v]) => v).map(([k]) => k);

        const lat = rota.latitude_origem || rota.latitude || rota.localizacao?.latitude || null;
        const lng = rota.longitude_origem || rota.longitude || rota.localizacao?.longitude || null;

        return {
            id: rota.id,
            nome: rota.nome_rota || rota.nome || rotaPublica.nome || 'Rota escolar',
            tipo: rota.tipo_rota || rota.tipo || this.currentTransportType || 'escolar',
            avaliacao: rota.media_avaliacoes || rota.avaliacao || 4.7,
            avaliacoes: rota.total_avaliacoes || 0,
            distancia: rota.distancia_km ? `${rota.distancia_km} km` : '-',
            capacidade: capacidadeLabel,
            horario,
            preco: precoLabel,
            caracteristicas: Array.isArray(caracteristicasList) ? caracteristicasList.join(', ') : (rota.features || rota.dias_semana || 'Rastreamento GPS'),
            faixaEtaria: rota.faixa_etaria || rota.faixa_etaria_atendida || '',
            escolas: rota.escola_destino || rota.escola || rotaPublica.escola || rota.escolas_atendidas || '',
            latitude: lat,
            longitude: lng,
            turno: rota.turno || rotaPublica.turno || '',
            vagaDisponivel: rota.vagas_disponiveis,
            raw: rota
        };
    }

    aplicarFiltrosLocais(lista = []) {
        const filtros = this.obterFiltros();
        if (!filtros) return lista;
        return lista.filter(item => this.aplicarFiltroItem(item, filtros));
    }


    async loadInitialResults() {
        try {
            await this.buscarTransportes();
        } catch (e) {
            // Fallback suave em caso de erro: usar dados mock para não quebrar a UI
            console.warn('Falha na busca inicial, usando mock temporário:', e?.message || e);
            this.currentResults = this.currentTransportType === 'escolar' 
                ? this.gerarResultadosEscolares() 
                : this.gerarResultadosExcursoes();
            this.filteredResults = this.aplicarFiltrosLocais(this.currentResults);
            this.loadResults();
            await this.loadActiveVehicles();
            this.updateMapMarkersFromApi(this.filteredResults, this.filterActiveVehicles(this.activeVehicles));
            this.setMapState(this.filteredResults.length ? 'ready' : 'empty');
        }
    }

    async aplicarFiltros() {
        if (this.isLoading) return;

        try {
            const data = await this.fetchRotasFromApi();
            const rotas = data.rotas || [];

            // Atualiza lista
            this.currentResults = rotas.map((r) => this.mapRouteToResult(r));
            this.filteredResults = this.aplicarFiltrosLocais(this.currentResults);
            this.currentPage = 1;
            this.loadResults();

            await this.loadActiveVehicles();
            this.updateMapMarkersFromApi(this.filteredResults, this.filterActiveVehicles(this.activeVehicles));
            this.setMapState(this.filteredResults.length ? 'ready' : 'empty');

            this.updateResultsCount();
        } catch (e) {
            console.warn('Falha ao aplicar filtros (API):', e);
        }
    }

    obterFiltros() {
        return {
            endereco: document.getElementById('endereco')?.value.toLowerCase() || '',
            raio: parseFloat(document.getElementById('raio')?.value) || 50,
            capacidade: document.getElementById('capacidade')?.value || '',
            faixaPreco: document.getElementById('faixa-preco')?.value || '',
            turno: document.getElementById('turno-escolar')?.value || document.getElementById('turno')?.value || '',
            idadeMin: document.getElementById('idade-min')?.value || '',
            idadeMax: document.getElementById('idade-max')?.value || '',
            escola: document.getElementById('nome-escola')?.value?.toLowerCase() || '',
            caracteristicas: this.obterCaracteristicasSelecionadas()
        };
    }

    obterCaracteristicasSelecionadas() {
        const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.id);
    }

    aplicarFiltroItem(resultado, filtros) {
        const checks = [];

        if (filtros.capacidade) {
            const capacidadeNumero = this.extrairNumeroCapacidade(resultado.capacidade);
            const atende = this.verificarCapacidade(capacidadeNumero, filtros.capacidade);
            checks.push(atende);
            if (!atende && this.matchMode === 'AND') return false;
        }

        if (filtros.faixaPreco) {
            const precoNumero = this.extrairNumeroPreco(resultado.preco);
            const atende = this.verificarPreco(precoNumero, filtros.faixaPreco);
            checks.push(atende);
            if (!atende && this.matchMode === 'AND') return false;
        }

        if (filtros.turno) {
            const horario = (resultado.horario || '').toLowerCase();
            const turnoItem = (resultado.turno || '').toLowerCase();
            const alvo = filtros.turno.toLowerCase();
            const horarioAtende = horario && horario.includes(alvo);
            const turnoAtende = turnoItem && turnoItem.includes(alvo);
            const atende = horarioAtende || turnoAtende;
            checks.push(atende);
            if (!atende && this.matchMode === 'AND') return false;
        }

        if (filtros.idadeMin || filtros.idadeMax) {
            const faixa = resultado.faixaEtaria || resultado.faixaEtariaAtendida || '';
            const idadeRange = this.extrairFaixaEtaria(faixa);
            const min = filtros.idadeMin ? Number(filtros.idadeMin) : null;
            const max = filtros.idadeMax ? Number(filtros.idadeMax) : null;
            const atende =
                (min === null || idadeRange.min === null || idadeRange.min >= min) &&
                (max === null || idadeRange.max === null || idadeRange.max <= max);
            checks.push(atende);
            if (!atende && this.matchMode === 'AND') return false;
        }

        if (filtros.escola) {
            const escolas = (resultado.escolas || resultado.escola || '').toLowerCase();
            const atende = escolas ? escolas.includes(filtros.escola.toLowerCase()) : false;
            checks.push(atende);
            if (!atende && this.matchMode === 'AND') return false;
        }

        if (filtros.caracteristicas.length > 0) {
            const caracteristicasItem = (resultado.caracteristicas || '').toLowerCase();
            const temCaracteristica = filtros.caracteristicas.some(carac =>
                caracteristicasItem.includes(this.mapearCaracteristica(carac))
            );
            checks.push(temCaracteristica);
            if (!temCaracteristica && this.matchMode === 'AND') return false;
        }

        const avaliados = checks.filter(v => v !== undefined);
        if (!avaliados.length) return true;
        return this.matchMode === 'OR'
            ? avaliados.some(Boolean)
            : avaliados.every(Boolean);
    }

    extrairNumeroCapacidade(capacidadeStr) {
        const match = capacidadeStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    extrairNumeroPreco(precoStr) {
        const match = precoStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    verificarCapacidade(capacidade, faixa) {
        const ranges = {
            '1-15': [1, 15],
            '16-30': [16, 30],
            '31-50': [31, 50],
            '50+': [50, Infinity]
        };
        
        const range = ranges[faixa];
        return range && capacidade >= range[0] && capacidade <= range[1];
    }

    extrairFaixaEtaria(faixaStr = '') {
        const match = faixaStr.match(/(\d+)\s*[-a]\s*(\d+)/);
        if (match) {
            return { min: Number(match[1]), max: Number(match[2]) };
        }
        return { min: null, max: null };
    }

    extrairFaixaEtaria(faixaStr = '') {
        const match = faixaStr.match(/(\d+)\s*[-a]\s*(\d+)/);
        if (match) {
            return { min: Number(match[1]), max: Number(match[2]) };
        }
        return { min: null, max: null };
    }

    extrairFaixaEtaria(faixaStr = '') {
        const match = faixaStr.match(/(\d+)\s*[-a]\s*(\d+)/);
        if (match) {
            return { min: Number(match[1]), max: Number(match[2]) };
        }
        return { min: null, max: null };
    }

    verificarPreco(preco, faixa) {
        const ranges = {
            '0-100': [0, 100],
            '100-200': [100, 200],
            '200-500': [200, 500],
            '500+': [500, Infinity]
        };
        
        const range = ranges[faixa];
        return range && preco >= range[0] && preco <= range[1];
    }

    mapearCaracteristica(id) {
        const mapeamento = {
            'ar-condicionado': 'ar-condicionado',
            'wifi': 'wi-fi',
            'acessibilidade': 'acessibilidade',
            'seguro': 'seguro'
        };
        return mapeamento[id] || id;
    }

    ordenarResultados() {
        const ordenacao = document.getElementById('ordenacao')?.value;
        if (!ordenacao) return;

        this.filteredResults.sort((a, b) => {
            switch (ordenacao) {
                case 'preco-menor':
                    return this.extrairNumeroPreco(a.preco) - this.extrairNumeroPreco(b.preco);
                case 'preco-maior':
                    return this.extrairNumeroPreco(b.preco) - this.extrairNumeroPreco(a.preco);
                case 'avaliacao':
                    return b.avaliacao - a.avaliacao;
                case 'distancia':
                    return parseFloat(a.distancia) - parseFloat(b.distancia);
                default:
                    return 0;
            }
        });

        this.loadResults();
    }

    loadResults() {
        const container = document.getElementById('results-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.filteredResults.length === 0) {
            this.showNoResults(container);
            return;
        }

        // Implementar paginação
        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = startIndex + this.resultsPerPage;
        const pageResults = this.filteredResults.slice(startIndex, endIndex);

        pageResults.forEach((resultado, index) => {
            const card = this.criarCardResultado(resultado);
            card.classList.add('fade-in');
            card.style.animationDelay = `${index * 0.1}s`;
            container.appendChild(card);
        });

        this.updateResultsCount();
        this.createPagination();
    }

    showNoResults(container) {
        container.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 3rem; color: #666;">
                <h3>?? Nenhum transporte encontrado</h3>
                <p>Tente ajustar os filtros de busca para encontrar mais opções.</p>
                <button class="btn btn-primary" onclick="transporteFinder.limparFiltros()">
                    Limpar Filtros
                </button>
            </div>
        `;
    }

    updateResultsCount() {
        const countElement = document.getElementById('results-count');
        if (countElement) {
            const total = this.filteredResults.length;
            const texto = total === 1 ? 'transporte encontrado' : 'transportes encontrados';
            countElement.textContent = `${total} ${texto}`;
        }
    }

    createPagination() {
        const totalPages = Math.ceil(this.filteredResults.length / this.resultsPerPage);
        if (totalPages <= 1) return;

        const container = document.getElementById('results-list');
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        paginationDiv.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 2rem;
            padding: 1rem;
        `;

        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.className = `btn ${i === this.currentPage ? 'btn-primary' : 'btn-outline'}`;
            button.style.minWidth = '40px';
            
            button.addEventListener('click', () => {
                this.currentPage = i;
                this.loadResults();
            });
            
            paginationDiv.appendChild(button);
        }

        container.appendChild(paginationDiv);
    }

    limparFiltros() {
        // Limpar todos os inputs
        document.querySelectorAll('.filter-option input, .filter-option select').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });

        // Resetar valores padrão
        const raioInput = document.getElementById('raio');
        if (raioInput) raioInput.value = '10';

        // Limpar erros
        document.querySelectorAll('.field-error').forEach(error => error.remove());
        document.querySelectorAll('input, select').forEach(field => {
            field.style.borderColor = '';
        });

        // Limpar filtros aplicados visualmente
        this.clearAppliedFilters();
        
        // Limpar filtros no FilterModalController se existir
        if (window.filterModalController) {
            window.filterModalController.clearAllFilters();
        }

        // Recarregar resultados
        this.currentPage = 1;
        this.loadInitialResults();
        this.showSuccess('Filtros limpos com sucesso!');
    }

    async loadActiveVehicles() {
        try {
            const lista = await this.gateway.listarAtivos(this.currentTransportType);
            this.activeVehicles = this.mapActiveVehicles(lista);
            if (window.APP_CONFIG?.demoMode) {
                this.startDemoMovement();
            }
            return this.activeVehicles;
        } catch (error) {
            console.warn('Falha ao carregar transportes ativos, mantendo/demo:', error);
            if (!this.activeVehicles.length) {
                this.activeVehicles = this.generateDemoActiveVehicles();
            }
            this.startDemoMovement();
            return this.activeVehicles;
        }
    }

    mapActiveVehicles(lista = []) {
        return (lista || []).map((item, idx) => ({
            id: item.id || `ativo-${idx}`,
            nome: item.nome || item.label || 'Transporte ativo',
            tipo: item.tipo || this.currentTransportType || 'escolar',
            latitude: item.latitude ? Number(item.latitude) : null,
            longitude: item.longitude ? Number(item.longitude) : null,
            preco: item.preco || item.valor_mensal,
            capacidade: item.capacidade || item.capacidade_maxima,
            avaliacao: item.avaliacao || item.avaliacao_media,
            disponibilidade: item.disponibilidade || item.status || 'em_rota',
            timestamp: item.timestamp || item.timestamp_localizacao || Date.now(),
            features: item.caracteristicas || item.features || 'rastreamento gps'
        })).filter(v => v.latitude && v.longitude);
    }

    generateDemoActiveVehicles() {
        const base = window.mapsIntegration?.userLocation || [-23.5505, -46.6333];
        return [
            { id: 'demo-esc-1', nome: 'Van Azul - Zona Norte', tipo: 'escolar', latitude: base[0] + 0.01, longitude: base[1] + 0.01, capacidade: 20, preco: 480, status: 'embarque' },
            { id: 'demo-esc-2', nome: 'Circuito Leste', tipo: 'escolar', latitude: base[0] - 0.012, longitude: base[1] + 0.006, capacidade: 18, preco: 420, status: 'em_rota' },
            { id: 'demo-exc-1', nome: 'Excursao Serra', tipo: 'excursao', latitude: base[0] + 0.02, longitude: base[1] - 0.008, capacidade: 40, preco: 150, status: 'embarque' }
        ];
    }

    startDemoMovement() {
        if (!window.APP_CONFIG?.demoMode) return;
        if (!this.demoEvents.length) {
            this.demoEvents = [
                { tipo: 'embarque', mensagem: 'Embarque registrado (demo)' },
                { tipo: 'rastreamento_demo', mensagem: 'Veiculo em rota (demo)' },
                { tipo: 'atraso', mensagem: 'Atraso de 5 min (demo)' },
                { tipo: 'desembarque', mensagem: 'Desembarque confirmado (demo)' }
            ];
        }

        if (this.demoTimer) {
            clearInterval(this.demoTimer);
        }

        this.demoTimer = setInterval(() => {
            this.activeVehicles = this.activeVehicles.map((v, idx) => {
                const jitter = (Math.random() - 0.5) * 0.008;
                return {
                    ...v,
                    latitude: Number(v.latitude || 0) + jitter,
                    longitude: Number(v.longitude || 0) + jitter,
                    status: this.demoEvents[idx % this.demoEvents.length]?.tipo || v.status || 'em_rota'
                };
            });

            const evento = this.demoEvents.shift();
            if (evento) {
                this.showSuccess(evento.mensagem || evento.tipo);
                this.demoEvents.push(evento);
            }

            this.updateMapMarkersFromApi(this.filteredResults, this.filterActiveVehicles(this.activeVehicles));
        }, window.APP_CONFIG?.demoMode ? 7500 : 12000);
    }

    ensureRealtimeStream() {
        if (this.realtimeStopper) return;
        if (window.mapsIntegration?.setRealtimeBadge) {
            window.mapsIntegration.setRealtimeBadge(window.APP_CONFIG?.demoMode ? 'DEMO' : 'Tempo real');
        }
        this.realtimeStopper = this.gateway.streamAtivos(
            this.currentTransportType,
            (lista) => {
                this.activeVehicles = this.mapActiveVehicles(lista);
                this.updateMapMarkersFromApi(this.filteredResults, this.filterActiveVehicles(this.activeVehicles));
            },
            (err) => console.warn('Falha no tempo real de ativos:', err)
        );
    }

    stopRealtimeStream() {
        if (this.realtimeStopper) {
            this.realtimeStopper();
            this.realtimeStopper = null;
        }
    }

    filterActiveVehicles(list = []) {
        const filtros = this.obterFiltros?.() || null;
        if (!filtros) return list;
        return list.filter(v => {
            const pseudo = {
                capacidade: v.capacidade ? `Ate ${v.capacidade}` : (v.disponibilidade || v.capacidade_maxima || ''),
                preco: v.preco ? `R$ ${v.preco}` : (v.valor_mensal ? `R$ ${v.valor_mensal}` : ''),
                caracteristicas: (v.caracteristicas || v.features || 'rastreamento gps').toString().toLowerCase(),
                horario: '',
                escolas: '',
                faixaEtaria: ''
            };
            try {
                return this.aplicarFiltroItem(pseudo, filtros);
            } catch (_) {
                return true;
            }
        });
    }

    updateMapMarkersFromApi(rotas, vehicles = []) {
        try {
            if (!window.mapsIntegration) return;
            window.mapsIntegration.clearMarkers();
            const baseLatLng = window.mapsIntegration?.userLocation || [-23.5505, -46.6333];

            const transports = (rotas || []).map((r, idx) => {
                const raw = r.raw || {};
                const lat = r.latitude ?? r.latitude_origem ?? raw.latitude_origem ?? raw.latitude;
                const lng = r.longitude ?? r.longitude_origem ?? raw.longitude_origem ?? raw.longitude;

                let position = null;
                if (lat && lng) {
                    position = [Number(lat), Number(lng)];
                } else if (window.APP_CONFIG?.demoMode) {
                    const jitter = 0.01 * (idx + 1);
                    position = [baseLatLng[0] + jitter, baseLatLng[1] + jitter];
                }

                const priceValue = r.preco || r.valor_mensal || raw.valor_mensal || r.preco_base;
                const capacityValue = r.capacidade || r.capacidade_maxima || raw.capacidade_maxima;

                return {
                    id: r.id || raw.id || `demo-${idx}`,
                    name: r.nome || r.nome_rota || raw.nome_rota || 'Rota escolar',
                    type: r.tipo || r.tipo_rota || this.currentTransportType || 'escolar',
                    position,
                    rating: r.avaliacao || r.media_avaliacoes || raw.media_avaliacoes || 4.7,
                    reviews: r.avaliacoes || r.total_avaliacoes || raw.total_avaliacoes || 0,
                    price: priceValue ? `R$ ${priceValue}${(r.valor_mensal || raw.valor_mensal) ? '/mes' : ''}` : '-',
                    capacity: capacityValue ? `Ate ${capacityValue}` : '-',
                    features: [r.caracteristicas || r.features || raw.caracteristicas || 'Rastreamento GPS']
                };
            }).filter(t => Array.isArray(t.position));

            const filteredVehicles = this.filterActiveVehicles(vehicles);
            const vehicleMarkers = filteredVehicles.map((v, idx) => ({
                id: v.id || `veh-${idx}`,
                name: v.nome || 'Transporte ativo',
                type: v.tipo || 'escolar',
                position: (v.latitude && v.longitude) ? [Number(v.latitude), Number(v.longitude)] : null,
                rating: v.avaliacao || v.avaliacao_media || 4.7,
                reviews: v.reviews || v.total_avaliacoes || 0,
                price: v.preco ? `R$ ${v.preco}` : (v.valor_mensal ? `R$ ${v.valor_mensal}/mes` : '-'),
                capacity: v.capacidade ? `Ate ${v.capacidade} passageiros` : (v.disponibilidade || '-'),
                availability: v.disponibilidade || v.status || '-',
                features: [v.features || v.caracteristicas || 'Localizacao em tempo real']
            })).filter(t => Array.isArray(t.position));

            [...transports, ...vehicleMarkers].forEach(t => window.mapsIntegration.addTransportMarker(t));
            const totalMarkers = transports.length + vehicleMarkers.length;
            if (totalMarkers > 0) {
                window.mapsIntegration.centerOnResults();
                this.setMapState('ready');
            } else {
                this.setMapState('empty', 'Nenhum transporte no momento');
            }
        } catch (e) {
            console.warn('Falha ao atualizar marcadores do mapa:', e);
            this.setMapState('error', 'Erro ao atualizar mapa');
        }
    }

    criarCardResultado(resultado) {
        const card = document.createElement('div');
        card.className = 'transport-card';
        
        const badgeClass = resultado.tipo === 'escolar' ? 'badge-escolar' : 'badge-excursao';
        const badgeText = resultado.tipo === 'escolar' ? 'Transporte Escolar' : 'Excursão & Fretamento';
        
        card.innerHTML = `
            <div class="card-header">
                <div class="provider-info">
                    <h4>${resultado.nome}</h4>
                    <div class="provider-rating">
                        <span>? ${resultado.avaliacao}</span>
                        <span>(${resultado.avaliacoes} avaliações)</span>
                    </div>
                </div>
                <div class="transport-type-badge ${badgeClass}">
                    ${badgeText}
                </div>
            </div>
            
            <div class="card-details">
                <div class="detail-item">
                    <span>??</span>
                    <span>${resultado.distancia}</span>
                </div>
                <div class="detail-item">
                    <span>??</span>
                    <span>${resultado.capacidade}</span>
                </div>
                <div class="detail-item">
                    <span>?</span>
                    <span>${resultado.horario}</span>
                </div>
                <div class="detail-item">
                    <span>??</span>
                    <span>${resultado.preco}</span>
                </div>
                <div class="detail-item">
                    <span>?</span>
                    <span>${resultado.caracteristicas}</span>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn btn-outline" onclick="transporteFinder.verDetalhes('${resultado.nome}')">
                    Ver Detalhes
                </button>
                <button class="btn btn-primary" onclick="transporteFinder.entrarEmContato('${resultado.nome}')">
                    Entrar em Contato
                </button>
            </div>
        `;
        
        return card;
    }

    verDetalhes(nome) {
        this.showSuccess(`Abrindo detalhes de: ${nome}`);
        // Implementar modal ou redirecionamento para página de detalhes
    }

    entrarEmContato(nome) {
        this.showSuccess(`Iniciando contato com: ${nome}`);
        // Implementar modal de contato ou redirecionamento
    }

    // Dados de exemplo
    gerarResultadosEscolares() {
        return [
            {
                nome: 'Transporte Escolar São João',
                tipo: 'escolar',
                avaliacao: 4.8,
                avaliacoes: 127,
                distancia: '2.3 km',
                capacidade: 'Até 25 crianças',
                horario: '07:00 - 18:00',
                preco: 'R$ 180/mês',
                caracteristicas: 'Ar-condicionado, Seguro'
            },
            {
                nome: 'Van Escolar Alegria',
                tipo: 'escolar',
                avaliacao: 4.6,
                avaliacoes: 89,
                distancia: '3.1 km',
                capacidade: 'Até 15 crianças',
                horario: '06:30 - 17:30',
                preco: 'R$ 150/mês',
                caracteristicas: 'Ar-condicionado, Wi-Fi'
            },
            {
                nome: 'Transporte Seguro Kids',
                tipo: 'escolar',
                avaliacao: 4.9,
                avaliacoes: 203,
                distancia: '1.8 km',
                capacidade: 'Até 30 crianças',
                horario: '07:15 - 18:15',
                preco: 'R$ 200/mês',
                caracteristicas: 'Ar-condicionado, Wi-Fi, Seguro, Acessibilidade'
            }
        ];
    }

    gerarResultadosExcursoes() {
        return [
            {
                nome: 'Excursões Aventura',
                tipo: 'excursao',
                avaliacao: 4.9,
                avaliacoes: 203,
                distancia: '1.8 km',
                capacidade: 'Até 45 pessoas',
                horario: 'Flexível',
                preco: 'R$ 80/pessoa/dia',
                caracteristicas: 'Ar-condicionado, Wi-Fi, Seguro'
            },
            {
                nome: 'Turismo & Fretamento Silva',
                tipo: 'excursao',
                avaliacao: 4.7,
                avaliacoes: 156,
                distancia: '4.2 km',
                capacidade: 'Até 50 pessoas',
                horario: '24h disponível',
                preco: 'R$ 120/pessoa/dia',
                caracteristicas: 'Ar-condicionado, Wi-Fi, Banheiro'
            }
        ];
    }

    // Utilitários
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    setMapState(state, message = '') {
        if (window.mapsIntegration?.setStatus) {
            window.mapsIntegration.setStatus(state, message);
        }
    }

    showLoading(message = 'Carregando...') {
        this.isLoading = true;
        
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    hideLoading() {
        this.isLoading = false;
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const className = type === 'error' ? 'error-message' : 'success-message';
        const icon = type === 'error' ? '?' : '?';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = className;
        messageDiv.innerHTML = `${icon} ${message}`;
        
        // Inserir no topo da página
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(messageDiv, main.firstChild);
            
            // Remover após 5 segundos
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }
}

// ===== CONTROLE DOS MODAIS DE FILTROS =====
class FilterModalController {
    constructor() {
        console.log('Inicializando FilterModalController...');
        this.appliedFilters = new Map(); // Armazena os filtros aplicados
        this.init();
        console.log('FilterModalController configurado com sucesso');
    }

    init() {
        this.setupModalTriggers();
        this.setupModalClosers();
        this.setupKeyboardNavigation();
        this.setupClearAllButton();
    }

    setupModalTriggers() {
        // Botões para abrir modais
        const modalButtons = document.querySelectorAll('.filter-modal-btn');
        modalButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const modalId = button.getAttribute('data-modal');
                this.openModal(modalId);
            });
        });
    }

    setupModalClosers() {
        // Botões de fechar modais (X)
        const closeButtons = document.querySelectorAll('.close-filter-modal');
        console.log('Encontrados', closeButtons.length, 'botões de fechar');
        
        closeButtons.forEach((button, index) => {
            console.log('Configurando botão', index, button);
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clique no botão de fechar detectado');
                const modal = button.closest('.filter-modal');
                if (modal) {
                    console.log('Fechando modal via botão X:', modal.id);
                    this.closeModal(modal.id);
                } else {
                    console.log('Modal não encontrado para o botão');
                }
            });
        });

        // Fechar modal clicando no overlay
        const modals = document.querySelectorAll('.filter-modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('Fechando modal via overlay:', modal.id);
                    this.closeModal(modal.id);
                }
            });
        });

        // Botões "Cancelar" dos modais
        const cancelButtons = document.querySelectorAll('.close-filter-modal');
        cancelButtons.forEach(button => {
            if (button.textContent.includes('Cancelar')) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const modal = button.closest('.filter-modal');
                    if (modal) {
                        console.log('Fechando modal via Cancelar:', modal.id);
                        this.closeModal(modal.id);
                    }
                });
            }
        });

        // Botões "Aplicar" dos modais
        const applyButtons = document.querySelectorAll('.apply-filter');
        applyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modal = button.closest('.filter-modal');
                if (modal) {
                    this.applyFilter(modal.id);
                }
            });
        });
    }

    setupKeyboardNavigation() {
        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.filter-modal:not(.hidden)');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
        });
    }

    setupClearAllButton() {
        const clearAllBtn = document.getElementById('clear-all-filters');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevenir scroll da página
            
            // Focar no primeiro elemento focável do modal
            const firstFocusable = modal.querySelector('input, select, button');
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }

            // Animar entrada
            setTimeout(() => {
                modal.style.opacity = '1';
            }, 10);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal && !modal.classList.contains('hidden')) {
            console.log('Fechando modal:', modalId);
            
            // Animar saída
            modal.style.opacity = '0';
            
            // Aguardar animação antes de esconder
            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.style.overflow = ''; // Restaurar scroll da página
                
                // Retornar foco para o botão que abriu o modal
                const triggerButton = document.querySelector(`[data-modal="${modalId}"]`);
                if (triggerButton) {
                    triggerButton.focus();
                }
                
                console.log('Modal fechado:', modalId);
            }, 300); // Tempo da animação CSS
        }
    }

    applyFilter(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const inputs = modal.querySelectorAll('input, select');
        const filters = {};
        
        inputs.forEach(input => {
            let value = '';
            
            if (input.type === 'checkbox' && input.checked) {
                value = input.nextElementSibling ? input.nextElementSibling.textContent.trim() : 'Selecionado';
            } else if (input.type !== 'checkbox' && input.value.trim()) {
                value = input.value.trim();
            }
            
            if (value) {
                filters[input.id] = {
                    label: this.getFieldLabel(input),
                    value: value,
                    type: this.getFilterType(modalId)
                };
            }
        });
        
        if (Object.keys(filters).length > 0) {
            this.appliedFilters.set(modalId, filters);
        } else {
            this.appliedFilters.delete(modalId);
        }
        
        this.updateFilterDisplay();
        this.closeModal(modalId);
    }

    getFieldLabel(input) {
        // Tentar encontrar o label associado
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
            return label.textContent.trim();
        }
        
        // Fallback: usar o placeholder ou id
        return input.placeholder || input.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    getFilterType(modalId) {
        const typeMap = {
            'Localização-modal': 'location',
            'horarios-modal': 'schedule',
            'datas-modal': 'schedule',
            'capacidade-modal': 'capacity',
            'caracteristicas-modal': 'features',
            'preco-modal': 'price'
        };
        return typeMap[modalId] || 'default';
    }

    updateFilterDisplay() {
        const section = document.getElementById('applied-filters-section');
        const container = document.getElementById('applied-filters-container');
        
        if (!section || !container) return;
        
        // Limpar container
        container.innerHTML = '';
        
        // Se não há filtros, esconder a seção
        if (this.appliedFilters.size === 0) {
            section.style.display = 'none';
            return;
        }
        
        // Mostrar a seção
        section.style.display = 'block';
        
        // Criar tags para cada filtro
        this.appliedFilters.forEach((filters, modalId) => {
            Object.entries(filters).forEach(([fieldId, filterInfo]) => {
                const tag = this.createFilterTag(modalId, fieldId, filterInfo);
                container.appendChild(tag);
            });
        });
    }

    createFilterTag(modalId, fieldId, filterInfo) {
        const tag = document.createElement('div');
        tag.className = `filter-tag ${filterInfo.type}`;
        tag.dataset.modalId = modalId;
        tag.dataset.fieldId = fieldId;
        
        tag.innerHTML = `
            <span class="filter-tag-label">${filterInfo.label}:</span>
            <span class="filter-tag-value">${filterInfo.value}</span>
            <button class="filter-tag-remove" onclick="window.filterModalController.removeFilter('${modalId}', '${fieldId}')" aria-label="Remover filtro">×</button>
        `;
        
        return tag;
    }

    removeFilter(modalId, fieldId) {
        const filters = this.appliedFilters.get(modalId);
        if (filters && filters[fieldId]) {
            delete filters[fieldId];
            
            // Se não há mais filtros para este modal, remover completamente
            if (Object.keys(filters).length === 0) {
                this.appliedFilters.delete(modalId);
            }
            
            // Limpar o campo no modal
            const input = document.getElementById(fieldId);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            }
            
            this.updateFilterDisplay();
            
            // Reaplica a busca sem este filtro
            if (window.transporteFinder) {
                window.transporteFinder.aplicarFiltros();
            }
        }
    }

    clearAllFilters() {
        // Limpar todos os filtros armazenados
        this.appliedFilters.clear();
        
        // Limpar todos os campos dos modais
        const modals = document.querySelectorAll('.filter-modal');
        modals.forEach(modal => {
            const inputs = modal.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            });
        });
        
        // Resetar valores padrão
        const raioInput = document.getElementById('raio');
        if (raioInput) raioInput.value = '10';
        
        this.updateFilterDisplay();
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando controladores...');
    window.transporteFinder = new TransporteFinder();
    window.filterModalController = new FilterModalController();
    console.log('FilterModalController inicializado:', window.filterModalController);
});

window.addEventListener('beforeunload', () => {
    if (window.transporteFinder?.stopRealtimeStream) {
        window.transporteFinder.stopRealtimeStream();
    }
});

// Funções globais para compatibilidade
function buscarTransportes() {
    window.transporteFinder?.buscarTransportes();
}

function limparFiltros() {
    window.transporteFinder?.limparFiltros();
}

function ordenarResultados() {
    window.transporteFinder?.ordenarResultados();
}





























