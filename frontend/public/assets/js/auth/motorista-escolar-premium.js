const APP_CONFIG = window.APP_CONFIG || {};
const API_BASE = APP_CONFIG.apiBasePath || '/api';
const DEMO_MODE = !!APP_CONFIG.demoMode;
let trackingInterval = null;
let currentTripId = null;
let selectedRouteId = null;
let activeConferenceId = null;

let baseStudents = [
    {
        name: 'Ana Clara Rocha',
        grade: '5º ano - Colégio Horizonte',
        stop: 'Rua das Mangueiras, 205',
        guardian: 'Marina Rocha',
        status: 'confirmado',
        eta: '07:05',
        note: 'Check-in automático habilitado'
    },
    {
        name: 'Lia Peixoto',
        grade: '4º ano - Colégio Vivace',
        stop: 'Av. Verona, 109',
        guardian: 'Cláudia Peixoto',
        status: 'aguardando',
        eta: '07:18',
        note: 'Preferência por mensagem SMS'
    },
    {
        name: 'Miguel Costa',
        grade: '6º ano - Colégio Lírio',
        stop: 'Praça Nova Esperança, 14',
        guardian: 'Rafael Costa',
        status: 'confirmado',
        eta: '07:24',
        note: 'Alérgico a amendoim'
    },
    {
        name: 'Helena Barros',
        grade: '2º ano - Colégio Horizonte',
        stop: 'Rua Ipê Roxo, 88',
        guardian: 'Sílvia Barros',
        status: 'em rota',
        eta: '07:33',
        note: 'Precisa desembarque na lateral da escola'
    },
    {
        name: 'Breno Azevedo',
        grade: '5º ano - Colégio Mundo Novo',
        stop: 'Alameda das Bromélias, 300',
        guardian: 'Renata Azevedo',
        status: 'aguardando',
        eta: '07:40',
        note: 'Responsável solicita foto do embarque'
    }
];

let baseGuardians = [
    {
        name: 'Marina Rocha',
        relation: 'Mãe da Ana Clara',
        contact: '(11) 98888-1001',
        channel: 'WhatsApp',
        tags: ['Confirmação automática', 'Turno manhã']
    },
    {
        name: 'Cláudia Peixoto',
        relation: 'Mãe da Lia',
        contact: '(11) 97845-2201',
        channel: 'SMS',
        tags: ['Aviso 15min antes', 'Preferência texto curto']
    },
    {
        name: 'Rafael Costa',
        relation: 'Pai do Miguel',
        contact: '(11) 96660-5521',
        channel: 'WhatsApp',
        tags: ['Recebe relatório diário']
    },
    {
        name: 'Sílvia Barros',
        relation: 'Responsável da Helena',
        contact: '(11) 99001-1198',
        channel: 'App Kanghoo',
        tags: ['Confirma via app', 'Contato imediato']
    }
];

let baseRoutes = [
    {
        name: "Van Azul - Zona Norte",
        window: "07:00 - 09:05",
        students: 26,
        occupancy: 0.82,
        status: "Em preparacao",
        checkpoint: "18/26 check-ins confirmados",
        trend: "+2 novos interessados",
        emphasis: "primary"
    },
    {
        name: "Circuito Leste",
        window: "10:30 - 12:00",
        students: 14,
        occupancy: 0.58,
        status: "Aguardando pais",
        checkpoint: "Checklist liberado",
        trend: "Ultimo atraso ha 12 dias",
        emphasis: "neutral"
    },
    {
        name: "Retorno Vespertino",
        window: "16:10 - 18:45",
        students: 24,
        occupancy: 0.91,
        status: "Planejado",
        checkpoint: "Plano revisado",
        trend: "2 lembretes agendados",
        emphasis: "success"
    }
];

const liveState = { routes: [], students: [] };
let currentRouteId = null;

