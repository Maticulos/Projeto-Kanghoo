const APP_CONFIG = window.APP_CONFIG || {};
const API_BASE = APP_CONFIG.apiBasePath || '/api';
const DEMO_MODE = !!APP_CONFIG.demoMode;
let activeTripId = null;
let chatClient = null;
let pendingAbsence = null;
let excursionTrackingInterval = null;

const excursionData = {
    status: {
        destination: 'Campos do Jordão',
        departure: '08:00',
        returnTime: '18:00',
        meetingPoint: 'Terminal Rodoviário - São Paulo',
        passengers: 25
    },
    kpis: [
        { label: 'Passageiros presentes', value: 22, suffix: '/25', trend: '+2 confirmados', type: 'success' },
        { label: 'Distância prevista', value: 180, suffix: ' km', trend: 'Trecho ida + volta', type: 'info' },
        { label: 'Consumo estimado', value: 48, suffix: ' L', trend: 'Motor calibrado', type: 'info' },
        { label: 'Satisfação prevista', value: 4.8, precision: 1, suffix: '/5', trend: 'Última excursão', type: 'success' }
    ],
    passengers: [
        { id: 1, name: 'Ana Silva', age: 28, phone: '(11) 99999-1111', status: 'checked-in' },
        { id: 2, name: 'Carlos Santos', age: 35, phone: '(11) 99999-2222', status: 'checked-out' },
        { id: 3, name: 'Maria Oliveira', age: 42, phone: '(11) 99999-3333', status: 'checked-in' },
        { id: 4, name: 'João Costa', age: 31, phone: '(11) 99999-4444', status: 'checked-in' }
    ],
    documents: [
        { label: 'Carteira Nacional de Habilitação', status: 'Enviado em 15/03/2024', state: 'success' },
        { label: 'Certificado de Registro e Licenciamento', status: 'Enviado em 15/03/2024', state: 'success' },
        { label: 'Certidão de Antecedentes Criminais', status: 'Pendente de envio', state: 'warning' }
    ],
    trips: [
        { date: '2025-01-15', destination: 'Campos do Jordão', passengers: 25, distance: '180 km', status: 'Concluída', rating: '4.8' },
        { date: '2025-01-12', destination: 'Santos', passengers: 30, distance: '85 km', status: 'Concluída', rating: '4.9' },
        { date: '2025-01-10', destination: 'Aparecida', passengers: 40, distance: '170 km', status: 'Concluída', rating: '4.7' },
        { date: '2025-01-08', destination: 'Guarujá', passengers: 28, distance: '95 km', status: 'Concluída', rating: '4.6' }
    ],
    charts: {
        route: {
            labels: ['Saída', 'Pedágio 1', 'Parada técnica', 'Mirante', 'Destino'],
            values: [0, 60, 95, 150, 180]
        },
        finance: {
            labels: ['Receita', 'Custos', 'Lucro'],
            values: [12500, 4200, 8300]
        }
    }
};

function bindLogoutButton() {
    const btns = document.querySelectorAll(".js-logout-btn, #logout-btn");
    btns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (window.PostAuth?.logout) {
                window.PostAuth.logout();
            } else {
                localStorage.removeItem("authToken");
                window.location.href = "login.html";
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await PostAuth.ensureAuthContext();
    bindLogoutButton();
    // Em produção, aqui poderíamos carregar viagens/rotas reais
    await loadRealData();
    buildExcursionPage();
    if (DEMO_MODE) {
        PostAuth.startDemoEvents();
    }
});

