// Integração com Google Maps API para rastreamento em tempo real
class GoogleMapsIntegration {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.map = null;
        this.markers = new Map();
        this.watchId = null;
        this.isTracking = false;
    }

    // Inicializar o mapa
    async initMap(containerId, options = {}) {
        const defaultOptions = {
            zoom: 13,
            center: { lat: -23.5505, lng: -46.6333 }, // São Paulo como padrão
            mapTypeId: 'roadmap'
        };

        const mapOptions = { ...defaultOptions, ...options };

        // Carregar a API do Google Maps se ainda não foi carregada
        if (!window.google) {
            await this.loadGoogleMapsAPI();
        }

        this.map = new google.maps.Map(document.getElementById(containerId), mapOptions);
        return this.map;
    }

    // Carregar a API do Google Maps dinamicamente
    loadGoogleMapsAPI() {
        return new Promise((resolve, reject) => {
            if (window.google) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=geometry`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Adicionar marcador no mapa
    addMarker(id, position, options = {}) {
        const defaultOptions = {
            position: position,
            map: this.map,
            title: `Localização ${id}`
        };

        const markerOptions = { ...defaultOptions, ...options };
        const marker = new google.maps.Marker(markerOptions);

        this.markers.set(id, marker);
        return marker;
    }

    // Atualizar posição de um marcador
    updateMarker(id, position, options = {}) {
        const marker = this.markers.get(id);
        if (marker) {
            marker.setPosition(position);
            if (options.title) marker.setTitle(options.title);
            if (options.icon) marker.setIcon(options.icon);
        }
    }

    // Remover marcador
    removeMarker(id) {
        const marker = this.markers.get(id);
        if (marker) {
            marker.setMap(null);
            this.markers.delete(id);
        }
    }

    // Centralizar mapa em uma posição
    centerMap(position, zoom = null) {
        this.map.setCenter(position);
        if (zoom) this.map.setZoom(zoom);
    }

    // Ajustar zoom para mostrar todos os marcadores
    fitBounds() {
        if (this.markers.size === 0) return;

        const bounds = new google.maps.LatLngBounds();
        this.markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });
        this.map.fitBounds(bounds);
    }

    // Iniciar rastreamento da localização do usuário
    startLocationTracking(callback, options = {}) {
        if (!navigator.geolocation) {
            throw new Error('Geolocalização não é suportada neste navegador');
        }

        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };

        const trackingOptions = { ...defaultOptions, ...options };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                this.isTracking = true;
                callback(coords, position);
            },
            (error) => {
                console.error('Erro na geolocalização:', error);
                this.isTracking = false;
            },
            trackingOptions
        );
    }

    // Parar rastreamento da localização
    stopLocationTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isTracking = false;
        }
    }

    // Calcular distância entre dois pontos
    calculateDistance(point1, point2) {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(point1.lat, point1.lng),
            new google.maps.LatLng(point2.lat, point2.lng)
        );
        return distance; // retorna em metros
    }

    // Criar rota entre pontos
    createRoute(origin, destination, waypoints = [], options = {}) {
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer(options);
        
        directionsRenderer.setMap(this.map);

        const request = {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true
        };

        return new Promise((resolve, reject) => {
            directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    directionsRenderer.setDirections(result);
                    resolve(result);
                } else {
                    reject(new Error(`Erro ao calcular rota: ${status}`));
                }
            });
        });
    }

    // Adicionar InfoWindow a um marcador
    addInfoWindow(markerId, content) {
        const marker = this.markers.get(markerId);
        if (!marker) return;

        const infoWindow = new google.maps.InfoWindow({
            content: content
        });

        marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
        });

        return infoWindow;
    }

    // Obter endereço a partir de coordenadas (geocoding reverso)
    async getAddressFromCoords(lat, lng) {
        const geocoder = new google.maps.Geocoder();
        const latlng = { lat: lat, lng: lng };

        return new Promise((resolve, reject) => {
            geocoder.geocode({ location: latlng }, (results, status) => {
                if (status === 'OK') {
                    if (results[0]) {
                        resolve(results[0].formatted_address);
                    } else {
                        reject(new Error('Nenhum resultado encontrado'));
                    }
                } else {
                    reject(new Error(`Geocoder falhou: ${status}`));
                }
            });
        });
    }

    // Obter coordenadas a partir de endereço (geocoding)
    async getCoordsFromAddress(address) {
        const geocoder = new google.maps.Geocoder();

        return new Promise((resolve, reject) => {
            geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK') {
                    if (results[0]) {
                        const location = results[0].geometry.location;
                        resolve({
                            lat: location.lat(),
                            lng: location.lng()
                        });
                    } else {
                        reject(new Error('Nenhum resultado encontrado'));
                    }
                } else {
                    reject(new Error(`Geocoder falhou: ${status}`));
                }
            });
        });
    }
}

// Classe específica para motoristas
class MotoristaTracking extends GoogleMapsIntegration {
    constructor(apiKey) {
        super(apiKey);
        this.rotaAtual = null;
        this.criancasEmbarcadas = new Set();
        this.updateInterval = null;
    }

    // Iniciar rastreamento para motorista
    iniciarRastreamento(rotaId) {
        this.rotaAtual = rotaId;
        
        this.startLocationTracking((coords, position) => {
            // Enviar localização para o servidor
            this.enviarLocalizacao(coords, position);
            
            // Atualizar marcador próprio no mapa
            this.updateMarker('motorista', coords, {
                title: 'Minha localização',
                icon: {
                    url: '/images/van-icon.png',
                    scaledSize: new google.maps.Size(40, 40)
                }
            });
        });

        // Atualizar localização a cada 30 segundos
        this.updateInterval = setInterval(() => {
            if (this.isTracking) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.enviarLocalizacao(coords, position);
                });
            }
        }, 30000);
    }

    // Parar rastreamento
    pararRastreamento() {
        this.stopLocationTracking();
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.rotaAtual = null;
    }

    // Enviar localização para o servidor
    async enviarLocalizacao(coords, position) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/rastreamento/localizacao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    latitude: coords.lat,
                    longitude: coords.lng,
                    velocidade: position.coords.speed,
                    direcao: position.coords.heading,
                    rota_id: this.rotaAtual
                })
            });

            if (!response.ok) {
                console.error('Erro ao enviar localização');
            }
        } catch (error) {
            console.error('Erro na comunicação com servidor:', error);
        }
    }

    // Registrar embarque de criança
    async registrarEmbarque(criancaId) {
        try {
            const position = await this.getCurrentPosition();
            const endereco = await this.getAddressFromCoords(position.lat, position.lng);
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/rastreamento/embarque', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    crianca_id: criancaId,
                    latitude: position.lat,
                    longitude: position.lng,
                    local_embarque: endereco
                })
            });

            if (response.ok) {
                this.criancasEmbarcadas.add(criancaId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao registrar embarque:', error);
            return false;
        }
    }

    // Registrar desembarque de criança
    async registrarDesembarque(criancaId, observacoes = '') {
        try {
            const position = await this.getCurrentPosition();
            const endereco = await this.getAddressFromCoords(position.lat, position.lng);
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/rastreamento/desembarque', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    crianca_id: criancaId,
                    latitude: position.lat,
                    longitude: position.lng,
                    local_desembarque: endereco,
                    observacoes: observacoes
                })
            });

            if (response.ok) {
                this.criancasEmbarcadas.delete(criancaId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao registrar desembarque:', error);
            return false;
        }
    }

    // Obter posição atual como Promise
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                reject,
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }
}

// Classe específica para responsáveis
class ResponsavelTracking extends GoogleMapsIntegration {
    constructor(apiKey) {
        super(apiKey);
        this.updateInterval = null;
    }

    // Iniciar monitoramento dos filhos
    iniciarMonitoramento() {
        this.atualizarLocalizacoes();
        
        // Atualizar a cada 1 minuto
        this.updateInterval = setInterval(() => {
            this.atualizarLocalizacoes();
        }, 60000);
    }

    // Parar monitoramento
    pararMonitoramento() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Atualizar localizações dos filhos
    async atualizarLocalizacoes() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/responsavel/localizacao-tempo-real', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.atualizarMarcadores(data.localizacoes);
            }
        } catch (error) {
            console.error('Erro ao atualizar localizações:', error);
        }
    }

    // Atualizar marcadores no mapa
    atualizarMarcadores(localizacoes) {
        // Limpar marcadores antigos
        this.markers.forEach((marker, id) => {
            if (id.startsWith('filho_')) {
                this.removeMarker(id);
            }
        });

        // Adicionar novos marcadores
        localizacoes.forEach(loc => {
            if (loc.latitude && loc.longitude) {
                const markerId = `filho_${loc.crianca_id}`;
                const position = { lat: loc.latitude, lng: loc.longitude };
                
                this.addMarker(markerId, position, {
                    title: `${loc.crianca_nome} - ${loc.motorista_nome}`,
                    icon: {
                        url: '/images/child-icon.png',
                        scaledSize: new google.maps.Size(30, 30)
                    }
                });

                // Adicionar InfoWindow com informações
                const infoContent = `
                    <div>
                        <h4>${loc.crianca_nome}</h4>
                        <p><strong>Motorista:</strong> ${loc.motorista_nome}</p>
                        <p><strong>Rota:</strong> ${loc.nome_rota}</p>
                        <p><strong>Status:</strong> ${loc.status_transporte || 'Não iniciado'}</p>
                        <p><strong>Última atualização:</strong> ${new Date(loc.timestamp_localizacao).toLocaleString()}</p>
                    </div>
                `;
                this.addInfoWindow(markerId, infoContent);
            }
        });

        // Ajustar zoom para mostrar todos os marcadores
        if (this.markers.size > 0) {
            this.fitBounds();
        }
    }
}

// Exportar classes para uso global
window.GoogleMapsIntegration = GoogleMapsIntegration;
window.MotoristaTracking = MotoristaTracking;
window.ResponsavelTracking = ResponsavelTracking;