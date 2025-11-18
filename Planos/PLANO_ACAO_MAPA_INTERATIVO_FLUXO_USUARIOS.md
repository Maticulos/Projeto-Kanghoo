# Plano de Ação Técnico: Mapa Interativo e Fluxo de Usuários

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Fluxo de Usuários](#arquitetura-do-fluxo-de-usuários)
3. [Integração Backend-Frontend](#integração-backend-frontend)
4. [Desenvolvimento do Mapa Interativo](#desenvolvimento-do-mapa-interativo)
5. [Sistema de Filtros em Tempo Real](#sistema-de-filtros-em-tempo-real)
6. [Adaptação de Código Existente](#adaptação-de-código-existente)
7. [Cronograma de Implementação](#cronograma-de-implementação)

---

## 🎯 Visão Geral

### Objetivo
Implementar um sistema completo de busca pública com mapa interativo na página `encontrar-transporte.html`, permitindo que novos usuários (pais/responsáveis) encontrem transporte escolar e excursões na sua região com filtros avançados e atualização em tempo real.

### Público-Alvo
- **Novos usuários não autenticados**: Pessoas buscando transporte escolar para seus filhos
- **Usuários buscando excursões**: Pessoas procurando viagens e fretamento

---

## 🔄 Arquitetura do Fluxo de Usuários

### 1. Fluxo na Homepage (index.html)

#### 1.1 Segmentação Inicial
O usuário é direcionado conforme seu objetivo:

```
index.html
    │
    ├─→ Motorista Escolar
    │   └─→ cadastro-escolar.html → Seleção de Planos (Basic/Premium)
    │
    ├─→ Motorista de Excursão
    │   └─→ cadastro-excursao.html
    │
    ├─→ Responsável (Já cadastrado)
    │   └─→ login.html → area-responsavel.html
    │
    ├─→ Possível Responsável (Novo usuário)
    │   └─→ encontrar-transporte.html ⭐ (FOCO PRINCIPAL)
    │
    └─→ Possível Transportado (Novo usuário)
        └─→ encontrar-transporte.html?tipo=excursao
```

#### 1.2 Modificações Necessárias no index.html

**Arquivo:** `teste/frontend/public/index.html`

**Mudanças:**
1. **Melhorar os links para "Encontrar Transporte":**
   - Botão hero: Adicionar parâmetro de tipo se necessário
   - Link no footer: Adicionar `onclick` para definir tipo de transporte
   - Seção "Encontre o transporte perfeito": Link direto para buscar

2. **Adicionar lógica de redirecionamento inteligente:**
```javascript
// Adicionar ao animacoes-index.js ou criar novo arquivo
function redirectToTransporteFinder(tipo = null) {
    if (tipo) {
        localStorage.setItem('transportType', tipo);
        window.location.href = 'encontrar-transporte.html?tipo=' + tipo;
    } else {
        window.location.href = 'encontrar-transporte.html';
    }
}
```

---

## 🔌 Integração Backend-Frontend

### 2.1 Endpoints Disponíveis (Análise do Código Existente)

#### 2.1.1 Endpoint de Busca de Rotas
**Endpoint:** `GET /api/buscar-rotas`

**Arquivo:** `teste/server/routes/buscar-rotas.js`

**Parâmetros suportados:**
```javascript
{
    escola: string,           // Nome da escola
    bairro: string,           // Bairro
    cidade: string,           // Cidade
    turno: string,            // 'manha' | 'tarde' | 'integral' | 'noite'
    tipo_rota: string,        // 'escolar' | 'excursao'
    valor_max: number,        // Preço máximo
    latitude: number,         // Para busca por proximidade
    longitude: number,        // Para busca por proximidade
    raio_km: number,          // Raio de busca (padrão: 10)
    page: number,             // Paginação
    limit: number             // Limite por página
}
```

**Resposta esperada:**
```javascript
{
    success: true,
    data: {
        rotas: [
            {
                id: number,
                nome_rota: string,
                escola_destino: string,
                endereco_origem: string,
                endereco_destino: string,
                turno: string,
                horario_ida: string,
                horario_volta: string,
                capacidade_maxima: number,
                capacidade_atual: number,
                valor_mensal: number,
                latitude_origem: number,
                longitude_origem: number,
                latitude_destino: number,
                longitude_destino: number,
                distancia_km: number,
                media_avaliacoes: number,
                total_avaliacoes: number,
                // ... outros campos
            }
        ],
        total: number,
        page: number,
        limit: number,
        totalPages: number
    }
}
```

#### 2.1.2 Endpoint de Rastreamento GPS (Público - Limitado)
**Endpoint:** `GET /api/rastreamento/rotas/:rotaId/posicao` (Se existir)

**Recomendação:** Criar endpoint público limitado que retorne apenas:
- Posição atual (latitude, longitude)
- Status da viagem (ativa, finalizada)
- Sem dados sensíveis do motorista

#### 2.1.3 Novos Endpoints Necessários

**1. Busca Unificada de Transportes**
```
GET /api/transportes/buscar-publico
```
- **Finalidade:** Busca pública (sem autenticação) de transportes
- **Parâmetros:** Similar ao `/api/buscar-rotas` mas com suporte a filtros avançados
- **Segurança:** Rate limiting, validação de inputs

**2. Lista de Escolas Cadastradas**
```
GET /api/escolas/lista
```
- **Finalidade:** Popular dropdown de escolas no filtro
- **Parâmetros:** `cidade`, `tipo_instituicao`
- **Cache:** Recomendado cache de 1 hora

**3. Posições GPS em Tempo Real (Público Limitado)**
```
GET /api/transportes/:transporteId/posicao-atual
```
- **Finalidade:** Obter posição atual de veículo (para mapa)
- **Segurança:** Apenas para rotas ativas, dados limitados
- **Rate limiting:** Máximo 1 requisição por segundo por IP

### 2.2 Estrutura de Comunicação

#### 2.2.1 Camada de API Client (Frontend)
**Arquivo:** `teste/frontend/public/assets/js/api/transporte-api-client.js`

```javascript
/**
 * Cliente API para busca de transportes (público)
 */
class TransporteAPIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minuto
    }

    /**
     * Buscar transportes com filtros
     */
    async buscarTransportes(filtros) {
        const params = new URLSearchParams();
        
        // Mapear filtros para parâmetros da API
        Object.entries(filtros).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        });

        const url = `${this.baseURL}/buscar-rotas?${params.toString()}`;
        
        // Verificar cache
        const cacheKey = url;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Armazenar no cache
            this.cache.set(cacheKey, {
                timestamp: Date.now(),
                data: data
            });
            
            return data;
        } catch (error) {
            console.error('Erro na busca de transportes:', error);
            throw error;
        }
    }

    /**
     * Obter lista de escolas
     */
    async obterEscolas(cidade = null) {
        const params = cidade ? `?cidade=${encodeURIComponent(cidade)}` : '';
        const url = `${this.baseURL}/escolas/lista${params}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return data.escolas || [];
        } catch (error) {
            console.error('Erro ao obter escolas:', error);
            return [];
        }
    }

    /**
     * Obter posição atual de um transporte (para rastreamento em tempo real)
     */
    async obterPosicaoAtual(transporteId) {
        const url = `${this.baseURL}/transportes/${transporteId}/posicao-atual`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao obter posição:', error);
            return null;
        }
    }

    /**
     * Limpar cache
     */
    limparCache() {
        this.cache.clear();
    }
}

// Exportar para uso global
window.TransporteAPIClient = TransporteAPIClient;
```

---

## 🗺️ Desenvolvimento do Mapa Interativo

### 3.1 Escolha da Biblioteca de Mapa

#### Análise de Opções:

**1. Leaflet.js (RECOMENDADO) ✅**
- ✅ **Vantagens:**
  - Open source e gratuito
  - Leve (~40KB minified)
  - Extensível com plugins
  - Boa performance
  - Já está incluído no projeto (`assets/libs/leaflet/`)
- ⚠️ **Desvantagens:**
  - Requer tile providers externos (OpenStreetMap, Mapbox)
  - Estilização pode ser mais complexa

**2. Google Maps API**
- ✅ Já está parcialmente implementado (`google-maps-integration.js`)
- ❌ Requer chave API e pode ter custos
- ❌ Dependência externa

**3. Mapbox GL JS**
- ✅ Excelente performance e estilização
- ❌ Requer chave API e plano pago para uso comercial

**RECOMENDAÇÃO FINAL:** Usar **Leaflet.js** para o mapa público, pois:
- Já está instalado
- Não requer chaves API para uso básico
- É gratuito e open source
- Tem boa documentação em português

### 3.2 Implementação do Mapa

**Arquivo:** `teste/frontend/public/assets/js/mapa-interativo.js`

```javascript
/**
 * Gerenciador de Mapa Interativo usando Leaflet
 */
class MapaInterativo {
    constructor(containerId = 'map-container', options = {}) {
        this.container = document.getElementById(containerId);
        this.map = null;
        this.markers = new Map();
        this.userMarker = null;
        this.bounds = null;
        
        // Configurações padrão
        this.options = {
            center: [-23.5505, -46.6333], // São Paulo (padrão)
            zoom: 13,
            minZoom: 10,
            maxZoom: 18,
            ...options
        };
        
        // Inicializar mapa
        this.init();
    }

    /**
     * Inicializar o mapa
     */
    init() {
        if (!this.container) {
            console.error('Container do mapa não encontrado');
            return;
        }

        // Criar mapa
        this.map = L.map(this.container, {
            center: this.options.center,
            zoom: this.options.zoom,
            minZoom: this.options.minZoom,
            maxZoom: this.options.maxZoom,
            zoomControl: true,
            attributionControl: true
        });

        // Adicionar tiles (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Tentar obter localização do usuário
        this.obterLocalizacaoUsuario();

        // Configurar controles
        this.setupControls();
    }

    /**
     * Obter localização do usuário
     */
    obterLocalizacaoUsuario() {
        if (!navigator.geolocation) {
            console.warn('Geolocalização não disponível');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.centralizarEm([latitude, longitude]);
                this.adicionarMarcadorUsuario([latitude, longitude]);
            },
            (error) => {
                console.warn('Erro ao obter localização:', error);
                // Usar localização padrão (São Paulo)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    /**
     * Adicionar marcador do usuário
     */
    adicionarMarcadorUsuario(position) {
        // Remover marcador anterior se existir
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }

        // Criar ícone personalizado para usuário
        const userIcon = L.icon({
            iconUrl: 'assets/images/marker-user.png', // Criar ícone ou usar padrão
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        this.userMarker = L.marker(position, { icon: userIcon })
            .addTo(this.map)
            .bindPopup('<b>Sua localização</b>')
            .openPopup();
    }

    /**
     * Adicionar marcador de transporte
     */
    adicionarMarcadorTransporte(transporte) {
        const { id, position, name, type, rating, price, capacity } = transporte;

        // Remover marcador anterior se existir
        if (this.markers.has(id)) {
            this.map.removeLayer(this.markers.get(id));
        }

        // Escolher ícone baseado no tipo
        const iconUrl = type === 'escolar' 
            ? 'assets/images/marker-escolar.png'
            : 'assets/images/marker-excursao.png';

        const icon = L.icon({
            iconUrl: iconUrl,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        // Criar conteúdo do popup
        const popupContent = `
            <div class="transport-popup">
                <h4>${name}</h4>
                <p><strong>Tipo:</strong> ${type === 'escolar' ? 'Transporte Escolar' : 'Excursão'}</p>
                ${rating ? `<p><strong>Avaliação:</strong> ⭐ ${rating}</p>` : ''}
                ${price ? `<p><strong>Preço:</strong> ${price}</p>` : ''}
                ${capacity ? `<p><strong>Capacidade:</strong> ${capacity}</p>` : ''}
                <button class="btn btn-primary btn-small" onclick="verDetalhesTransporte(${id})">
                    Ver Detalhes
                </button>
            </div>
        `;

        // Criar marcador
        const marker = L.marker(position, { icon })
            .addTo(this.map)
            .bindPopup(popupContent);

        // Armazenar referência
        this.markers.set(id, marker);

        // Adicionar ao bounds para centralização
        if (!this.bounds) {
            this.bounds = L.latLngBounds(position);
        } else {
            this.bounds.extend(position);
        }

        return marker;
    }

    /**
     * Limpar todos os marcadores de transportes
     */
    limparMarcadoresTransportes() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers.clear();
        this.bounds = null;
    }

    /**
     * Atualizar marcadores com dados da API
     */
    atualizarMarcadores(transportes) {
        this.limparMarcadoresTransportes();

        transportes.forEach(transporte => {
            // Verificar se tem coordenadas válidas
            if (transporte.latitude && transporte.longitude) {
                this.adicionarMarcadorTransporte({
                    id: transporte.id,
                    position: [transporte.latitude, transporte.longitude],
                    name: transporte.nome_rota || transporte.nome,
                    type: transporte.tipo_rota || 'escolar',
                    rating: transporte.media_avaliacoes,
                    price: transporte.valor_mensal ? `R$ ${transporte.valor_mensal}/mês` : null,
                    capacity: transporte.capacidade_maxima ? `Até ${transporte.capacidade_maxima} lugares` : null
                });
            }
        });

        // Centralizar no bounds de todos os marcadores
        this.centralizarResultados();
    }

    /**
     * Centralizar nos resultados
     */
    centralizarResultados() {
        if (this.bounds && this.markers.size > 0) {
            this.map.fitBounds(this.bounds, {
                padding: [50, 50],
                maxZoom: 15
            });
        }
    }

    /**
     * Centralizar em uma posição específica
     */
    centralizarEm(position, zoom = null) {
        this.map.setView(position, zoom || this.options.zoom);
    }

    /**
     * Configurar controles do mapa
     */
    setupControls() {
        // Adicionar botão de "Minha Localização"
        const locationControl = L.control({ position: 'topright' });
        locationControl.onAdd = () => {
            const div = L.DomUtil.create('div', 'location-control');
            div.innerHTML = '<button class="btn-location" title="Minha Localização">📍</button>';
            
            L.DomEvent.on(div, 'click', () => {
                this.obterLocalizacaoUsuario();
            });
            
            return div;
        };
        locationControl.addTo(this.map);
    }

    /**
     * Adicionar rota no mapa (opcional, para futuro)
     */
    adicionarRota(waypoints) {
        // Implementar com plugin Leaflet Routing Machine ou Polyline
        // Por enquanto, apenas marcadores
    }
}

// Exportar para uso global
window.MapaInterativo = MapaInterativo;
```

### 3.3 Integração com encontrar-transporte.html

**Modificações no HTML:**
```html
<!-- Substituir o container do Google Maps por Leaflet -->
<div id="map-container" class="map-container">
    <!-- O mapa será inicializado aqui pelo JavaScript -->
</div>
```

**CSS necessário (adicionar ao `encontrar-transporte.css`):**
```css
.map-container {
    width: 100%;
    height: 600px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Estilizar controles do Leaflet */
.location-control {
    background: white;
    border-radius: 4px;
    padding: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.btn-location {
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 18px;
}

.btn-location:hover {
    background: #0056b3;
}

/* Estilizar popups do mapa */
.transport-popup {
    min-width: 200px;
}

.transport-popup h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #333;
}

.transport-popup p {
    margin: 4px 0;
    font-size: 14px;
    color: #666;
}
```

---

## 🎛️ Sistema de Filtros em Tempo Real

### 4.1 Lógica de Filtragem

#### 4.1.1 Operadores de Filtro

**Estratégia:** Filtros são aplicados com operador **AND** (E) entre diferentes categorias, e **OR** (OU) dentro de características múltiplas.

```
Filtros Aplicados = 
    (Localização E Raio) AND
    (Horários) AND
    (Idade Mínima E Idade Máxima) AND
    (Escola OU Tipo Instituição) AND
    (Capacidade) AND
    (Características: Ar-condicionado OU Monitor OU ...) AND
    (Preço Mínimo E Preço Máximo)
```

#### 4.1.2 Implementação da Lógica de Filtros

**Arquivo:** `teste/frontend/public/assets/js/filtros-transporte.js`

```javascript
/**
 * Gerenciador de Filtros em Tempo Real
 */
class FiltrosTransporteManager {
    constructor() {
        this.filtrosAtivos = new Map();
        this.debounceTimer = null;
        this.debounceDelay = 500; // 500ms de delay
    }

    /**
     * Obter todos os filtros ativos
     */
    obterFiltros() {
        const filtros = {};

        // 1. Localização
        const endereco = document.getElementById('endereco')?.value.trim();
        const raio = parseFloat(document.getElementById('raio')?.value) || 10;
        
        if (endereco) {
            filtros.endereco = endereco;
            filtros.raio_km = raio;
        }

        // 2. Horários (para transporte escolar)
        const turno = document.getElementById('turno-escolar')?.value;
        const horarioIda = document.getElementById('horario-ida-escolar')?.value;
        const horarioVolta = document.getElementById('horario-volta-escolar')?.value;
        
        if (turno) filtros.turno = turno;
        if (horarioIda) filtros.horario_ida = horarioIda;
        if (horarioVolta) filtros.horario_volta = horarioVolta;

        // 3. Idade das Crianças
        const idadeMin = document.getElementById('idade-minima')?.value;
        const idadeMax = document.getElementById('idade-maxima')?.value;
        
        if (idadeMin) filtros.idade_minima = parseInt(idadeMin);
        if (idadeMax) filtros.idade_maxima = parseInt(idadeMax);

        // 4. Escola/Instituição
        const nomeEscola = document.getElementById('nome-escola')?.value.trim();
        const tipoInstituicao = document.getElementById('tipo-instituicao')?.value;
        
        if (nomeEscola) filtros.escola = nomeEscola;
        if (tipoInstituicao) filtros.tipo_instituicao = tipoInstituicao;

        // 5. Capacidade
        const capacidade = document.getElementById('capacidade')?.value;
        if (capacidade) {
            // Processar faixa de capacidade
            const [min, max] = capacidade.split('-').map(v => parseInt(v.trim()) || null);
            if (min !== null) filtros.capacidade_minima = min;
            if (max !== null) filtros.capacidade_maxima = max;
        }

        // 6. Características (checkboxes - múltipla seleção)
        const caracteristicas = this.obterCaracteristicasSelecionadas();
        if (caracteristicas.length > 0) {
            filtros.caracteristicas = caracteristicas;
        }

        // 7. Preço
        const precoMin = document.getElementById('preco-min')?.value;
        const precoMax = document.getElementById('preco-max')?.value;
        
        if (precoMin) filtros.valor_min = parseFloat(precoMin);
        if (precoMax) filtros.valor_max = parseFloat(precoMax);

        // 8. Tipo de transporte
        const tipoAtivo = document.querySelector('.transport-tab.active');
        filtros.tipo_rota = tipoAtivo?.dataset.type || 'escolar';

        // 9. Paginação
        filtros.page = 1;
        filtros.limit = 10;

        // 10. Geolocalização (se disponível)
        if (window.mapaInterativo?.userMarker) {
            const position = window.mapaInterativo.userMarker.getLatLng();
            filtros.latitude = position.lat;
            filtros.longitude = position.lng;
        }

        return filtros;
    }

    /**
     * Obter características selecionadas
     */
    obterCaracteristicasSelecionadas() {
        const caracteristicas = [];
        
        // Checkboxes de transporte escolar
        const checkboxesEscolar = document.querySelectorAll('#caracteristicas-escolar-modal input[type="checkbox"]:checked');
        checkboxesEscolar.forEach(cb => {
            caracteristicas.push(cb.id);
        });

        // Checkboxes de excursão
        const checkboxesExcursao = document.querySelectorAll('#caracteristicas-excursao-modal input[type="checkbox"]:checked');
        checkboxesExcursao.forEach(cb => {
            caracteristicas.push(cb.id);
        });

        return caracteristicas;
    }

    /**
     * Aplicar filtros com debounce
     */
    aplicarFiltros() {
        // Cancelar timer anterior
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Criar novo timer
        this.debounceTimer = setTimeout(() => {
            this.executarBusca();
        }, this.debounceDelay);
    }

    /**
     * Executar busca com filtros
     */
    async executarBusca() {
        const filtros = this.obterFiltros();

        // Mostrar loading
        if (window.transporteFinder) {
            window.transporteFinder.showLoading('Aplicando filtros...');
        }

        try {
            // Chamar API
            const apiClient = window.apiClient || new TransporteAPIClient();
            const resultado = await apiClient.buscarTransportes(filtros);

            // Atualizar resultados
            if (window.transporteFinder) {
                window.transporteFinder.atualizarResultados(resultado.data.rotas || []);
            }

            // Atualizar mapa
            if (window.mapaInterativo) {
                window.mapaInterativo.atualizarMarcadores(resultado.data.rotas || []);
            }

            // Atualizar contador
            if (window.transporteFinder) {
                window.transporteFinder.updateResultsCount(resultado.data.total || 0);
            }

        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
            if (window.transporteFinder) {
                window.transporteFinder.showError('Erro ao aplicar filtros. Tente novamente.');
            }
        } finally {
            if (window.transporteFinder) {
                window.transporteFinder.hideLoading();
            }
        }
    }

    /**
     * Configurar listeners para filtros em tempo real
     */
    configurarListeners() {
        // Inputs de texto (debounce)
        const inputsTexto = [
            'endereco', 'nome-escola', 'endereco-escola',
            'preco-min', 'preco-max', 'idade-minima', 'idade-maxima'
        ];

        inputsTexto.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.aplicarFiltros());
            }
        });

        // Selects (sem debounce, resposta imediata)
        const selects = [
            'turno-escolar', 'capacidade', 'tipo-instituicao',
            'faixa-etaria', 'preco-max'
        ];

        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', () => this.aplicarFiltros());
            }
        });

        // Checkboxes (resposta imediata)
        document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.aplicarFiltros());
        });

        // Tabs de tipo de transporte
        document.querySelectorAll('.transport-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Aguardar um pouco para o DOM atualizar
                setTimeout(() => this.aplicarFiltros(), 100);
            });
        });
    }
}

