/**
 * Integração com Mapas usando Leaflet (OpenStreetMap)
 * Funcionalidades: Mapa interativo, marcadores, geolocalização, rotas
 */

class MapsIntegration {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userLocationMarker = null;
        this.userLocation = null;
        this.routeControl = null;
        
        // Configurações padrão
        this.defaultCenter = [-23.5505, -46.6333]; // São Paulo [lat, lng]
        this.defaultZoom = 12;
        
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
        this.initializeMap();
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
        // Localização padrão: São Paulo, Brasil
        const defaultLocation = [-23.5505, -46.6333];
        
        // Centralizar mapa na localização padrão
        this.map.setView(defaultLocation, 11);
        
        console.info('Usando localização padrão: São Paulo, Brasil');
    }
    
    loadSampleMarkers() {
        // Dados de exemplo de transportes
        const sampleTransports = [
            {
                id: 1,
                name: 'Transporte Escolar São João',
                type: 'escolar',
                position: [-23.5505, -46.6333],
                rating: 4.8,
                reviews: 127,
                price: 'R$ 180/mês',
                capacity: 'Até 25 crianças',
                features: ['Ar-condicionado', 'Seguro', 'GPS']
            },
            {
                id: 2,
                name: 'Van Escolar Alegria',
                type: 'escolar',
                position: [-23.5615, -46.6565],
                rating: 4.6,
                reviews: 89,
                price: 'R$ 150/mês',
                capacity: 'Até 15 crianças',
                features: ['Ar-condicionado', 'Wi-Fi']
            },
            {
                id: 3,
                name: 'Excursões Aventura',
                type: 'excursao',
                position: [-23.5395, -46.6103],
                rating: 4.9,
                reviews: 203,
                price: 'R$ 80/pessoa/dia',
                capacity: 'Até 45 pessoas',
                features: ['Ar-condicionado', 'Wi-Fi', 'Seguro']
            },
            {
                id: 4,
                name: 'Turismo & Fretamento Silva',
                type: 'excursao',
                position: [-23.5725, -46.6412],
                rating: 4.7,
                reviews: 156,
                price: 'R$ 120/pessoa/dia',
                capacity: 'Até 50 pessoas',
                features: ['Ar-condicionado', 'Wi-Fi', 'Banheiro']
            }
        ];
        
        // Criar marcadores
        sampleTransports.forEach(transport => {
            this.addTransportMarker(transport);
        });
    }
    
    addTransportMarker(transport) {
        const icon = this.getMarkerIcon(transport.type);
        
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
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button onclick="mapsIntegration.showRoute(${transport.position[0]}, ${transport.position[1]})" 
                            style="flex: 1; padding: 8px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🗺️ Rota
                    </button>
                    <button onclick="mapsIntegration.contactTransport(${transport.id})" 
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
    
    contactTransport(transportId) {
        this.showMessage(`Redirecionando para contato do transporte ID: ${transportId}`, 'info');
        // Aqui você pode implementar a lógica de contato
        // Por exemplo, abrir um modal ou redirecionar para uma página de contato
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
            { name: 'São Paulo, SP', lat: -23.5505, lng: -46.6333 },
            { name: 'Rio de Janeiro, RJ', lat: -22.9068, lng: -43.1729 },
            { name: 'Belo Horizonte, MG', lat: -19.9191, lng: -43.9386 }
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