async function loadRealData() {
    if (DEMO_MODE) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE}/rastreamento/historico?pagina=1&limite=5`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const hist = data?.historico || [];
        if (hist.length) {
            excursionData.trips = hist.map((v) => ({
                id: v.id || v.viagem_id,
                rota_id: v.rota_id,
                date: v.data_viagem || '',
                destination: v.nome_rota || v.rota_id || 'Viagem',
                passengers: v.total_criancas || '-',
                distance: v.distancia_total_km ? `${v.distancia_total_km} km` : '-',
                status: v.status || 'em andamento',
                rating: v.avaliacao || ''
            }));
            excursionData.status.destination = hist[0].nome_rota || excursionData.status.destination;
            excursionData.status.viagem_id = hist[0].id || hist[0].viagem_id;
            excursionData.status.rota_id = hist[0].rota_id;
            activeTripId = excursionData.status.viagem_id || null;
        }
    } catch (e) {
        console.warn('Falha ao carregar viagens reais, mantendo demo:', e);
    }
}

function buildExcursionPage() {
    renderStatus();
    renderKpis();
    renderPassengers();
    renderDocuments();
    renderHistory();
    renderTripSelector();
    renderCharts();
    setupSheet();
    setupActions();
    setupChatUi();
    setupAbsenceModal();
    PostAuth.observe(document.querySelectorAll('[data-animate]'));
}

function renderStatus() {
    document.getElementById('status-departure').textContent = excursionData.status.departure;
    document.getElementById('status-return').textContent = excursionData.status.returnTime;
    document.getElementById('status-meeting').textContent = excursionData.status.meetingPoint;
    const tripLabel = document.getElementById('status-trip-id');
    const routeLabel = document.getElementById('status-route-id');
    if (tripLabel) tripLabel.textContent = activeTripId || excursionData.status.viagem_id || '-';
    if (routeLabel) routeLabel.textContent = excursionData.status.rota_id || '-';

    setTimeout(() => {
        document.querySelector('.status-banner').classList.add('is-visible');
    }, 300);
}

function renderKpis() {
    const grid = document.getElementById('kpi-grid');
    grid.innerHTML = excursionData.kpis.map(kpi => `
        <article class="kpi-card">
            <small style="color:var(--text-muted);">${kpi.label}</small>
            <strong data-precision="${kpi.precision || 0}" data-kpi>${kpi.value}</strong>
            <p style="margin:0.25rem 0 0;color:${kpi.type === 'success' ? 'var(--success)' : 'var(--text-muted)'};">${kpi.trend}</p>
        </article>
    `).join('');

    grid.querySelectorAll('[data-kpi]').forEach((node, index) => {
        PostAuth.animateCounter(node, excursionData.kpis[index].value, 1000 + index * 80);
    });
}

function renderPassengers() {
    const grid = document.getElementById('passenger-grid');
    grid.innerHTML = excursionData.passengers.map(passenger => `
        <div class="passenger-tile" data-status="${passenger.status}">
            <header>
                <div>
                    <strong>${passenger.name}</strong>
                    <p style="color:var(--text-muted);margin:0;">${passenger.age} anos</p>
                </div>
                <span class="badge ${passenger.status === 'checked-in' ? 'success' : 'warning'}">
                    ${passenger.status === 'checked-in' ? 'A bordo' : 'Não está no veículo'}
                </span>
            </header>
            <p style="color:var(--text-muted);margin:0;">${passenger.phone}</p>
            <button data-passenger="${passenger.id}">
                ${passenger.status === 'checked-in' ? 'Registrar saída' : 'Confirmar embarque'}
            </button>
        </div>
    `).join('');

    grid.querySelectorAll('button[data-passenger]').forEach(button => {
        button.addEventListener('click', () => togglePassengerStatus(Number(button.dataset.passenger)));
    });
}

function renderDocuments() {
    const list = document.getElementById('document-grid');
    list.innerHTML = excursionData.documents.map(doc => `
        <div class="document-row">
            <strong>${doc.label}</strong>
            <p style="color:var(--text-muted);margin:0.25rem 0;">${doc.status}</p>
            <span class="badge ${doc.state}">${doc.state === 'success' ? 'Em dia' : 'Pendente'}</span>
        </div>
    `).join('');
}

function renderHistory() {
    const body = document.querySelector('#history-table tbody');
    body.innerHTML = excursionData.trips.map(trip => `
        <tr>
            <td>${trip.date}</td>
            <td>${trip.destination}</td>
            <td>${trip.id || '-'}</td>
            <td>${trip.rota_id || '-'}</td>
            <td>${trip.passengers}</td>
            <td>${trip.distance}</td>
            <td><span class="badge success">${trip.status}</span></td>
            <td>★ ${trip.rating || '-'}</td>
        </tr>
    `).join('');
}

function renderTripSelector() {
    const banner = document.querySelector('.status-meta');
    if (!banner) return;
    let select = document.getElementById('trip-select');
    if (!select) {
        select = document.createElement('select');
        select.id = 'trip-select';
        select.style.marginTop = '0.5rem';
        select.style.padding = '0.35rem';
        select.style.borderRadius = '8px';
        banner.appendChild(select);
    }
    select.innerHTML = excursionData.trips.map(t => `<option value="${t.id || ''}">${t.date || 'Viagem'} - ${t.destination}</option>`).join('');
    select.addEventListener('change', () => {
        activeTripId = select.value || null;
        const selected = excursionData.trips.find(t => String(t.id) === select.value);
        if (selected) {
            excursionData.status.viagem_id = selected.id;
            excursionData.status.rota_id = selected.rota_id;
            renderStatus();
        }
    });
    if (activeTripId) {
        select.value = activeTripId;
    }
}

function renderCharts() {
    const routeCtx = document.getElementById('map-line');
    if (routeCtx && window.Chart) {
        new Chart(routeCtx, {
            type: 'line',
            data: {
                labels: excursionData.charts.route.labels,
                datasets: [{
                    label: 'Distância acumulada (km)',
                    data: excursionData.charts.route.values,
                    borderColor: '#23c8ff',
                    backgroundColor: 'rgba(35, 200, 255, 0.15)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: chartOptions()
        });
    }

    const financeCtx = document.getElementById('finance-chart');
    if (financeCtx && window.Chart) {
        new Chart(financeCtx, {
            type: 'bar',
            data: {
                labels: excursionData.charts.finance.labels,
                datasets: [{
                    data: excursionData.charts.finance.values,
                    backgroundColor: ['#2bd19c', '#ffb347', '#7c5dff']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { display: false } },
                    y: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { color: 'rgba(255,255,255,0.07)' } }
                }
            }
        });
    }
}

function setupSheet() {
    const sheet = document.getElementById('route-sheet');
    const openButtons = [document.getElementById('open-route-sheet'), ...document.querySelectorAll('[data-action="open-sheet"]')];
    const closeButtons = [document.getElementById('close-sheet'), document.getElementById('cancel-sheet')];

    openButtons.forEach(btn => btn?.addEventListener('click', () => sheet.classList.add('is-open')));
    closeButtons.forEach(btn => btn?.addEventListener('click', () => sheet.classList.remove('is-open')));
    sheet.addEventListener('click', event => {
        if (event.target === sheet) sheet.classList.remove('is-open');
    });

    document.getElementById('route-form').addEventListener('submit', async event => {
        event.preventDefault();
        sheet.classList.remove('is-open');
        const formData = new FormData(event.target);
        const body = {
            destino: formData.get('destination'),
            data: formData.get('date'),
            horario_inicio: formData.get('start'),
            horario_fim: formData.get('end'),
            ponto_encontro: formData.get('meeting'),
            max_passageiros: Number(formData.get('max')),
            observacoes: formData.get('notes')
        };
        if (DEMO_MODE) {
            excursionData.trips.unshift({
                id: `demo-${Date.now()}`,
                rota_id: `demo-rota-${Date.now()}`,
                date: body.data,
                destination: body.destino,
                passengers: body.max_passageiros,
                distance: '-',
                status: 'Planejada',
                rating: ''
            });
            renderHistory();
            PostAuth.showToast('Excursão criada (demo).', 'success');
            event.target.reset();
            return;
        }
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/rastreamento/viagens`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await loadRealData();
            renderHistory();
            PostAuth.showToast('Excursão criada com sucesso!', 'success');
            event.target.reset();
        } catch (err) {
            console.warn(err);
            PostAuth.showToast('Falha ao criar excursão.', 'danger');
        }
    });
}