// Exportar
window.FiltrosTransporteManager = FiltrosTransporteManager;
```

### 4.2 Integração com Modais de Filtros

O código existente em `encontrar-transporte.js` já tem a classe `FilterModalController`. Devemos integrá-la com o novo sistema de filtros em tempo real.

**Modificação no `FilterModalController.applyFilter()`:**

```javascript
// Após aplicar o filtro do modal, também aplicar os filtros em tempo real
applyFilter(modalId) {
    // ... código existente ...
    
    // NOVO: Aplicar filtros em tempo real após aplicar filtro do modal
    if (window.filtrosManager) {
        window.filtrosManager.aplicarFiltros();
    }
    
    this.updateFilterDisplay();
    this.closeModal(modalId);
}
```

---

## 🔧 Adaptação de Código Existente

### 5.1 Modificações em `encontrar-transporte.js`

**Arquivo:** `teste/frontend/public/assets/js/encontrar-transporte.js`

**Mudanças necessárias:**

1. **Integrar Mapa Interativo:**
```javascript
// No método init() da classe TransporteFinder
init() {
    // ... código existente ...
    
    // Inicializar mapa interativo
    if (document.getElementById('map-container')) {
        window.mapaInterativo = new MapaInterativo('map-container', {
            center: [-23.5505, -46.6333], // São Paulo
            zoom: 13
        });
    }
    
    // Inicializar gerenciador de filtros
    window.filtrosManager = new FiltrosTransporteManager();
    window.filtrosManager.configurarListeners();
}
```

2. **Atualizar método `updateMapMarkersFromApi()`:**
```javascript
updateMapMarkersFromApi(rotas) {
    if (window.mapaInterativo) {
        window.mapaInterativo.atualizarMarcadores(rotas);
    }
}
```

3. **Adicionar método `atualizarResultados()`:**
```javascript
atualizarResultados(rotas) {
    this.currentResults = rotas.map(r => ({
        // ... mapeamento existente ...
    }));
    this.filteredResults = [...this.currentResults];
    this.currentPage = 1;
    this.loadResults();
}
```

### 5.2 Modificações no Backend

#### 5.2.1 Melhorar Endpoint `/api/buscar-rotas`

**Arquivo:** `teste/server/routes/buscar-rotas.js`

**Adicionar suporte a:**
- Filtro por características (ar-condicionado, monitor, etc.)
- Filtro por idade mínima/máxima
- Busca por nome de escola (autocomplete)
- Ordenação por distância quando latitude/longitude fornecidas

#### 5.2.2 Criar Endpoint de Escolas

**Novo arquivo:** `teste/server/routes/escolas.js`

```javascript
const Router = require('koa-router');
const db = require('../config/db');
const { apiResponse } = require('../utils/api-response');

