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

document.addEventListener('DOMContentLoaded', async () => {
    await PostAuth.ensureAuthContext();
    buildExcursionPage();
});

function buildExcursionPage() {
    renderStatus();
    renderKpis();
    renderPassengers();
    renderDocuments();
    renderHistory();
    renderCharts();
    setupSheet();
    setupActions();
    PostAuth.observe(document.querySelectorAll('[data-animate]'));
}

function renderStatus() {
    document.getElementById('status-departure').textContent = excursionData.status.departure;
    document.getElementById('status-return').textContent = excursionData.status.returnTime;
    document.getElementById('status-meeting').textContent = excursionData.status.meetingPoint;

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
            <td>${trip.passengers}</td>
            <td>${trip.distance}</td>
            <td><span class="badge success">${trip.status}</span></td>
            <td>⭐ ${trip.rating}</td>
        </tr>
    `).join('');
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

    document.getElementById('route-form').addEventListener('submit', event => {
        event.preventDefault();
        sheet.classList.remove('is-open');
        PostAuth.showToast('Excursão criada com sucesso!', 'success');
        event.target.reset();
    });
}

function setupActions() {
    document.querySelector('[data-action="start-trip"]')?.addEventListener('click', () => {
        PostAuth.showToast('Excursão iniciada. Dados sincronizados com os responsáveis.', 'success');
    });

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
    passenger.status = passenger.status === 'checked-in' ? 'checked-out' : 'checked-in';
    renderPassengers();
    PostAuth.showToast(`Status de ${passenger.name} atualizado.`, 'success');
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
    };
}