function setupActions() {
    const startBtn = document.querySelector('[data-action="start-trip"]');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            if (DEMO_MODE) {
                activeTripId = 'demo-trip';
                PostAuth.showToast('Excursão iniciada (demo). Dados simulados sincronizados.', 'success');
                startExcursionTracking();
                return;
            }
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            try {
            const res = await fetch(`${API_BASE}/rastreamento/viagens/iniciar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rota_id: excursionData?.status?.rota_id || 1, tipo_viagem: 'ida' })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const payload = await res.json().catch(() => ({}));
            activeTripId = payload.viagem_id || payload.id || payload.data?.id || payload?.viagem?.id || activeTripId;
            PostAuth.showToast('Excursão iniciada.', 'success');
            startExcursionTracking();
            initChatChannel();
        } catch (err) {
            PostAuth.showToast('Não foi possível iniciar a excursão.', 'danger');
            }
        });
    }

    const finishBtn = document.querySelector('[data-action="finish-trip"]');
    if (finishBtn) {
        finishBtn.addEventListener('click', async () => {
            if (DEMO_MODE) {
                PostAuth.showToast('Excursão finalizada (demo).', 'success');
                return;
            }
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            const tripId = activeTripId || excursionData?.status?.viagem_id || excursionData?.trips?.[0]?.id;
            if (!tripId) {
                PostAuth.showToast('Nenhuma viagem ativa encontrada para finalizar.', 'warning');
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/motorista-excursao/excursoes/${tripId}/finalizar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || `HTTP ${res.status}`);
                }

                PostAuth.showToast('Excursão finalizada com sucesso!', 'success');
                activeTripId = null;
                stopExcursionTracking();
                updateChatChannelLabel();
                
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                console.error(err);
                PostAuth.showToast(`Falha ao finalizar: ${err.message}`, 'danger');
            }
        });
    }

    document.getElementById('add-passenger')?.addEventListener('click', () => {
        PostAuth.showToast('Funcionalidade de adicionar passageiros em breve.', 'info');
    });

    document.getElementById('contact-support')?.addEventListener('click', () => {
        PostAuth.showToast('Time de suporte foi notificado.', 'info');
    });

    document.getElementById('generate-report')?.addEventListener('click', () => {
        PostAuth.showToast('Relatório financeiro exportado!', 'success');
    });
}

function togglePassengerStatus(id) {
    const passenger = excursionData.passengers.find(item => item.id === id);
    if (!passenger) return;
    if (passenger.status === 'checked-in') {
        pendingAbsence = passenger;
        openAbsenceModal();
    } else {
        passenger.status = 'checked-in';
        renderPassengers();
        publishPassengerStatus(passenger);
        PostAuth.showToast(`Status de ${passenger.name} atualizado.`, 'success');
    }
}

async function publishPassengerStatus(passenger) {
    if (DEMO_MODE || !activeTripId) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const endpoint = passenger.status === 'checked-in' ? 'embarque' : 'desembarque';
    const body = {
        viagem_id: activeTripId,
        crianca_id: passenger.id,
        presente: passenger.status === 'checked-in',
        motivo: passenger.status === 'checked-in' ? '' : 'Ausente informado pelo motorista'
    };
    try {
        await fetch(`${API_BASE}/conferencia/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        PostAuth.notifyEvent({
            tipo: endpoint,
            viagem_id: activeTripId,
            crianca_id: passenger.id,
            presente: passenger.status === 'checked-in'
        });
    } catch (err) {
        console.warn('Checklist nao sincronizado:', err);
    }
}

function setupChatUi() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const list = document.getElementById('chat-messages');
    if (!form || !input || !list) return;

    PostAuth.onChatMessage((payload) => {
        if (payload.canal && payload.canal !== (activeTripId || 'demo-canal-excursao')) return;
        const item = document.createElement('div');
        item.className = `chat-bubble ${payload.origem === 'motorista' ? 'mine' : 'theirs'}`;
        item.textContent = payload.mensagem || '';
        list.appendChild(item);
        list.scrollTop = list.scrollHeight;
    });

    form.addEventListener('submit', (evt) => {
        evt.preventDefault();
        if (!input.value.trim()) return;
        if (chatClient?.send) chatClient.send(input.value.trim());
        input.value = '';
    });
    initChatChannel();
}