const router = new Router({ prefix: '/api/escolas' });

/**
 * GET /api/escolas/lista
 * Lista escolas cadastradas (público, com cache)
 */
router.get('/lista', async (ctx) => {
    try {
        const { cidade, tipo_instituicao } = ctx.query;
        
        let query = `
            SELECT DISTINCT 
                escola_destino as nome,
                endereco_destino as endereco,
                tipo_instituicao
            FROM rotas_escolares
            WHERE ativa = true AND escola_destino IS NOT NULL
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (cidade) {
            paramCount++;
            query += ` AND LOWER(endereco_destino) LIKE LOWER($${paramCount})`;
            params.push(`%${cidade}%`);
        }
        
        if (tipo_instituicao) {
            paramCount++;
            query += ` AND tipo_instituicao = $${paramCount}`;
            params.push(tipo_instituicao);
        }
        
        query += ` ORDER BY nome LIMIT 100`;
        
        const result = await db.query(query, params);
        
        ctx.body = apiResponse.success({
            escolas: result.rows
        });
    } catch (error) {
        console.error('Erro ao listar escolas:', error);
        ctx.body = apiResponse.error('Erro ao listar escolas', 500);
    }
});

module.exports = router;
```

**Registrar no `routes/index.js`:**
```javascript
const escolasRoutes = require('./escolas');
app.use(escolasRoutes.routes());
```

### 5.3 Arquivos CSS

**Arquivo:** `teste/frontend/public/assets/css/encontrar-transporte.css`

**Adicionar estilos:**
- Estilos para o mapa Leaflet
- Estilos para popups dos marcadores
- Estilos para controles do mapa
- Animações para filtros aplicados

---

## 📅 Cronograma de Implementação

### Fase 1: Preparação e Estrutura (2-3 dias)
- [ ] Criar arquivo `mapa-interativo.js`
- [ ] Criar arquivo `transporte-api-client.js`
- [ ] Criar arquivo `filtros-transporte.js`
- [ ] Atualizar HTML com container do mapa Leaflet
- [ ] Adicionar estilos CSS para o mapa

### Fase 2: Integração Backend (2-3 dias)
- [ ] Melhorar endpoint `/api/buscar-rotas` com novos filtros
- [ ] Criar endpoint `/api/escolas/lista`
- [ ] Criar endpoint `/api/transportes/:id/posicao-atual` (opcional)
- [ ] Testar endpoints com Postman/Insomnia

### Fase 3: Implementação do Mapa (3-4 dias)
- [ ] Integrar Leaflet no `encontrar-transporte.html`
- [ ] Implementar inicialização do mapa
- [ ] Adicionar marcadores de transportes
- [ ] Implementar geolocalização do usuário
- [ ] Adicionar controles do mapa
- [ ] Testar responsividade

### Fase 4: Sistema de Filtros (3-4 dias)
- [ ] Implementar lógica de filtros em tempo real
- [ ] Integrar filtros com a API
- [ ] Atualizar mapa ao aplicar filtros
- [ ] Atualizar lista de resultados
- [ ] Implementar debounce para inputs
- [ ] Testar todos os filtros

### Fase 5: Integração e Testes (2-3 dias)
- [ ] Integrar todos os componentes
- [ ] Testar fluxo completo
- [ ] Corrigir bugs
- [ ] Otimizar performance
- [ ] Testar em diferentes navegadores
- [ ] Testar responsividade mobile

### Fase 6: Melhorias e Polimento (2 dias)
- [ ] Adicionar animações
- [ ] Melhorar UX
- [ ] Adicionar tratamento de erros
- [ ] Implementar loading states
- [ ] Documentar código

**TOTAL ESTIMADO: 14-19 dias**

---

## 🔒 Considerações de Segurança

### 6.1 Endpoints Públicos
- ✅ Implementar rate limiting
- ✅ Validar e sanitizar todos os inputs
- ✅ Limitar quantidade de resultados retornados
- ✅ Não expor dados sensíveis (telefones, endereços completos)

### 6.2 Geolocalização
- ✅ Solicitar permissão do usuário
- ✅ Tratar casos de permissão negada
- ✅ Não armazenar localização do usuário sem consentimento

### 6.3 Cache
- ✅ Implementar cache de respostas (1 minuto para buscas)
- ✅ Invalidar cache quando necessário
- ✅ Limitar tamanho do cache

---

## 📝 Checklist de Validação

### Funcionalidades
- [ ] Mapa carrega corretamente
- [ ] Marcadores aparecem no mapa
- [ ] Filtros atualizam resultados em tempo real
- [ ] Geolocalização funciona
- [ ] Busca por endereço funciona
- [ ] Todos os filtros funcionam corretamente
- [ ] Lista de resultados atualiza com filtros
- [ ] Paginação funciona
- [ ] Ordenação funciona

### UX/UI
- [ ] Interface responsiva
- [ ] Animações suaves
- [ ] Loading states visíveis
- [ ] Mensagens de erro claras
- [ ] Acessibilidade (ARIA labels, etc.)

### Performance
- [ ] Carregamento inicial < 3s
- [ ] Filtros aplicam em < 1s
- [ ] Mapa renderiza sem travamentos
- [ ] Sem memory leaks

### Compatibilidade
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile (iOS Safari, Chrome Android)

---

## 🚀 Próximos Passos (Pós-Implementação)

1. **Rastreamento GPS em Tempo Real**
   - Integrar WebSockets para atualização em tempo real
   - Atualizar posição dos veículos no mapa
   - Notificações quando veículo se aproxima

2. **Cache Inteligente**
   - Implementar Service Worker para cache offline
   - Cache de tiles do mapa
   - Cache de resultados de busca

3. **Melhorias de Performance**
   - Lazy loading de marcadores
   - Clusterização de marcadores próximos
   - Virtualização da lista de resultados

4. **Analytics**
   - Rastrear filtros mais usados
   - Analisar padrões de busca
   - Métricas de engajamento

---

## 📚 Referências e Recursos

### Documentação
- [Leaflet.js Documentation](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Koa.js Documentation](https://koajs.com/)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

### Bibliotecas Recomendadas
- **Leaflet.markercluster**: Para agrupar marcadores próximos
- **Leaflet.geocoder**: Para busca de endereços
- **Leaflet.routing.machine**: Para exibir rotas (futuro)

---

**Documento criado em:** 2025-01-XX
**Versão:** 1.0
**Autor:** Assistente IA (baseado em análise do código existente)