async function loadLiveData() {
    if (DEMO_MODE) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        const [rotasRes, criancasRes] = await Promise.all([
            fetch(`${API_BASE}/motorista-escolar/rotas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE}/motorista-escolar/criancas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (rotasRes.ok) {
            const rotasJson = await rotasRes.json();
            if (rotasJson?.rotas?.length) {
                liveState.routes = rotasJson.rotas.map(r => ({
                    id: r.id,
                    name: r.nome_rota || 'Rota escolar',
                    window: r.horario_inicio && r.horario_fim ? `${r.horario_inicio} - ${r.horario_fim}` : (r.dias_semana || ''),
                    students: r.total_criancas || 0,
                    occupancy: r.capacidade_maxima ? Math.min((r.total_criancas || 0) / r.capacidade_maxima, 1) : 0.5,
                    status: 'Em operação',
                    checkpoint: r.descricao || 'Rota ativa',
                    trend: '',
                    emphasis: 'primary'
                }));
                baseRoutes = liveState.routes;
                currentRouteId = liveState.routes[0]?.id || null;
                selectedRouteId = currentRouteId;
            }
        }

        if (criancasRes.ok) {
            const criancasJson = await criancasRes.json();
            const lista = criancasJson?.criancas || criancasJson?.data || [];
            if (lista.length) {
                liveState.students = lista.map(c => ({
                    name: c.nome_completo || c.nome,
                    grade: c.escola || 'Escola não informada',
                    stop: c.endereco_residencial || '',
                    guardian: c.responsavel_nome || c.responsavel_email || 'Responsável',
                    status: 'aguardando',
                    eta: '',
                    note: ''
                }));
                baseStudents = liveState.students;
            }
        }
    } catch (err) {
        console.warn('Falha ao carregar dados reais, mantendo demo:', err);
    }
}

async function startLiveRoute() {
    if (DEMO_MODE) {
        PostAuth.showToast('Rota iniciada (modo demo).', 'success');
        PostAuth.notifyEvent?.({ tipo: 'rastreamento_demo', mensagem: 'Rota iniciada (demo)' });
        return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    const rota = liveState.routes.find(r => r.id === selectedRouteId) || liveState.routes[0] || (currentRouteId ? { id: currentRouteId } : null);
    if (!rota || !rota.id) {
        PostAuth.showToast('Nenhuma rota encontrada para iniciar.', 'warning');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/rastreamento/viagens/iniciar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rota_id: rota.id, tipo_viagem: 'ida' })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        try {
            const data = await res.json();
            currentTripId = data?.viagem?.id || currentTripId;
            selectedRouteId = rota.id;
        } catch (_) {
            // se não vier JSON, seguimos
        }
        PostAuth.showToast('Rota iniciada com sucesso.', 'success');
        PostAuth.notifyEvent?.({ tipo: 'rastreamento', mensagem: 'Viagem iniciada' });
        if (trackingInterval) clearInterval(trackingInterval);
        trackingInterval = setInterval(sendLocation, 15000);
        sendLocation();
    } catch (err) {
        console.error('Erro ao iniciar rota:', err);
        PostAuth.showToast('Falha ao iniciar rota.', 'danger');
    }
}

async function finalizeLiveRoute() {
    if (DEMO_MODE) {
        PostAuth.showToast('Viagem finalizada (demo).', 'success');
        PostAuth.notifyEvent?.({ tipo: 'rastreamento_demo', mensagem: 'Viagem finalizada (demo)' });
        return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    const rota = liveState.routes[0] || (currentRouteId ? { id: currentRouteId } : null);
    const viagemId = currentTripId || rota?.id;
    if (!viagemId) {
        PostAuth.showToast('Nenhuma viagem ativa para finalizar.', 'warning');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/rastreamento/viagens/${viagemId}/finalizar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        PostAuth.showToast('Viagem finalizada.', 'success');
        PostAuth.notifyEvent?.({ tipo: 'rastreamento', mensagem: 'Viagem finalizada' });
        currentTripId = null;
        selectedRouteId = null;
        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }
    } catch (err) {
        PostAuth.showToast('Falha ao finalizar viagem.', 'danger');
    }
}

    function bindRealtimeTracking() {
        const startButton = document.querySelector('[data-action="start-route"]');
        const syncButton = document.querySelector('[data-action="sync-app"]');
        const finishButton = document.querySelector('[data-action="finish-route"]');

    // adicionar botão de finalizar na UI (invisível se não existir)
    if (!finishButton) {
        const container = document.querySelector('.floating-actions');
        if (container) {
            const btn = document.createElement('button');
            btn.dataset.action = 'finish-route';
            btn.innerHTML = '<i class="fa-solid fa-square-check"></i>';
            container.appendChild(btn);
        }
    }

    const sendLocation = async () => {
        const token = localStorage.getItem('authToken');
        const isDemo = DEMO_MODE || !token;
        const coords = isDemo ? mockCoords() : await getCurrentPositionSafe();
        if (!coords) return;
        if (!isDemo) {
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
                        viagem_id: currentTripId || selectedRouteId || null
                    })
                });
            } catch (_) { /* silencioso */ }
        }
        if (window.mapsIntegration?.addMarker) {
            const pos = { lat: coords.latitude, lng: coords.longitude };
            if (!window.mapsIntegration.markers?.get('van-escolar')) {
                window.mapsIntegration.addMarker('van-escolar', pos, { title: 'Sua rota em andamento' });
            } else {
                window.mapsIntegration.updateMarker('van-escolar', pos);
            }
            window.mapsIntegration.centerMap?.(pos);
        }
        if (isDemo) {
            PostAuth.notifyEvent({ tipo: 'rastreamento_demo', viagem_id: currentTripId || selectedRouteId || 'demo-rota', latitude: coords.latitude, longitude: coords.longitude });
        }
    };

    startButton?.addEventListener('click', () => {
        sendLocation();
        const selector = document.getElementById('trip-select-school');
        if (selector) selector.value = currentTripId || selectedRouteId || '';
    });

    syncButton?.addEventListener('click', sendLocation);
    document.querySelector('[data-action="finish-route"]')?.addEventListener('click', () => {
        if (trackingInterval) clearInterval(trackingInterval);
        finalizeLiveRoute();
    });
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

function mockCoords() {
    const base = { latitude: -23.5505, longitude: -46.6333 };
    const jitter = (Math.random() - 0.5) * 0.01;
    return { latitude: base.latitude + jitter, longitude: base.longitude + jitter, speed: Math.random() * 30 };
}

const planProfiles = {
    basic: {
        name: 'Plano Basic',
        hero: {
            title: 'Operação essencial, com foco na segurança e no tempo.',
            description: 'Monitoramento de presença, checklist inteligente e alertas em tempo real para cumprir cada rota escolar com confiança.',
            subtitle: 'Fluxo diário sem fricção',
            ctas: [
                { label: 'Iniciar primeira rota', action: 'start-route', primary: true },
                { label: 'Conhecer Premium', href: 'area-motorista-escolar-premium.html' }
            ],
            mini: [
                { label: 'Rotas do dia', value: '3' },
                { label: 'Famílias avisadas', value: '18' },
                { label: 'SLA de chegada', value: '97%' }
            ]
        },
        sidebar: {
            nextDeparture: '07:00',
            confirmations: '42/52',
            routesLabel: '3 rotas ativas'
        },
        features: [
            { icon: 'fa-solid fa-route', label: 'Linha do tempo de rotas' },
            { icon: 'fa-solid fa-shield-heart', label: 'Checklist de segurança' },
            { icon: 'fa-solid fa-bell', label: 'Alertas para responsáveis' },
            { icon: 'fa-solid fa-chart-simple', label: 'Indicadores essenciais' }
        ],
        metrics: [
            { label: 'Presenças confirmadas', value: 42, suffix: '/52', trend: '+12% vs ontem', trendType: 'positive' },
            { label: 'Pontualidade média', value: 97, suffix: '%', trend: '+3% na semana', trendType: 'positive' },
            { label: 'Alertas resolvidos', value: 8, suffix: '/8', trend: 'todos concluídos', trendType: 'positive' },
            { label: 'Avaliação das famílias', value: 4.7, precision: 1, suffix: '/5', trend: '+0.2 último mês', trendType: 'positive' }
        ],
        timeline: [
            {
                time: '06:40',
                title: 'Checklist liberado',
                description: 'Veículo revisado, documentação validada e sensores conectados.',
                meta: ['Revisão feita por você', 'Checklist digital'],
                icon: '✓'
            },
            {
                time: '07:05',
                title: 'Parada Vila Aurora',
                description: 'Ana Clara e Miguel confirmados com foto de embarque.',
                meta: ['WhatsApp enviado', 'Sem filas'],
                icon: '🚌'
            },
            {
                time: '07:32',
                title: 'Fase Nordeste',
                description: 'Lia aguardando confirmação dos responsáveis.',
                meta: ['SMS reencaminhado', 'Tempo estimado 2min'],
                icon: '⚠️'
            },
            {
                time: '07:55',
                title: 'Chegada Colégio Horizonte',
                description: 'Primeiro desembarque registrado, fila fluida.',
                meta: ['Pontualidade 98%', 'Fotos enviadas'],
                icon: '🎯'
            }
        ],
        commandCenter: [
            { title: 'Confirmar partida', description: 'Notifique instantaneamente todas as famílias do primeiro trecho.', action: 'Disparar avisos' },
            { title: 'Atualizar ocupação', description: 'Informe novos interessados e ajuste capacidade.', action: 'Atualizar lista' },
            { title: 'Reportar anomalia', description: 'Registre manutenção ou atraso para compliance.', action: 'Abrir formulário' }
        ],
        routes: baseRoutes,
        checklist: [
            { label: 'Nível de combustível acima de 60%', done: true },
            { label: 'Documentos impressos e digitais', done: true },
            { label: 'Contato com novos responsáveis', done: false },
            { label: 'Sensores e rastreamento calibrados', done: true }
        ],
        alerts: [
            { type: 'warning', icon: 'fa-solid fa-bell', title: 'Confirmação pendente', detail: 'Família da Lia ainda não confirmou o embarque.', time: '07:18' },
            { type: 'success', icon: 'fa-solid fa-check', title: 'Checklist finalizado', detail: 'Retorno vespertino liberado para hoje.', time: '06:42' }
        ],
        students: baseStudents,
        guardians: baseGuardians,
        compliance: [
            { label: 'CNH Digital', status: 'Válida até nov/2025', level: 'success', action: 'ver documento' },
            { label: 'CRLV 2025', status: 'Arquivo pronto', level: 'success', action: 'baixar' },
            { label: 'Seguro APP', status: 'Renovar em 15 dias', level: 'warning', action: 'enviar comprovante' },
            { label: 'Laudo veicular', status: 'Agendar vistoria', level: 'danger', action: 'agendar' }
        ],
        insights: {
            performance: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
                values: [78, 84, 86, 92, 96]
            },
            summary: [
                { label: 'Pontualidade', value: '97%', detail: '+3% vs semana passada' },
                { label: 'Check-ins automáticos', value: '68%', detail: '+2 novas famílias' },
                { label: 'Alertas críticos', value: '0', detail: 'Todos resolvidos hoje' }
            ],
            heatmap: [
                { label: 'Seg', value: '82%' },
                { label: 'Ter', value: '88%' },
                { label: 'Qua', value: '91%' },
                { label: 'Qui', value: '95%' },
                { label: 'Sex', value: '97%' }
            ]
        },
        notifications: [
            { type: 'success', title: 'Check-in confirmado', message: 'Ana Clara entrou na Van Azul', time: '07:05' },
            { type: 'info', title: 'Aviso entregue', message: 'Família Costa recebeu alerta de chegada', time: '07:12' },
            { type: 'warning', title: 'Confirmação pendente', message: 'Família Peixoto precisa confirmar', time: '07:18' },
            { type: 'success', title: 'Checklist concluído', message: 'Retorno vespertino liberado', time: '06:42' }
        ],
        modules: {
            automation: false,
            ai: false,
            premiumInsights: false
        }
    },
    premium: {
        name: 'Plano Premium',
        hero: {
            title: 'Cockpit inteligente com IA para rotas escolares.',
            description: 'Automatize avisos, monitore a saúde financeira do turno e conte com um copiloto inteligente para interagir com as famílias.',
            subtitle: 'Plataforma completa com IA',
            ctas: [
                { label: 'Acionar automações', action: 'open-automation', primary: true },
                { label: 'Ver plano Basic', href: 'area-motorista-escolar.html' }
            ],
            mini: [
                { label: 'Automações ativas', value: '3' },
                { label: 'Famílias engajadas', value: '92%' },
                { label: 'Receita prevista', value: 'R$ 18,8K' }
            ]
        },
        sidebar: {
            nextDeparture: '07:00',
            confirmations: '48/52',
            routesLabel: '3 rotas automatizadas'
        },
        features: [
            { icon: 'fa-solid fa-satellite', label: 'Telemetria + IA' },
            { icon: 'fa-solid fa-bolt', label: 'Automações proativas' },
            { icon: 'fa-solid fa-robot', label: 'Copiloto Kanghoo' },
            { icon: 'fa-solid fa-chart-line', label: 'Dash financeiro' }
        ],
        metrics: [
            { label: 'Famílias engajadas', value: 92, suffix: '%', trend: '+5% com automações', trendType: 'positive' },
            { label: 'Receita prevista', value: 18.8, precision: 1, suffix: 'K', trend: '+R$1,2K semana', trendType: 'positive' },
            { label: 'Custos estimados', value: 8.3, precision: 1, suffix: 'K', trend: '-6% otimização', trendType: 'positive' },
            { label: 'NPS das famílias', value: 74, suffix: ' pts', trend: '+4pts no mês', trendType: 'positive' }
        ],
        timeline: [
            {
                time: '06:30',
                title: 'Automações liberadas',
                description: 'Checklist e alertas pré-configurados disparados.',
                meta: ['IA revisou 12 itens', 'Sem pendências'],
                icon: '⚙️'
            },
            {
                time: '06:58',
                title: 'Broadcast inteligente',
                description: 'Copiloto notificou famílias com variação no trânsito.',
                meta: ['16 notificações enviadas', 'Atraso previsto 4min'],
                icon: '📡'
            },
            {
                time: '07:12',
                title: 'Van Azul • Zona Norte',
                description: '18/26 check-ins confirmados.',
                meta: ['Ocupação 82%', 'Em preparação'],
                icon: '🧭'
            },
            {
                time: '07:40',
                title: 'Circuito Leste',
                description: 'Checklist liberado e sem filas.',
                meta: ['Ocupação 58%', 'Aguardando pais'],
                icon: '🛬'
            }
        ],
        commandCenter: [
            { title: 'Cenário de lotação', description: 'Calcule o impacto financeiro e redistribua alunos automaticamente.', action: 'Simular cenário' },
            { title: 'Pulse de satisfação', description: 'Envie micro pesquisas no desembarque e gere insights.', action: 'Disparar pulse' },
            { title: 'Atualizar carteira', description: 'Aplique reajuste e gere novos contratos.', action: 'Revisar carteira' }
        ],
        routes: baseRoutes.map(route => ({
            ...route,
            trend: `${route.trend} • IA acompanhando`
        })),
        checklist: [
            { label: 'Checklist digital (automação 06h)', done: true },
            { label: 'Envio de broadcast personalizado', done: true },
            { label: 'Sincronizar carteira de clientes', done: false },
            { label: 'Rodada de pesquisa rápida', done: false }
        ],
        alerts: [
            { type: 'info', icon: 'fa-solid fa-signal', title: 'Tráfego detectado', detail: 'IA sugere rota alternativa via Av. Ibirapuera.', time: '06:59' },
            { type: 'warning', icon: 'fa-solid fa-user-clock', title: 'Check-in sem foto', detail: 'Responsável pediu nova confirmação para Breno.', time: '07:20' }
        ],
        students: baseStudents,
        guardians: baseGuardians,
        compliance: [
            { label: 'CNH Digital', status: 'Válida até nov/2025', level: 'success', action: 'ver documento' },
            { label: 'CRLV 2025', status: 'Arquivo pronto', level: 'success', action: 'baixar' },
            { label: 'Seguro APP + Passageiros', status: 'Renovar em 15 dias', level: 'warning', action: 'renovar' },
            { label: 'Auditoria IA de rotas', status: 'Agendada para sexta', level: 'warning', action: 'ver agenda' }
        ],
        insights: {
            performance: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
                values: [86, 92, 95, 97, 99]
            },
            summary: [
                { label: 'Ocupação média', value: '88%', detail: '+6 pts com otimização' },
                { label: 'Receita líquida', value: 'R$ 10,5K', detail: '+18% mês' },
                { label: 'Atrasos críticos', value: '0', detail: 'IA preveniu 3 casos' }
            ],
            heatmap: [
                { label: 'Seg', value: '88%' },
                { label: 'Ter', value: '90%' },
                { label: 'Qua', value: '93%' },
                { label: 'Qui', value: '96%' },
                { label: 'Sex', value: '99%' }
            ],
            revenue: {
                labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
                revenue: [17, 18.2, 18.6, 19.1],
                costs: [8.9, 8.7, 8.5, 8.3]
            }
        },
        notifications: [
            { type: 'success', title: 'Automações ativas', message: 'Broadcast enviado para 16 famílias.', time: '06:58' },
            { type: 'info', title: 'Copiloto respondeu', message: 'IA enviou instruções para Marina.', time: '07:04' },
            { type: 'success', title: 'Financeiro atualizado', message: 'Receita prevista +R$ 1,2K.', time: '07:10' },
            { type: 'warning', title: 'Pendência detectada', message: 'Foto de embarque solicitada para Breno.', time: '07:21' }
        ],
        modules: {
            automation: true,
            ai: true,
            premiumInsights: true
        },
        automationToggles: [
            { label: 'Aviso 15min antes', detail: 'Dispara WhatsApp personalizado.', enabled: true },
            { label: 'Check-in automático', detail: 'Solicita foto do responsável.', enabled: true },
            { label: 'Reengajar faltantes', detail: 'Envio às 21h do dia anterior.', enabled: false }
        ],
        aiPrompts: [
            'Resumo das interações com Marina Rocha',
            'Sugestões para melhorar a ocupação da Van Azul',
            'Mensagem simpática para pais com atraso recorrente'
        ]
    }
};

(document => {
    function bindLogoutButton() {
        const btn = document.getElementById("logout-btn");
        if (btn) {
            btn.addEventListener("click", () => {
                if (window.PostAuth?.logout) {
                    window.PostAuth.logout();
                } else {
                    localStorage.removeItem("authToken");
                    window.location.href = "login.html";
                }
            });
        }
    }

    function wireCreateForms() {
        const routeBtn = document.getElementById('open-create-route');
        const studentBtn = document.getElementById('open-create-student');

        routeBtn?.addEventListener('click', async () => {
            const nome = prompt('Nome da rota');
            const inicio = prompt('Horário início (HH:MM)');
            const fim = prompt('Horário fim (HH:MM)');
            if (!nome) return;
            if (DEMO_MODE) {
                const mock = {
                    id: `demo-${Date.now()}`,
                    name: nome,
                    window: `${inicio || '-'} - ${fim || '-'}`,
                    students: 0,
                    occupancy: 0,
                    status: 'Planejada',
                    checkpoint: 'Nova rota (demo)',
                    trend: '',
                    emphasis: 'primary'
                };
                baseRoutes.unshift(mock);
                renderRoutes(planProfiles[document.body.dataset.plan || 'basic']);
                PostAuth.showToast('Rota criada (demo).', 'success');
                return;
            }
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/motorista-escolar/rotas`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nome_rota: nome,
                        horario_inicio: inicio,
                        horario_fim: fim,
                        descricao: 'Criada via painel'
                    })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await loadLiveData();
                renderRoutes(planProfiles[document.body.dataset.plan || 'basic']);
                PostAuth.showToast('Rota criada.', 'success');
            } catch (err) {
                console.error(err);
                PostAuth.showToast('Falha ao criar rota.', 'danger');
            }
        });

        studentBtn?.addEventListener('click', async () => {
            const nome = prompt('Nome completo da criança');
            const emailResp = prompt('E-mail do responsável');
            if (!nome || !emailResp) return;
            if (DEMO_MODE) {
                const mock = {
                    name: nome,
                    grade: '',
                    stop: '',
                    guardian: emailResp,
                    status: 'aguardando',
                    eta: '',
                    note: ''
                };
                baseStudents.unshift(mock);
                renderRoster(planProfiles[document.body.dataset.plan || 'basic']);
                PostAuth.showToast('Criança adicionada (demo).', 'success');
                return;
            }
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/motorista-escolar/criancas`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nome_completo: nome,
                        responsavel_email: emailResp,
                        data_nascimento: '2015-01-01',
                        endereco_residencial: '',
                        escola: '',
                        endereco_escola: ''
                    })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await loadLiveData();
                renderRoster(planProfiles[document.body.dataset.plan || 'basic']);
                PostAuth.showToast('Criança adicionada.', 'success');
            } catch (err) {
                console.error(err);
                PostAuth.showToast('Falha ao adicionar criança.', 'danger');
            }
        });
    }

    function bindChecklist() {
        const openBtn = document.querySelector('[data-action="open-checklist"]');
        const modal = document.getElementById('checklist-modal');
        const closeBtn = document.getElementById('close-checklist');
        const list = document.getElementById('checklist-list');

        if (!modal || !list) return;

        const renderChecklist = async () => {
            // tentar carregar viagem ativa e crianças da conferência
            if (!DEMO_MODE) {
                await fetchActiveConference();
            }
            const students = liveState.students.length ? liveState.students : baseStudents;
            list.innerHTML = students.map((s, idx) => `
                <div class="check-item">
                    <div>
                        <strong>${s.name || s.nome || 'Aluno'}</strong>
                        <p style="margin:0;color:var(--text-muted);">${s.guardian || ''}</p>
                    </div>
                    <div class="check-actions">
                        <label><input type="radio" name="presenca-${idx}" value="presente" checked> Presente</label>
                        <label><input type="radio" name="presenca-${idx}" value="ausente"> Ausente</label>
                        <textarea name="motivo-${idx}" placeholder="Motivo (se ausente)" style="width:100%;min-height:60px;margin-top:0.35rem;"></textarea>
                    </div>
                </div>
            `).join('');
        };

        const closeModal = () => modal.classList.add('hidden');
        const openModal = () => {
            renderChecklist();
            modal.classList.remove('hidden');
        };

        openBtn?.addEventListener('click', openModal);
        closeBtn?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        const saveHandler = async () => {
            const students = liveState.students.length ? liveState.students : baseStudents;
            const payload = students.map((s, idx) => {
                const status = modal.querySelector(`input[name="presenca-${idx}"]:checked`)?.value || 'presente';
                const motivo = modal.querySelector(`textarea[name="motivo-${idx}"]`)?.value || '';
                return {
                    nome: s.name || s.nome,
                    status,
                    motivo,
                    conferencia_id: s.conferencia_id || activeConferenceId || null,
                    crianca_id: s.id || s.crianca_id || null
                };
            });

            if (DEMO_MODE) {
                PostAuth.showToast('Checklist salvo (demo).', 'success');
                closeModal();
                return;
            }

            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            try {
                // Enviar presentes como embarque, ausentes como desembarque com observação
                for (const item of payload) {
                    if (!item.conferencia_id) continue;
                    const endpoint = item.status === 'presente' ? 'embarque' : 'desembarque';
                    await fetch(`${API_BASE}/conferencia/${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            conferencia_id: item.conferencia_id,
                            viagem_id: currentTripId || selectedRouteId || null,
                            crianca_id: item.crianca_id,
                            presente: item.status === 'presente',
                            observacoes: item.motivo || ''
                        })
                    });
                    PostAuth.notifyEvent({
                        tipo: endpoint,
                        viagem_id: currentTripId || selectedRouteId || null,
                        conferencia_id: item.conferencia_id,
                        crianca_id: item.crianca_id,
                        presente: item.status === 'presente'
                    });
                }
                PostAuth.showToast('Checklist enviado.', 'success');
                closeModal();
            } catch (err) {
                console.error(err);
                PostAuth.showToast('Falha ao enviar checklist.', 'danger');
            }
        };

        const footer = document.createElement('div');
        footer.className = 'checklist-actions';
        footer.style = 'margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end;';
        footer.innerHTML = `
            <button id="cancel-checklist" class="btn btn-ghost">Cancelar</button>
            <button id="submit-checklist" class="btn btn-primary">Salvar checklist</button>
        `;
        modal.querySelector('.modal-content')?.appendChild(footer);
        modal.querySelector('#cancel-checklist')?.addEventListener('click', closeModal);
        modal.querySelector('#submit-checklist')?.addEventListener('click', saveHandler);
    }

    async function fetchActiveConference() {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        try {
            // Buscar viagem ativa
            const viagens = await fetch(`${API_BASE}/conferencia/viagens-ativas`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(res => res.json());
            const viagemAtiva = viagens?.data?.[0];
            if (!viagemAtiva) return;
            activeConferenceId = viagemAtiva.conferencia_id || viagemAtiva.id || null;
            currentTripId = currentTripId || viagemAtiva.viagem_id || null;

            // Buscar crianças com conferencia_id
            const criancas = await fetch(`${API_BASE}/conferencia/viagens/${viagemAtiva.id}/criancas`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(res => res.json());
            if (criancas?.data?.length) {
                liveState.students = criancas.data.map(c => ({
                    id: c.id || c.crianca_id,
                    name: c.nome_completo,
                    guardian: c.responsavel_nome || '',
                    conferencia_id: c.conferencia_id || activeConferenceId,
                    status: c.status_conferencia || 'aguardando',
                    note: c.observacoes || ''
                }));
            }
        } catch (e) {
            console.warn('Falha ao buscar conferência ativa:', e);
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // garante que nenhum scroll anterior seja restaurado
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }

        bindLogoutButton();
        wireCreateForms();
        await loadLiveData();
        bindRealtimeTracking();

        try {
            await Promise.race([
                PostAuth.ensureAuthContext(),
                new Promise((resolve) => setTimeout(resolve, 3500))
            ]);
        } catch (_) {
            // ignora erros de validação: entramos em modo demo
        } finally {
            initializePlan();
        }
        if (DEMO_MODE) {
            PostAuth.startDemoEvents();
        }
    });

    function initializePlan() {
        const mainContainer = document.querySelector('.app-main');
        if (mainContainer) {
            mainContainer.scrollTop = 0;

            let attempts = 0;
            const scrollInterval = setInterval(() => {
                mainContainer.scrollTop = 0;
                attempts += 1;
                if (attempts >= 15) {
                    clearInterval(scrollInterval);
                }
            }, 120);
        }

        const planKey = document.body.dataset.plan || 'basic';
        const plan = planProfiles[planKey];
        if (!plan) return;

        renderHero(plan);
        renderFeaturePills(plan);
        renderMetrics(plan);
        renderTimeline(plan);
        renderCommandCenter(plan);
        renderRoutes(plan);
        renderChecklist(plan);
        renderAlerts(plan);
        renderRoster(plan);
        renderCompliance(plan);
        renderInsights(plan);
        renderNotifications(plan);
        renderAutomation(plan);
        renderAI(plan);
        setupChatPanel();
        updateSidebar(plan);
        setupInteractions();

        PostAuth.observe(document.querySelectorAll('[data-animate]'));
        PostAuth.bindTilt(document.querySelectorAll('.metric-card, .route-card'));
    }

    function renderHero(plan) {
        const hero = document.getElementById('hero');
        if (!hero) return;
        hero.innerHTML = `
            <div class="orbital-field" aria-hidden="true">
                <span class="orbital-dot"></span>
                <span class="orbital-dot"></span>
            </div>
            <div class="hero-plan">
                <span class="plan-badge">${plan.name}</span>
                <small>${plan.hero.subtitle}</small>
            </div>
            <h1>${plan.hero.title}</h1>
            <p>${plan.hero.description}</p>
            <div class="hero-cta">
                ${plan.hero.ctas.map(cta => cta.href ?
                    `<a class="btn ${cta.primary ? 'btn-primary' : 'btn-ghost'}" href="${cta.href}">${cta.label}</a>` :
                    `<button class="btn ${cta.primary ? 'btn-primary' : 'btn-ghost'}" data-action="${cta.action}">${cta.label}</button>`
                ).join('')}
            </div>
            <div class="hero-mini-kpis">
                ${plan.hero.mini.map(item => `
                    <div class="mini-card">
                        <small>${item.label}</small>
                        <strong>${item.value}</strong>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderFeaturePills(plan) {
        const container = document.getElementById('feature-pills');
        if (!container) return;
        container.innerHTML = plan.features.map(pill => `
            <span class="pill">
                <i class="${pill.icon}"></i>${pill.label}
            </span>
        `).join('');
    }

    function renderMetrics(plan) {
        const grid = document.getElementById('metrics-grid');
        if (!grid) return;
        grid.innerHTML = '';
        plan.metrics.forEach((metric, index) => {
            const card = document.createElement('article');
            card.className = 'metric-card';
            card.innerHTML = `
                <p class="metric-label">${metric.label}</p>
                <div class="metric-value">
                    <strong data-precision="${metric.precision || 0}" data-initial="0">0</strong>
                    ${metric.suffix ? `<small>${metric.suffix}</small>` : ''}
                </div>
                <span class="metric-trend ${metric.trendType}">
                    <i class="fa-solid fa-arrow-trend-up"></i>${metric.trend}
                </span>
            `;
            grid.appendChild(card);
            const targetNode = card.querySelector('strong');
            PostAuth.animateCounter(targetNode, metric.value, 900 + index * 90);
        });
    }

    function renderTimeline(plan) {
        const container = document.getElementById('journey-timeline');
        if (!container) return;
        container.innerHTML = plan.timeline.map(item => `
            <div class="timeline-item">
                <div class="timeline-pin">${item.icon || '•'}</div>
                <div class="timeline-card">
                    <small style="color: var(--text-muted);">${item.time}</small>
                    <strong>${item.title}</strong>
                    <p style="margin: 0.35rem 0; color: var(--text-muted);">${item.description}</p>
                    <div class="timeline-meta">
                        ${item.meta.map(meta => `<span>${meta}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderCommandCenter(plan) {
        const center = document.getElementById('command-center');
        if (!center) return;
        center.innerHTML = plan.commandCenter.map(action => `
            <button class="command-button" data-action="command:${action.action}">
                <div>
                    <strong>${action.title}</strong>
                    <p style="color: var(--text-muted); margin: 0;">${action.description}</p>
                </div>
                <span style="color: var(--plan-accent); font-size: 0.9rem;">${action.action}</span>
            </button>
        `).join('');
    }

    function renderRoutes(plan) {
        const board = document.getElementById('routes-board');
        if (!board) return;
        const selector = document.getElementById('trip-select-school');
        board.innerHTML = plan.routes.map(route => `
            <div class="route-card ${route.id === selectedRouteId ? 'is-selected' : ''}" data-emphasis="${route.emphasis}" data-route-id="${route.id || ''}">
                <div class="route-meta">
                    <span>${route.window}</span>
                    <span>${route.students} alunos</span>
                </div>
                <strong>${route.name}</strong>
                <p style="color: var(--text-muted); margin: 0.35rem 0;">${route.status}${route.id ? ` • ID ${route.id}` : ''}</p>
                <div class="progress-track">
                    <div class="progress-value" style="width: ${Math.round(route.occupancy * 100)}%"></div>
                </div>
                <div class="timeline-meta" style="margin-top: 0.85rem;">
                    <span>${route.checkpoint}</span>
                    <span>${route.trend}</span>
                </div>
                <div class="route-actions">
                    <button class="primary" data-action="route:start" data-route="${route.name}" data-route-id="${route.id || ''}">Iniciar</button>
                    <button data-action="route:view" data-route="${route.name}" data-route-id="${route.id || ''}">Detalhes</button>
                </div>
            </div>
        `).join('');
        if (selector && plan.routes?.length) {
            selector.innerHTML = plan.routes.map(r => `<option value="${r.id || ''}">${r.name}${r.id ? ` • ID ${r.id}` : ''} ${r.status ? `(${r.status})` : ''}</option>`).join('');
            selectedRouteId = selectedRouteId || plan.routes[0]?.id || null;
            selector.addEventListener('change', (e) => {
                selectedRouteId = e.target.value || null;
            });
        }
    }

    function renderChecklist(plan) {
        const container = document.getElementById('checklist-board');
        if (!container) return;
        container.innerHTML = plan.checklist.map((item, index) => `
            <label>
                <input type="checkbox" ${item.done ? 'checked' : ''} data-checklist="${index}">
                <span>${item.label}</span>
            </label>
        `).join('');
    }

    function renderAlerts(plan) {
        const board = document.getElementById('alerts-board');
        if (!board) return;
        board.innerHTML = plan.alerts.map(alert => `
            <div class="notification-card">
                <i class="${alert.icon}" style="color:${alert.type === 'warning' ? 'var(--warning)' : 'var(--success)'}"></i>
                <div>
                    <strong>${alert.title}</strong>
                    <p style="margin: 0; color: var(--text-muted);">${alert.detail}</p>
                    <small style="color: var(--text-muted);">${alert.time}</small>
                </div>
            </div>
        `).join('');
    }

    function renderRoster(plan) {
        const studentsContainer = document.getElementById('student-roster');
        const guardiansContainer = document.getElementById('guardian-roster');
        if (studentsContainer) {
            studentsContainer.innerHTML = plan.students.map(student => `
                <div class="roster-card">
                    <strong>${student.name}</strong>
                    <p style="margin: 0.25rem 0; color: var(--text-muted);">${student.grade}</p>
                    <small style="color: var(--text-muted);">Parada: ${student.stop}</small>
                    <div class="badge ${student.status === 'confirmado' ? 'success' : 'warning'}" style="margin-top: 0.5rem;">
                        ${student.status === 'confirmado' ? 'Confirmado' : 'Aguardando'}
                    </div>
                    <small style="display:block;margin-top:0.4rem;color:var(--text-muted);">${student.note}</small>
                    <button class="btn btn-ghost" style="margin-top: 0.65rem;" data-action="contact:${student.guardian}">
                        Avisar ${student.guardian}
                    </button>
                </div>
            `).join('');
        }

        if (guardiansContainer) {
            guardiansContainer.innerHTML = plan.guardians.map(guardian => `
                <div class="guardian-card">
                    <strong>${guardian.name}</strong>
                    <p class="contact">${guardian.relation}</p>
                    <p class="contact">${guardian.contact} • ${guardian.channel}</p>
                    <div class="tags">
                        ${guardian.tags.map(tag => `<span class="badge">${tag}</span>`).join('')}
                    </div>
                    <button data-action="contact:${guardian.name}">Enviar atualização</button>
                </div>
            `).join('');
        }
    }

    function renderCompliance(plan) {
        const container = document.getElementById('compliance-matrix');
        if (!container) return;
        container.innerHTML = plan.compliance.map(doc => `
            <div class="document-card">
                <strong>${doc.label}</strong>
                <p style="color: var(--text-muted); margin: 0.25rem 0;">${doc.status}</p>
                <footer>
                    <span class="badge ${doc.level}">${doc.level === 'success' ? 'Em dia' : doc.level === 'warning' ? 'Atenção' : 'Urgente'}</span>
                    <button data-action="doc:${doc.label}">${doc.action}</button>
                </footer>
            </div>
        `).join('');
    }

    function renderInsights(plan) {
        const summary = document.getElementById('insight-summary');
        if (summary) {
            summary.innerHTML = plan.insights.summary
                .map(item => `<span>${item.label}: <strong>${item.value}</strong> · ${item.detail}</span>`)
                .join('');
        }

        const heatmap = document.getElementById('heatmap-grid');
        if (heatmap) {
            heatmap.innerHTML = plan.insights.heatmap
                .map(cell => `<div class="heatmap-cell"><small>${cell.label}</small><strong>${cell.value}</strong></div>`)
                .join('');
        }

        const perfCtx = document.getElementById('performance-chart');
        if (perfCtx && window.Chart) {
            new Chart(perfCtx, {
                type: 'line',
                data: {
                    labels: plan.insights.performance.labels,
                    datasets: [{
                        data: plan.insights.performance.values,
                        borderColor: '#7c5dff',
                        backgroundColor: 'rgba(124, 93, 255, 0.2)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: chartOptions()
            });
        }

        if (plan.modules.premiumInsights && plan.insights.revenue) {
            const revenueCtx = document.getElementById('revenue-chart');
            if (revenueCtx && window.Chart) {
                new Chart(revenueCtx, {
                    type: 'bar',
                    data: {
                        labels: plan.insights.revenue.labels,
                        datasets: [
                            { label: 'Receita (K)', data: plan.insights.revenue.revenue, backgroundColor: '#ff6ad5' },
                            { label: 'Custos (K)', data: plan.insights.revenue.costs, backgroundColor: '#23c8ff' }
                        ]
                    },
                    options: chartOptions()
                });
            }
        } else if (document.body.dataset.plan === 'premium') {
            const callout = document.getElementById('premium-callout');
            if (callout) callout.textContent = 'Carregando dados avançados...';
        }
    }

    function renderNotifications(plan) {
        const feed = document.getElementById('live-feed');
        const ticker = document.getElementById('sidebar-ticker');
        if (feed) {
            feed.innerHTML = plan.notifications.map(item => `
                <div class="notification-card">
                    <i class="fa-solid fa-circle" style="font-size:0.5rem;color:${colorByType(item.type)}"></i>
                    <div>
                        <strong>${item.title}</strong>
                        <p style="margin:0;color:var(--text-muted);">${item.message}</p>
                        <small style="color:var(--text-muted);">${item.time}</small>
                    </div>
                </div>
            `).join('');
        }
        if (ticker) {
            const snippets = plan.notifications.map(item => `<strong>${item.title}</strong> — ${item.message}`);
            PostAuth.createTicker(ticker, snippets);
        }
    }

    function renderAutomation(plan) {
        const container = document.getElementById('automation-panel');
        if (!container) return;
        if (!plan.modules.automation) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        container.innerHTML = `
            <div class="panel-header">
                <p class="panel-title">Automações ativas</p>
                <small style="color: var(--text-muted);">Controle cada rotina inteligente</small>
            </div>
            <div class="automation-deck">
                ${plan.automationToggles.map((toggle, idx) => `
                    <label class="automation-toggle">
                        <div>
                            <strong>${toggle.label}</strong>
                            <small>${toggle.detail}</small>
                        </div>
                        <input type="checkbox" data-automation="${idx}" ${toggle.enabled ? 'checked' : ''}>
                    </label>
                `).join('')}
            </div>
        `;
    }

    function renderAI(plan) {
        const container = document.getElementById('ai-panel');
        if (!container) return;
        if (!plan.modules.ai) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        container.innerHTML = `
            <div class="panel-header">
                <p class="panel-title">Copiloto Kanghoo</p>
                <small style="color: var(--text-muted);">Gere respostas e insights instantaneamente</small>
            </div>
            <textarea id="ai-input" placeholder="Ex: Sugira uma mensagem acolhedora para responsáveis que atrasam frequentemente."></textarea>
            <div class="hero-cta" style="margin-top: 0.85rem;">
                <button class="btn btn-primary" id="ai-send">Perguntar</button>
            </div>
            <div class="responses" id="ai-responses">
                ${plan.aiPrompts.map(prompt => `
                    <div class="response">
                        <strong>${prompt}</strong>
                        <p style="margin:0.35rem 0 0;">Copiloto pronto para responder.</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function updateSidebar(plan) {
        const planName = document.getElementById('sidebar-plan-name');
        const nextDeparture = document.getElementById('sidebar-next-departure');
        const confirmations = document.getElementById('sidebar-confirmations');
        const routesLabel = document.getElementById('sidebar-routes-label');
        if (planName) planName.textContent = plan.name.replace('Plano ', '');
        if (nextDeparture) nextDeparture.textContent = plan.sidebar.nextDeparture;
        if (confirmations) confirmations.textContent = plan.sidebar.confirmations;
        if (routesLabel) routesLabel.textContent = plan.sidebar.routesLabel;
    }

    function setupInteractions() {
        document.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', () => handleAction(button.dataset.action, button.dataset));
        });

        document.querySelectorAll('.sidebar-nav button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-nav button').forEach(btn => btn.classList.remove('is-active'));
                button.classList.add('is-active');
                document.getElementById(button.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        document.getElementById('checklist-board')?.addEventListener('change', () => {
            PostAuth.showToast('Checklist atualizado.', 'info');
        });

        document.getElementById('automation-panel')?.addEventListener('change', event => {
            if (event.target.matches('input[data-automation]')) {
                PostAuth.showToast('Rotina atualizada.', 'success');
            }
        });

        const aiSend = document.getElementById('ai-send');
        if (aiSend) {
            aiSend.addEventListener('click', () => {
                const input = document.getElementById('ai-input');
                const responses = document.getElementById('ai-responses');
                if (input?.value.trim()) {
                    const bubble = document.createElement('div');
                    bubble.className = 'response';
                    bubble.innerHTML = `<strong>Você</strong><p>${input.value}</p>`;
                    responses.prepend(bubble);
                    input.value = '';
                    setTimeout(() => {
                        bubble.innerHTML = '<strong>Copiloto Kanghoo</strong><p>Mensagem personalizada enviada para os responsáveis.</p>';
                    }, 1100);
                }
            });
        }
    }

    function handleAction(action, context = {}) {
        if (!action) return;
        switch (true) {
            case action === 'start-route':
                startLiveRoute();
                break;
            case action === 'finish-route':
                finalizeLiveRoute();
                break;
            case action === 'sync-app':
                PostAuth.showToast('Sincronizando com aplicativos das famílias...', 'info');
                break;
            case action.startsWith('command:'):
                PostAuth.showToast(`Ação ${action.replace('command:', '')} pronta.`, 'info');
                break;
            case action.startsWith('route:start'):
                if (context.routeId) {
                    selectedRouteId = context.routeId;
                }
                startLiveRoute();
                PostAuth.showToast(`Iniciando ${context.route || 'rota'}`, 'success');
                break;
            case action.startsWith('route:view'):
                if (context.routeId) {
                    selectedRouteId = context.routeId;
                }
                PostAuth.showToast(`Abrindo detalhes de ${context.route || 'rota'}`, 'info');
                break;
            case action.startsWith('contact:'):
                PostAuth.showToast(`Mensagem enviada para ${action.split(':')[1]}`, 'success');
                break;
            case action.startsWith('doc:'):
                PostAuth.showToast(`Documento ${action.split(':')[1]} atualizado.`, 'info');
                break;
            case action === 'open-automation':
                document.getElementById('automation-panel')?.scrollIntoView({ behavior: 'smooth' });
                PostAuth.showToast('Rolando até automações.', 'info');
                break;
            default:
                PostAuth.showToast('Ação executada.', 'info');
        }
    }

    function setupChatPanel() {
        if (document.getElementById('chat-panel-school')) return;
        const panel = document.createElement('div');
        panel.id = 'chat-panel-school';
        panel.className = 'chat-panel';
        panel.innerHTML = `
            <header>
                <strong>Chat em tempo real</strong>
                <small id="chat-channel-school">Canal: aguardando rota</small>
            </header>
            <div class="chat-messages" id="chat-messages-school"></div>
            <form id="chat-form-school">
                <input type="text" id="chat-input-school" placeholder="Digite uma mensagem" autocomplete="off" />
                <button type="submit"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        `;
        document.body.appendChild(panel);

        const form = panel.querySelector('#chat-form-school');
        const input = panel.querySelector('#chat-input-school');
        const list = panel.querySelector('#chat-messages-school');
        const label = panel.querySelector('#chat-channel-school');

        const channel = () => currentTripId || selectedRouteId || 'demo-rota-escolar';
        label.textContent = `Canal: ${channel()}`;
        const client = PostAuth.initChat(channel());

        PostAuth.onChatMessage((payload) => {
            if (payload.canal && payload.canal !== channel()) return;
            const item = document.createElement('div');
            item.className = `chat-bubble ${payload.origem === 'motorista' ? 'mine' : 'theirs'}`;
            item.textContent = payload.mensagem || '';
            list.appendChild(item);
            list.scrollTop = list.scrollHeight;
        });

        form?.addEventListener('submit', (evt) => {
            evt.preventDefault();
            if (!input.value.trim()) return;
            client?.send?.(input.value.trim());
            input.value = '';
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
        };
    }

    function colorByType(type) {
        switch (type) {
            case 'success':
                return '#2bd19c';
            case 'warning':
                return '#ffb347';
            case 'danger':
                return '#ff5563';
            default:
                return '#7c5dff';
        }
    }
})(document);