function initChatChannel() {
    const channel = activeTripId || 'demo-canal-excursao';
    updateChatChannelLabel(channel);
    chatClient = PostAuth.initChat(channel);
}

function updateChatChannelLabel(channel = null) {
    const label = document.getElementById('chat-channel-label');
    if (label) {
        label.textContent = `Canal: ${channel || 'aguardando viagem'}`;
    }
}

function setupAbsenceModal() {
    const modal = document.getElementById('absence-modal');
    if (!modal) return;
    const cancel = document.getElementById('absence-cancel');
    const confirm = document.getElementById('absence-confirm');
    cancel?.addEventListener('click', closeAbsenceModal);
    confirm?.addEventListener('click', () => {
        if (!pendingAbsence) return closeAbsenceModal();
        const reason = document.querySelector('input[name=\"absence-reason\"]:checked')?.value || 'Ausência';
        const notes = document.getElementById('absence-notes')?.value || '';
        pendingAbsence.status = 'checked-out';
        pendingAbsence.motivo = `${reason}${notes ? ' - ' + notes : ''}`;
        renderPassengers();
        publishPassengerStatus(pendingAbsence);
        PostAuth.showToast(`Ausência registrada: ${pendingAbsence.name}`, 'info');
        pendingAbsence = null;
        closeAbsenceModal();
    });
}

