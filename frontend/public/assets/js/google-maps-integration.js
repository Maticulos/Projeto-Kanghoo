/**
 * Integração com Mapas usando Leaflet (OpenStreetMap)
 * Funcionalidades: Mapa interativo, marcadores, geolocalização, rotas
 */

class MapsIntegration {
    constructor() {
        const appConfig = window.APP_CONFIG || {};
        this.map = null;
        this.markers = [];
        this.userLocationMarker = null;
        this.userLocation = null;
        this.routeControl = null;
        this.statusOverlay = null;
        this.realtimeBadge = null;
        this.transportData = new Map();
        this.routeDetailsPanel = null;
        this.routePanelTimer = null;
        
        // Configurações padrão
        this.apiBase = (appConfig.apiBasePath || '/api').replace(/\/$/, '');
        const fallbackCenter = (appConfig.mapCenter && Array.isArray(appConfig.mapCenter) && appConfig.mapCenter.length === 2)
            ? appConfig.mapCenter
            : [-28.480036, -49.006901];
        this.defaultCenter = fallbackCenter;
        this.defaultZoom = appConfig.mapZoom || 12;
        
        this.init();
    }
    
    init() {
        // Aguardar o carregamento do DOM e do Leaflet
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.waitForLeaflet());
        } else {
            this.waitForLeaflet();
        }
    }
    
    waitForLeaflet() {
        // Verificar se Leaflet está carregado, se não, aguardar
        if (typeof L === 'undefined') {
            console.log('Aguardando carregamento do Leaflet...');
            setTimeout(() => this.waitForLeaflet(), 100);
            return;
        }
        this.configureLeafletDefaults();
        this.initializeMap();
    }

    configureLeafletDefaults() {
        try {
            if (typeof L === 'undefined' || !L.Icon || !L.Icon.Default) {
                return;
            }

            const createSvgDataUrl = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;

            const markerSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
                    <defs>
                        <linearGradient id="markerGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" stop-color="#667eea" />
                            <stop offset="100%" stop-color="#4c51bf" />
                        </linearGradient>
                    </defs>
                    <path d="M16 0C8.268 0 2 6.268 2 14c0 11.046 14 34 14 34s14-22.954 14-34C30 6.268 23.732 0 16 0z" fill="url(#markerGradient)" />
                    <circle cx="16" cy="15" r="6" fill="#ffffff" />
                </svg>
            `;

            const shadowSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="16" viewBox="0 0 44 16">
                    <ellipse cx="22" cy="8" rx="20" ry="6" fill="rgba(0,0,0,0.25)" />
                </svg>
            `;

            const markerIconUrl = createSvgDataUrl(markerSvg);
            const markerShadowUrl = createSvgDataUrl(shadowSvg);

            L.Icon.Default.mergeOptions({
                iconUrl: markerIconUrl,
                iconRetinaUrl: markerIconUrl,
                shadowUrl: markerShadowUrl,
                iconSize: [32, 48],
                iconAnchor: [16, 48],
                popupAnchor: [0, -42],
                tooltipAnchor: [16, -32],
                shadowSize: [44, 16],
                shadowAnchor: [16, 8]
            });
        } catch (error) {
            console.warn('Não foi possível configurar os ícones padrão do Leaflet:', error);
        }
    }
    
    initializeMap() {
        try {
            const mapElement = document.getElementById('google-map');
            const loadingElement = document.getElementById('map-loading');
            
            if (!mapElement) {
                console.error('Elemento do mapa não encontrado');
                return;
            }
            
            // Verificar se Leaflet está carregado
            if (typeof L === 'undefined') {
                console.error('Leaflet não carregado');
                this.showMapError();
                return;
            }
            
            // Criar o mapa
            this.map = L.map('google-map').setView(this.defaultCenter, this.defaultZoom);
            
            // Adicionar camada de tiles (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this.map);

            this.ensureStatusOverlay(mapElement);
            this.setStatus('ready');
            this.setRealtimeBadge(window.APP_CONFIG?.demoMode ? 'DEMO' : 'Tempo real');
            
            // Esconder loading
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Tentar obter localização do usuário
            this.getCurrentLocation();
            
            // Carregar marcadores de exemplo
            this.loadSampleMarkers();
            
            console.log('Mapa inicializado com sucesso');
            
        } catch (error) {
            console.error('Erro ao inicializar mapa:', error);
            this.showMapError();
        }
    }
    
    setupEventListeners() {
        // Botão minha localização
        const btnMinhaLocalizacao = document.getElementById('btn-minha-localizacao');
        if (btnMinhaLocalizacao) {
            btnMinhaLocalizacao.addEventListener('click', () => {
                this.getCurrentLocation(true);
            });
        }
        
        // Botão centralizar resultados
        const btnCentralizarResultados = document.getElementById('btn-centralizar-resultados');
        if (btnCentralizarResultados) {
            btnCentralizarResultados.addEventListener('click', () => {
                this.centerOnResults();
            });
        }
        
        // Click no mapa
        this.map.on('click', (e) => {
            this.onMapClick(e);
        });
    }
    
    getCurrentLocation(showMessage = false) {
        if (navigator.geolocation) {
            if (showMessage) {
                this.showMessage('Obtendo sua localização...', 'info');
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPos = [position.coords.latitude, position.coords.longitude];
                    
                    this.userLocation = userPos;
                    this.setUserLocationMarker(userPos);
                    this.map.setView(userPos, 14);
                    
                    if (showMessage) {
                        this.showMessage('Localização encontrada!', 'success');
                    }
                },
                (error) => {
                    let errorMessage = 'Não foi possível obter sua localização';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Permissão de localização negada pelo usuário';
                            console.warn('Geolocalização: Permissão negada pelo usuário');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Informação de localização indisponível';
                            console.warn('Geolocalização: Posição indisponível');
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Tempo limite para obter localização excedido';
                            console.warn('Geolocalização: Timeout');
                            break;
                        default:
                            console.warn('Geolocalização: Erro desconhecido', error);
                            break;
                    }
                    
                    if (showMessage) {
                        this.showMessage(errorMessage, 'warning');
                    }
                    
                    // Fallback: centralizar no Brasil
                    this.setDefaultLocation();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        } else {
            console.warn('Geolocalização não suportada pelo navegador');
            if (showMessage) {
                this.showMessage('Geolocalização não suportada pelo navegador', 'warning');
            }
            // Fallback: usar localização padrão
            this.setDefaultLocation();
        }
    }
    
    setUserLocationMarker(position) {
        // Remover marcador anterior se existir
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
        }
        
        // Criar ícone personalizado para localização do usuário
        const userIcon = L.divIcon({
            html: `
                <div style="
                    width: 20px; 
                    height: 20px; 
                    background: #4285F4; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                "></div>
            `,
            className: 'user-location-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        // Criar novo marcador
        this.userLocationMarker = L.marker(position, { icon: userIcon })
            .addTo(this.map)
            .bindPopup(`
                <div style="padding: 10px;">
                    <h4>📍 Sua Localização</h4>
                    <p>Latitude: ${position[0].toFixed(6)}</p>
                    <p>Longitude: ${position[1].toFixed(6)}</p>
                </div>
            `);
    }
    
    setDefaultLocation() {
        // Localização padrão configurável via APP_CONFIG
        const defaultLocation = this.defaultCenter;
        
        // Centralizar mapa na localização padrão
        this.map.setView(defaultLocation, 11);

        console.info(`Usando localização padrão configurada: ${defaultLocation[0].toFixed(6)}, ${defaultLocation[1].toFixed(6)}`);
    }
    
    async loadSampleMarkers() {
        // Tentar carregar dados reais da API pública
        try {
            const endpoint = `${this.apiBase}/public/transportes?tipo=todos&limite=20`;
            const response = await fetch(endpoint);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && data.data.transportes) {
                    const transportes = data.data.transportes;
                    const fallbackBase = this.userLocation || this.defaultCenter;
                    let fallbackCount = 0;
                    
                    // Mapear transportes da API para o formato do mapa
                    transportes.forEach(t => {
                        // Obter coordenadas
                        let position = null;
                        if (t.localizacao?.latitude && t.localizacao?.longitude) {
                            position = [t.localizacao.latitude, t.localizacao.longitude];
                        } else if (t.rota?.coordenadasOrigem) {
                            position = [t.rota.coordenadasOrigem.latitude, t.rota.coordenadasOrigem.longitude];
                        } else if (t.pacote?.coordenadasPartida) {
                            position = [t.pacote.coordenadasPartida.latitude, t.pacote.coordenadasPartida.longitude];
                        }
                        
                        if (!position && Array.isArray(fallbackBase)) {
                            const jitterFactor = 0.0035 * ((fallbackCount % 4) + 1);
                            const angle = (fallbackCount % 8) * (Math.PI / 4);
                            position = [
                                fallbackBase[0] + Math.sin(angle) * jitterFactor,
                                fallbackBase[1] + Math.cos(angle) * jitterFactor
                            ];
                            fallbackCount++;
                        }

                        if (!position) {
                            return;
                        }
                        
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
                        
                        const transport = {
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
                        
                        this.addTransportMarker(transport);
                    });
                    
                    // Centralizar nos resultados se houver marcadores
                    if (this.markers.length > 0) {
                        this.centerOnResults();
                    }
                    
                    console.log(`Carregados ${this.markers.length} transportes do servidor`);
                    return;
                }
            }
        } catch (error) {
            console.warn('Erro ao carregar transportes da API, sem marcadores iniciais:', error);
        }
    }
    
    addTransportMarker(transport) {
        const icon = this.getMarkerIcon(transport.type);
        const markerId = transport.id || `marker-${this.markers.length}`;
        transport.id = markerId;
        this.transportData.set(String(markerId), transport);
        
        const marker = L.marker(transport.position, { icon: icon })
            .addTo(this.map)
            .bindPopup(this.createTransportPopup(transport));
        
        this.markers.push(marker);
        return marker;
    }
    
    getMarkerIcon(type) {
        const color = type === 'escolar' ? '#28a745' : '#007bff';
        const emoji = type === 'escolar' ? '🚌' : '🚐';
        
        return L.divIcon({
            html: `
                <div style="
                    width: 40px; 
                    height: 40px; 
                    background: ${color}; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 18px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">${emoji}</div>
            `,
            className: 'transport-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    }
    
    createTransportPopup(transport) {
        const badgeClass = transport.type === 'escolar' ? 'badge-escolar' : 'badge-excursao';
        const badgeText = transport.type === 'escolar' ? 'Transporte Escolar' : 'Excursão & Fretamento';
        const badgeColor = transport.type === 'escolar' ? '#28a745' : '#007bff';
        const routeName = transport.routeInfo?.active?.nome || transport.routeInfo?.default?.nome || transport.displayRouteName || transport.name;
        const stops = transport.routeInfo?.active?.total_paradas ?? transport.routeInfo?.default?.total_paradas ?? transport.routeInfo?.totalStops;
        const stopsLabel = typeof stops === 'number' ? `${stops} parada${stops === 1 ? '' : 's'}` : 'Paradas não informadas';
        const statusLabel = transport.routeInfo?.active ? 'Rota em andamento' : 'Rota padrão';
        const transportIdLiteral = JSON.stringify(String(transport.id));
        
        return `
            <div style="max-width: 300px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #333; font-size: 16px;">${transport.name}</h4>
                    <span style="background: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">${badgeText}</span>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <span style="color: #ffc107;">⭐ ${transport.rating}</span>
                    <span style="color: #666; margin-left: 5px;">(${transport.reviews} avaliações)</span>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <div style="margin-bottom: 5px;"><strong>👥</strong> ${transport.capacity}</div>
                    <div style="margin-bottom: 5px;"><strong>💰</strong> ${transport.price}</div>
                    <div><strong>✅</strong> ${transport.features.join(', ')}</div>
                </div>

                <div style="margin-bottom: 10px;">
                    <div style="margin-bottom: 5px;"><strong>🛣️</strong> ${routeName}</div>
                    <div style="margin-bottom: 5px;"><strong>⛔</strong> ${stopsLabel}</div>
                    <div><strong>📌</strong> ${statusLabel}</div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button onclick="mapsIntegration.handleRouteButton(${transportIdLiteral})" 
                            style="flex: 1; padding: 8px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🗺️ Rota
                    </button>
                    <button onclick="mapsIntegration.contactTransport(${transportIdLiteral})" 
                            style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        📞 Contato
                    </button>
                </div>
            </div>
        `;
    }
    
    showRoute(lat, lng) {
        if (!this.userLocation) {
            this.showMessage('Primeiro permita o acesso à sua localização', 'warning');
            this.getCurrentLocation(true);
            return;
        }
        
        // Remover rota anterior se existir
        if (this.routeControl) {
            this.map.removeControl(this.routeControl);
        }
        
        // Criar nova rota usando Leaflet Routing Machine (simulação)
        const destination = [lat, lng];
        
        // Calcular distância aproximada
        const distance = this.calculateDistance(this.userLocation, destination);
        const duration = Math.round(distance * 2); // Estimativa: 2 min por km
        
        // Criar linha da rota
        const routeLine = L.polyline([this.userLocation, destination], {
            color: '#667eea',
            weight: 4,
            opacity: 0.8
        }).addTo(this.map);
        
        // Ajustar visualização para mostrar a rota
        this.map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
        
        this.showMessage(`Rota calculada: ${distance.toFixed(1)} km - ${duration} min`, 'success');
        
        // Remover rota após 10 segundos
        setTimeout(() => {
            this.map.removeLayer(routeLine);
        }, 10000);
    }
    
    calculateDistance(pos1, pos2) {
        const R = 6371; // Raio da Terra em km
        const dLat = this.deg2rad(pos2[0] - pos1[0]);
        const dLon = this.deg2rad(pos2[1] - pos1[1]);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(pos1[0])) * Math.cos(this.deg2rad(pos2[0])) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    deg2rad(deg) {
        return deg * (Math.PI/180);
    }
    
    handleRouteButton(transportId) {
        const key = String(transportId);
        const transport = this.transportData.get(key);
        if (!transport) {
            this.showMessage('Não encontramos os dados desta rota.', 'warning');
            return;
        }

        const activeRoute = transport.routeInfo?.active || null;
        const defaultRoute = transport.routeInfo?.default || null;
        const selectedRoute = activeRoute || defaultRoute;

        if (selectedRoute) {
            this.showRouteDetailsPanel(transport, selectedRoute, Boolean(activeRoute));
        }

        // Check for explicit route coordinates (Excursion or School Route)
        if (transport.routeCoordinates && transport.routeCoordinates.origin && transport.routeCoordinates.destination) {
             this.drawRoutePath(transport.routeCoordinates.origin, transport.routeCoordinates.destination);
        } else if (Array.isArray(transport.position)) {
            // Fallback to user -> transport direction
            this.showRoute(transport.position[0], transport.position[1]);
        } else {
             this.showMessage('Localização da rota não disponível.', 'warning');
        }
    }

    drawRoutePath(origin, dest) {
        // Remover rota anterior se existir
        if (this.routeControl) {
            this.map.removeControl(this.routeControl);
        }
        
        // Remover linha anterior se existir
        if (this.currentRouteLine) {
            this.map.removeLayer(this.currentRouteLine);
        }

        const originLatLng = [origin.latitude, origin.longitude];
        const destLatLng = [dest.latitude, dest.longitude];

        // Criar linha da rota
        this.currentRouteLine = L.polyline([originLatLng, destLatLng], {
            color: '#667eea',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10' // Linha tracejada para indicar trajeto planejado
        }).addTo(this.map);
        
        // Ajustar visualização
        this.map.fitBounds(this.currentRouteLine.getBounds(), { padding: [50, 50] });
        
        const distance = this.calculateDistance(originLatLng, destLatLng);
        this.showMessage(`Trajeto visualizado: ${distance.toFixed(1)} km`, 'success');
    }

    contactTransport(transportId) {
        const key = String(transportId);
        const transport = this.transportData.get(key);
        if (!transport) {
            this.showMessage('Dados de contato indisponíveis para este transportador.', 'warning');
            return;
        }

        const whatsappLink = transport.contact?.whatsapp_link || transport.contact?.whatsappLink;
        if (!whatsappLink) {
            this.showMessage('Este transportador não divulgou um WhatsApp público.', 'warning');
            return;
        }

        const mensagem = encodeURIComponent(`Olá ${transport.name}, encontrei seu transporte na Kanghoo e gostaria de falar sobre ${transport.displayRouteName || 'sua rota'}.`);
        const link = whatsappLink.includes('text=') ? whatsappLink : `${whatsappLink}${whatsappLink.includes('?') ? '&' : '?'}text=${mensagem}`;

        this.showMessage('Redirecionando para o WhatsApp do transportador...', 'info');
        setTimeout(() => {
            window.open(link, '_blank', 'noopener');
        }, 1000);
    }
    
    centerOnResults() {
        if (this.markers.length === 0) {
            this.showMessage('Nenhum resultado para centralizar', 'warning');
            return;
        }
        
        const group = new L.featureGroup(this.markers);
        
        // Incluir localização do usuário se disponível
        if (this.userLocationMarker) {
            group.addLayer(this.userLocationMarker);
        }
        
        this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
    
    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
        this.transportData = new Map();
    }
    
    onMapClick(event) {
        // Implementar ações no click do mapa se necessário
        console.log('Clique no mapa:', event.latlng);
    }
    
    showMapError() {
        const loadingElement = document.getElementById('map-loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="text-align: center; color: #dc3545;">
                    <h3>❌ Erro ao carregar mapa</h3>
                    <p>Não foi possível carregar o mapa</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    ensureStatusOverlay(mapElement = null) {
        if (this.statusOverlay) return this.statusOverlay;
        const host = mapElement || document.getElementById('google-map');
        if (!host) return null;
        host.style.position = host.style.position || 'relative';
        const overlay = document.createElement('div');
        overlay.id = 'map-status-overlay';
        overlay.style.cssText = `
            position: absolute;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.35);
            color: #fff;
            z-index: 999;
            text-align: center;
            padding: 1rem;
            backdrop-filter: blur(2px);
        `;
        host.appendChild(overlay);
        this.statusOverlay = overlay;
        return overlay;
    }

    ensureRouteDetailsPanel() {
        if (this.routeDetailsPanel) return this.routeDetailsPanel;
        const host = document.getElementById('google-map');
        if (!host) return null;
        host.style.position = host.style.position || 'relative';
        const panel = document.createElement('div');
        panel.id = 'map-route-details';
        panel.style.cssText = `
            position: absolute;
            bottom: 12px;
            right: 12px;
            min-width: 240px;
            max-width: 320px;
            background: rgba(0, 0, 0, 0.75);
            color: #fff;
            padding: 14px;
            border-radius: 12px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.35);
            display: none;
            flex-direction: column;
            gap: 6px;
            z-index: 902;
        `;
        host.appendChild(panel);
        this.routeDetailsPanel = panel;
        return panel;
    }

    showRouteDetailsPanel(transport, route, isActiveRoute = false) {
        const panel = this.ensureRouteDetailsPanel();
        if (!panel) return;
        const stops = route.total_paradas ?? transport.routeInfo?.totalStops ?? '-';
        const stopsLabel = typeof stops === 'number' ? `${stops} parada${stops === 1 ? '' : 's'}` : 'Paradas não informadas';
        const horario = route.horario_ida || route.horario_volta
            ? `${route.horario_ida || ''}${route.horario_ida && route.horario_volta ? ' - ' : ''}${route.horario_volta || ''}`.trim()
            : 'Horário não informado';

        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>${transport.name}</strong>
                <button onclick="mapsIntegration.hideRouteDetailsPanel()" style="background:transparent;border:none;color:#fff;font-size:12px;cursor:pointer;">Fechar ✕</button>
            </div>
            <div style="font-size:12px;color:${isActiveRoute ? '#7bf59d' : '#9ec5ff'};">
                ${isActiveRoute ? 'Rota em andamento' : 'Rota padrão'}
            </div>
            <div>🛣️ ${route.nome || transport.displayRouteName || 'Rota cadastrada'}</div>
            <div>⛔ ${stopsLabel}</div>
            <div>🕘 ${horario}</div>
        `;

        panel.style.display = 'flex';
        if (this.routePanelTimer) {
            clearTimeout(this.routePanelTimer);
        }
        this.routePanelTimer = setTimeout(() => this.hideRouteDetailsPanel(), 12000);
    }

    hideRouteDetailsPanel() {
        if (this.routeDetailsPanel) {
            this.routeDetailsPanel.style.display = 'none';
        }
        if (this.routePanelTimer) {
            clearTimeout(this.routePanelTimer);
            this.routePanelTimer = null;
        }
    }

    setStatus(state = 'ready', message = '') {
        const overlay = this.ensureStatusOverlay();
        if (!overlay) return;
        if (state === 'ready') {
            overlay.style.display = 'none';
            return;
        }
        const palette = {
            loading: '#7c5dff',
            error: '#ff5563',
            empty: '#999',
            warning: '#ffb347'
        };
        const label = state === 'loading'
            ? 'Carregando mapa...'
            : state === 'empty'
                ? 'Nenhum transporte encontrado'
                : 'Aviso';

        overlay.innerHTML = `
            <div style="
                background: rgba(0,0,0,0.65);
                padding: 1rem 1.5rem;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.2);
                box-shadow: 0 10px 30px rgba(0,0,0,0.35);
            ">
                <strong style="display:block;margin-bottom:0.35rem;">${label}</strong>
                <small>${message || 'Aguardando dados do mapa'}</small>
            </div>
        `;
        overlay.style.display = 'flex';
        overlay.style.background = state === 'loading'
            ? 'rgba(124,93,255,0.15)'
            : state === 'error'
                ? 'rgba(255,85,99,0.15)'
                : 'rgba(0,0,0,0.35)';
        overlay.style.color = palette[state] || '#fff';
    }

    setRealtimeBadge(label = '') {
        const host = document.getElementById('google-map');
        if (!host) return;
        if (!this.realtimeBadge) {
            const badge = document.createElement('div');
            badge.id = 'map-realtime-badge';
            badge.style.cssText = `
                position: absolute;
                bottom: 12px;
                left: 12px;
                padding: 6px 10px;
                border-radius: 10px;
                background: rgba(0,0,0,0.65);
                color: #fff;
                font-size: 12px;
                z-index: 901;
                letter-spacing: 0.3px;
            `;
            host.appendChild(badge);
            this.realtimeBadge = badge;
        }
        this.realtimeBadge.textContent = label;
        this.realtimeBadge.style.display = label ? 'inline-flex' : 'none';
    }

    showMessage(message, type = 'info') {
        // Criar ou atualizar elemento de mensagem
        let messageElement = document.getElementById('map-message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'map-message';
            messageElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(messageElement);
        }
        
        // Definir cor baseada no tipo
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        messageElement.style.backgroundColor = colors[type] || colors.info;
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        // Auto-hide após 3 segundos
        setTimeout(() => {
            if (messageElement) {
                messageElement.style.display = 'none';
            }
        }, 3000);
    }
    
    // Método para buscar endereços (simulação de autocomplete)
    searchAddress(query) {
        // Em uma implementação real, você usaria uma API de geocoding
        // Por enquanto, vamos simular alguns resultados
        const mockResults = [
            { name: 'Centro, Tubarão - SC', lat: -28.4773, lng: -49.0068 },
            { name: 'Oficinas, Tubarão - SC', lat: -28.4821, lng: -49.0214 },
            { name: 'Humaitá de Cima, Tubarão - SC', lat: -28.4598, lng: -48.9994 }
        ];
        
        return mockResults.filter(result => 
            result.name.toLowerCase().includes(query.toLowerCase())
        );
    }
}

// Inicializar quando a página carregar
let mapsIntegration;

// Função para aguardar o carregamento do Leaflet
function waitForLeafletAndInit() {
    if (typeof L === 'undefined') {
        console.log('Aguardando Leaflet carregar...');
        setTimeout(waitForLeafletAndInit, 100);
        return;
    }
    
    if (!mapsIntegration) {
        mapsIntegration = new MapsIntegration();
    }
}

// Aguardar DOM e Leaflet
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForLeafletAndInit);
} else {
    waitForLeafletAndInit();
}

// Manter compatibilidade com possíveis chamadas do Google Maps
window.initMap = function() {
    if (mapsIntegration) {
        mapsIntegration.initializeMap();
    }
};
