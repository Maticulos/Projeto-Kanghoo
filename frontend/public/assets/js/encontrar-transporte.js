/**
 * Funcionalidades da página Encontrar Transporte
 * Versão melhorada com validação, filtros avançados e UX aprimorada
 */

class TransporteFinder {
    constructor() {
        this.currentTransportType = 'escolar';
        this.currentResults = [];
        this.filteredResults = [];
        this.currentPage = 1;
        this.resultsPerPage = 10;
        this.isLoading = false;
        
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
            geoButton.innerHTML = '📍 Usar minha localização';
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
                this.reverseGeocode(latitude, longitude);
            },
            (error) => {
                this.hideLoading();
                this.showError('Não foi possível obter sua localização. Verifique as permissões do navegador.');
                console.error('Erro de geolocalização:', error);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    async reverseGeocode(lat, lng) {
        try {
            // Simulação de API de geocodificação reversa
            // Em produção, usar uma API real como Google Maps ou OpenStreetMap
            const mockAddress = `Rua Exemplo, ${Math.floor(Math.random() * 1000)}, São Paulo, SP`;
            
            setTimeout(() => {
                document.getElementById('endereco').value = mockAddress;
                this.hideLoading();
                this.showSuccess('Localização obtida com sucesso!');
                this.aplicarFiltros();
            }, 1000);
            
        } catch (error) {
            this.hideLoading();
            this.showError('Erro ao obter endereço da localização.');
            console.error('Erro na geocodificação reversa:', error);
        }
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
            'localizacao-modal', 'horarios-escolar-modal', 'idade-modal', 'escola-modal', 
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
            this.showError('Por favor, corrija os erros no formulário antes de buscar.');
            return;
        }

        this.showLoading('Buscando transportes...');

        try {
            const data = await this.fetchRotasFromApi();
            const transportes = data.rotas || [];

            // Mapear retorno da API pública para o formato interno
            this.currentResults = transportes.map(t => {
                // Determinar tipo baseado nos dados
                const tipo = t.tipo_servico?.toLowerCase().includes('escolar') ? 'escolar' : 
                            t.tipo_servico?.toLowerCase().includes('excursão') ? 'excursao' : 
                            t.rota ? 'escolar' : t.pacote ? 'excursao' : 'escolar';
                
                // Dados da rota (escolar)
                const rota = t.rota || {};
                // Dados do pacote (excursão)
                const pacote = t.pacote || {};
                
                // Características do veículo
                const caracteristicas = [];
                if (t.veiculo?.caracteristicas?.arCondicionado) caracteristicas.push('Ar-condicionado');
                if (t.veiculo?.caracteristicas?.wifi) caracteristicas.push('Wi-Fi');
                if (t.veiculo?.caracteristicas?.acessibilidade) caracteristicas.push('Acessibilidade');
                if (t.veiculo?.caracteristicas?.gps) caracteristicas.push('GPS');
                
                return {
                    id: t.id,
                    nome: rota.nome || pacote.nome || t.nome || 'Transporte',
                    tipo: tipo,
                    avaliacao: t.avaliacao || 0,
                    avaliacoes: t.totalAvaliacoes || 0,
                    distancia: t.distancia ? `${t.distancia} km` : '-',
                    capacidade: tipo === 'escolar' 
                        ? (rota.vagas ? `${rota.vagas} vagas` : (t.veiculo?.capacidade ? `Até ${t.veiculo.capacidade} lugares` : '-'))
                        : (pacote.vagas ? `${pacote.vagas} vagas` : (t.veiculo?.capacidade ? `Até ${t.veiculo.capacidade} pessoas` : '-')),
                    horario: tipo === 'escolar' 
                        ? (rota.horarioIda && rota.horarioVolta ? `${rota.horarioIda} - ${rota.horarioVolta}` : (rota.turno || '-'))
                        : (pacote.dataInicio ? `De ${pacote.dataInicio} a ${pacote.dataFim || pacote.dataInicio}` : '-'),
                    preco: tipo === 'escolar' 
                        ? (rota.precoMensal || '-')
                        : (pacote.precoPorPessoa || '-'),
                    caracteristicas: caracteristicas.length > 0 ? caracteristicas.join(', ') : 'Rastreamento GPS',
                    // Dados adicionais para o mapa
                    localizacao: t.localizacao,
                    rota: rota,
                    pacote: pacote
                };
            });

            this.filteredResults = [...this.currentResults];
            this.currentPage = data.page || 1;
            this.loadResults();

            // Atualizar o mapa com markers
            this.updateMapMarkersFromApi(transportes);

            this.hideLoading();
            const total = data.total || transportes.length;
            this.showSuccess(`${total} transportes encontrados!`);
        } catch (error) {
            this.hideLoading();
            this.showError('Erro ao buscar transportes. Tente novamente.');
            console.error('Erro na busca:', error);
        }
    }