function openAbsenceModal() {
    const modal = document.getElementById('absence-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAbsenceModal() {
    const modal = document.getElementById('absence-modal');
    if (modal) modal.style.display = 'none';
}

function startExcursionTracking() {
    if (excursionTrackingInterval) clearInterval(excursionTrackingInterval);
    excursionTrackingInterval = setInterval(sendExcursionLocation, DEMO_MODE ? 8000 : 15000);
    sendExcursionLocation();
}

function stopExcursionTracking() {
    if (excursionTrackingInterval) clearInterval(excursionTrackingInterval);
    excursionTrackingInterval = null;
}

async function sendExcursionLocation() {
    if (!activeTripId) return;
    const token = localStorage.getItem('authToken');
    if (!token && !DEMO_MODE) return;
    const coords = DEMO_MODE ? mockExcursionCoords() : await getCurrentPositionSafe();
    if (!coords) return;
    if (!DEMO_MODE) {
        try {
            await fetch(`${API_BASE}/rastreamento/localizacao`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    velocidade: coords.speed || 0,
                    viagem_id: activeTripId
                })
            });
        } catch (_) { /* silencioso */ }
    }
    if (window.mapsIntegration?.addMarker) {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        if (!window.mapsIntegration.markers?.get('excursao')) {
            window.mapsIntegration.addMarker('excursao', pos, { title: 'Excursão em andamento' });
        } else {
            window.mapsIntegration.updateMarker('excursao', pos);
        }
        window.mapsIntegration.centerMap?.(pos);
    }
    if (DEMO_MODE) {
        PostAuth.notifyEvent({ tipo: 'rastreamento_demo', viagem_id: activeTripId, latitude: coords.latitude, longitude: coords.longitude });
    }
}

function mockExcursionCoords() {
    const base = { latitude: -23.5505, longitude: -46.6333 };
    const jitter = (Math.random() - 0.5) * 0.01;
    return { latitude: base.latitude + jitter, longitude: base.longitude + jitter, speed: Math.random() * 30 };
}

function getCurrentPositionSafe() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                speed: pos.coords.speed
            }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
    });
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: {
                ticks: { color: 'rgba(255,255,255,0.7)' },
                grid: { color: 'rgba(255,255,255,0.06)' }
            },
            y: {
                ticks: { color: 'rgba(255,255,255,0.7)' },
                grid: { color: 'rgba(255,255,255,0.06)' }
            }
        }
    }
}