    validateForm() {
        const endereco = document.getElementById('endereco');
        const raio = document.getElementById('raio');
        
        let isValid = true;
        
        if (endereco && !this.validateField(endereco)) {
            isValid = false;
        }
        
        if (raio && raio.value && !this.validateNumberField(raio)) {
            isValid = false;
        }

        return isValid;
    }

    async fetchRotasFromApi() {
        const filtros = this.obterFiltrosParaApi();
        const params = new URLSearchParams();

        // Mapear filtros para a API pública /api/public/transportes
        // Tipo: escolar, excursao, todos
        if (filtros.tipo_rota) {
            params.set('tipo', filtros.tipo_rota === 'escolar' ? 'escolar' : 
                           filtros.tipo_rota === 'excursao' ? 'excursao' : 'todos');
        } else {
            params.set('tipo', this.currentTransportType || 'todos');
        }
        
        // Localização
        if (filtros.endereco) params.set('endereco', filtros.endereco);
        if (filtros.cidade) params.set('cidade', filtros.cidade);
        if (filtros.bairro) params.set('bairro', filtros.bairro);
        
        // Proximidade geográfica
        if (filtros.latitude && filtros.longitude) {
            params.set('latitude', filtros.latitude);
            params.set('longitude', filtros.longitude);
            if (filtros.raio_km) params.set('raio', filtros.raio_km);
        }
        
        // Filtros específicos
        if (filtros.turno) params.set('turno', filtros.turno);
        if (filtros.capacidade) params.set('capacidade', filtros.capacidade);
        if (filtros.arCondicionado) params.set('arCondicionado', 'true');
        if (filtros.wifi) params.set('wifi', 'true');
        if (filtros.acessibilidade) params.set('acessibilidade', 'true');
        
        // Ordenação
        const ordenacao = document.getElementById('ordenacao')?.value || 'relevancia';
        params.set('ordenacao', ordenacao);
        
        // Paginação
        params.set('pagina', filtros.page || 1);
        params.set('limite', filtros.limit || 20);

        const url = `/api/public/transportes?${params.toString()}`;
        const res = await fetch(url);
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || `Erro na API (${res.status})`);
        }
        
        const data = await res.json();
        
        // A API pública retorna { success, data: { transportes, paginacao } }
        if (data.success && data.data) {
            return {
                rotas: data.data.transportes || [],
                total: data.data.paginacao?.totalResultados || 0,
                page: data.data.paginacao?.paginaAtual || 1,
                limit: data.data.paginacao?.resultadosPorPagina || 20,
                totalPages: data.data.paginacao?.totalPaginas || 0
            };
        }
        
        // Fallback para estrutura antiga
        return data;
    }

    obterFiltrosParaApi() {
        const transportType = this.currentTransportType || 'escolar';
        const endereco = document.getElementById('endereco')?.value || '';
        const raio = parseFloat(document.getElementById('raio')?.value) || 10;
        const turno = document.getElementById('turno-escolar')?.value || '';
        const escola = document.getElementById('nome-escola')?.value || '';
        const precoMax = document.getElementById('preco-max')?.value || '';
        const capacidade = document.getElementById('capacidade')?.value || '';

        // Tentar usar geolocalização atual do mapa
        const lat = window.mapsIntegration?.userLocation?.[0] || null;
        const lng = window.mapsIntegration?.userLocation?.[1] || null;

        // Verificar características selecionadas
        const arCondicionado = document.getElementById('ar-condicionado')?.checked || false;
        const wifi = document.getElementById('wifi')?.checked || false;
        const acessibilidade = document.getElementById('acessibilidade')?.checked || false;

        return {
            tipo_rota: transportType === 'escolar' ? 'escolar' : 'excursao',
            escola: escola.trim(),
            turno: turno.trim(),
            valor_max: precoMax ? parseFloat(precoMax) : '',
            capacidade: capacidade ? parseInt(capacidade) : '',
            latitude: lat,
            longitude: lng,
            raio_km: raio,
            endereco: endereco.trim(),
            arCondicionado: arCondicionado,
            wifi: wifi,
            acessibilidade: acessibilidade,
            page: this.currentPage || 1,
            limit: this.resultsPerPage || 20,
        };
    }


    async loadInitialResults() {
        try {
            await this.buscarTransportes();
        } catch (e) {
            console.error('Falha na busca inicial:', e?.message || e);
            this.showError('Não foi possível carregar os transportes. Verifique sua conexão e tente novamente.');
            this.currentResults = [];
            this.filteredResults = [];
            this.loadResults(); // Isso vai acionar a exibição de "Nenhum resultado encontrado"
        }
    }

    async aplicarFiltros() {
        if (this.isLoading) return;

        try {
            const data = await this.fetchRotasFromApi();
            const transportes = data.rotas || [];

            // Mapear retorno da API pública para o formato interno (mesmo mapeamento de buscarTransportes)
            this.currentResults = transportes.map(t => {
                // Determinar tipo baseado nos dados
                const tipo = t.tipo_servico?.toLowerCase().includes('escolar') ? 'escolar' : 
                            t.tipo_servico?.toLowerCase().includes('excursão') ? 'excursao' : 
                            t.rota ? 'escolar' : t.pacote ? 'excursao' : 'escolar';
                
                // Dados da rota (escolar)
                const rota = t.rota || {};
                // Dados do pacote (excursão)
                const pacote = t.pacote || {};
                
                // Características do veículo
                const caracteristicas = [];
                if (t.veiculo?.caracteristicas?.arCondicionado) caracteristicas.push('Ar-condicionado');
                if (t.veiculo?.caracteristicas?.wifi) caracteristicas.push('Wi-Fi');
                if (t.veiculo?.caracteristicas?.acessibilidade) caracteristicas.push('Acessibilidade');
                if (t.veiculo?.caracteristicas?.gps) caracteristicas.push('GPS');
                
                return {
                    id: t.id,
                    nome: rota.nome || pacote.nome || t.nome || 'Transporte',
                    tipo: tipo,
                    avaliacao: t.avaliacao || 0,
                    avaliacoes: t.totalAvaliacoes || 0,
                    distancia: t.distancia ? `${t.distancia} km` : '-',
                    capacidade: tipo === 'escolar' 
                        ? (rota.vagas ? `${rota.vagas} vagas` : (t.veiculo?.capacidade ? `Até ${t.veiculo.capacidade} lugares` : '-'))
                        : (pacote.vagas ? `${pacote.vagas} vagas` : (t.veiculo?.capacidade ? `Até ${t.veiculo.capacidade} pessoas` : '-')),
                    horario: tipo === 'escolar' 
                        ? (rota.horarioIda && rota.horarioVolta ? `${rota.horarioIda} - ${rota.horarioVolta}` : (rota.turno || '-'))
                        : (pacote.dataInicio ? `De ${pacote.dataInicio} a ${pacote.dataFim || pacote.dataInicio}` : '-'),
                    preco: tipo === 'escolar' 
                        ? (rota.precoMensal || '-')
                        : (pacote.precoPorPessoa || '-'),
                    caracteristicas: caracteristicas.length > 0 ? caracteristicas.join(', ') : 'Rastreamento GPS',
                    // Dados adicionais para o mapa
                    localizacao: t.localizacao,
                    rota: rota,
                    pacote: pacote
                };
            });

            this.filteredResults = [...this.currentResults];
            this.currentPage = data.page || 1;
            this.loadResults();

            // Atualizar o mapa
            this.updateMapMarkersFromApi(transportes);
            
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
            turno: document.getElementById('turno')?.value || '',
            caracteristicas: this.obterCaracteristicasSelecionadas()
        };
    }

    obterCaracteristicasSelecionadas() {
        const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.id);
    }

    aplicarFiltroItem(resultado, filtros) {
        // Filtro por capacidade
        if (filtros.capacidade) {
            const capacidadeNumero = this.extrairNumeroCapacidade(resultado.capacidade);
            if (!this.verificarCapacidade(capacidadeNumero, filtros.capacidade)) {
                return false;
            }
        }

        // Filtro por preço
        if (filtros.faixaPreco) {
            const precoNumero = this.extrairNumeroPreco(resultado.preco);
            if (!this.verificarPreco(precoNumero, filtros.faixaPreco)) {
                return false;
            }
        }

        // Filtro por características
        if (filtros.caracteristicas.length > 0) {
            const caracteristicasItem = resultado.caracteristicas.toLowerCase();
            const temCaracteristica = filtros.caracteristicas.some(carac => 
                caracteristicasItem.includes(this.mapearCaracteristica(carac))
            );
            if (!temCaracteristica) {
                return false;
            }
        }

        return true;
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
                <h3>🔍 Nenhum transporte encontrado</h3>
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

    updateMapMarkersFromApi(transportes) {
        try {
            if (!window.mapsIntegration) return;
            window.mapsIntegration.clearMarkers();
            
            const transports = transportes
                .map(t => {
                    // Obter coordenadas (priorizar localização, depois rota/pacote)
                    let position = null;
                    if (t.localizacao?.latitude && t.localizacao?.longitude) {
                        position = [t.localizacao.latitude, t.localizacao.longitude];
                    } else if (t.rota?.coordenadasOrigem) {
                        position = [t.rota.coordenadasOrigem.latitude, t.rota.coordenadasOrigem.longitude];
                    } else if (t.pacote?.coordenadasPartida) {
                        position = [t.pacote.coordenadasPartida.latitude, t.pacote.coordenadasPartida.longitude];
                    }
                    
                    if (!position) return null;
                    
                    // Determinar tipo
                    const tipo = t.tipo_servico?.toLowerCase().includes('escolar') ? 'escolar' : 
                                t.tipo_servico?.toLowerCase().includes('excursão') ? 'excursao' : 
                                t.rota ? 'escolar' : t.pacote ? 'excursao' : 'escolar';
                    
                    // Características
                    const features = [];
                    if (t.veiculo?.caracteristicas?.arCondicionado) features.push('Ar-condicionado');
                    if (t.veiculo?.caracteristicas?.wifi) features.push('Wi-Fi');
                    if (t.veiculo?.caracteristicas?.acessibilidade) features.push('Acessibilidade');
                    if (t.veiculo?.caracteristicas?.gps) features.push('GPS');
                    
                    return {
                        id: t.id,
                        name: t.rota?.nome || t.pacote?.nome || t.nome || 'Transporte',
                        type: tipo,
                        position: position,
                        rating: t.avaliacao || 0,
                        reviews: t.totalAvaliacoes || 0,
                        price: tipo === 'escolar' 
                            ? (t.rota?.precoMensal || '-')
                            : (t.pacote?.precoPorPessoa || '-'),
                        capacity: tipo === 'escolar'
                            ? (t.rota?.vagas ? `${t.rota.vagas} vagas` : (t.veiculo?.capacidade ? `Até ${t.veiculo.capacidade} lugares` : '-'))
                            : (t.pacote?.vagas ? `${t.pacote.vagas} vagas` : (t.veiculo?.capacidade ? `Até ${t.veiculo.capacidade} pessoas` : '-')),
                        features: features.length > 0 ? features : ['Rastreamento GPS']
                    };
                })
                .filter(t => t !== null && Array.isArray(t.position));

            transports.forEach(t => window.mapsIntegration.addTransportMarker(t));

            if (transports.length > 0) {
                window.mapsIntegration.centerOnResults();
            } else {
                console.info('Nenhum transporte com coordenadas disponíveis para exibir no mapa');
            }
        } catch (e) {
            console.warn('Falha ao atualizar marcadores do mapa:', e);
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
                        <span>⭐ ${resultado.avaliacao}</span>
                        <span>(${resultado.avaliacoes} avaliações)</span>
                    </div>
                </div>
                <div class="transport-type-badge ${badgeClass}">
                    ${badgeText}
                </div>
            </div>
            
            <div class="card-details">
                <div class="detail-item">
                    <span>📍</span>
                    <span>${resultado.distancia}</span>
                </div>
                <div class="detail-item">
                    <span>👥</span>
                    <span>${resultado.capacidade}</span>
                </div>
                <div class="detail-item">
                    <span>⏰</span>
                    <span>${resultado.horario}</span>
                </div>
                <div class="detail-item">
                    <span>💰</span>
                    <span>${resultado.preco}</span>
                </div>
                <div class="detail-item">
                    <span>✅</span>
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
        const icon = type === 'error' ? '❌' : '✅';
        
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
            'localizacao-modal': 'location',
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