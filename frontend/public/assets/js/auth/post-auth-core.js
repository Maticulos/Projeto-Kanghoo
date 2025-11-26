(function () {
    const toastHostId = 'post-auth-toast-host';
    const AUTH_TIMEOUT_MS = 4000;
    const APP_CONFIG = window.APP_CONFIG || {};
    const DEMO_MODE = !!APP_CONFIG.demoMode;
    const API_BASE = APP_CONFIG.apiBasePath || "/api";
    const PREFS_TTL = 60000;
    let notificationPreferences = null;
    let lastPrefsLoad = 0;

    async function fetchWithTimeout(resource, options = {}, timeout = AUTH_TIMEOUT_MS) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(resource, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    function ensureToastHost() {
        let host = document.getElementById(toastHostId);
        if (host) return host;
        host = document.createElement('div');
        host.id = toastHostId;
        host.style.position = 'fixed';
        host.style.top = '1.5rem';
        host.style.right = '1.5rem';
        host.style.display = 'flex';
        host.style.flexDirection = 'column';
        host.style.gap = '0.5rem';
        host.style.zIndex = '9999';
        document.body.appendChild(host);
        return host;
    }

    async function ensureAuthContext() {
        const token = localStorage.getItem("authToken");
        if (!token) {
            if (!DEMO_MODE) {
                window.location.href = "login.html";
            }
            return null;
        }
        try {
            const response = await fetchWithTimeout(`${API_BASE}/validate-token`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            if (!response.ok) throw new Error("Token invalido");
            const data = await response.json();
            if (!data.valid) throw new Error("Sessao expirada");
            return data.user;
        } catch (error) {
            if (error.name === "AbortError") {
                console.warn("[PostAuth] Validacao do token demorou demais.");
            } else {
                console.warn("[PostAuth] Falha na validacao do token:", error.message);
            }
            if (!DEMO_MODE) {
                localStorage.removeItem("authToken");
                window.location.href = "login.html";
                return null;
            }
            console.warn("[PostAuth] DEMO_MODE ativo: prosseguindo em modo offline/demonstracao.");
            return null;
        }
    }

    function getAppConfig() {
        return {
            apiBasePath: API_BASE,
            demoMode: DEMO_MODE,
            wsBaseUrl: APP_CONFIG.wsBaseUrl || API_BASE.replace(/^http/, 'ws')
        };
    }

    async function logout(redirectToLogin = true) {
        const token = localStorage.getItem('authToken');
        try {
            if (token && !DEMO_MODE) {
                await fetch(`${API_BASE}/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => {});
            }
        } finally {
            localStorage.removeItem('authToken');
            if (redirectToLogin) {
                window.location.href = "login.html";
            }
        }
    }

    function animateCounter(element, target, duration = 1200) {
        const start = performance.now();
        const initial = Number(element.dataset.initial || 0);
        const precision = Number(element.dataset.precision || 0);
        const formatter = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        });

        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = initial + (target - initial) * eased;
            element.textContent = formatter.format(precision ? value : Math.round(value));
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    function observe(elements, className = 'is-visible') {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(className);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.2 }
        );

        elements.forEach(el => observer.observe(el));
    }

    function showToast(message, type = 'info') {
        const host = ensureToastHost();
        const card = document.createElement('div');
        card.textContent = message;
        card.style.padding = '0.75rem 1rem';
        card.style.borderRadius = '999px';
        card.style.backdropFilter = 'blur(16px)';
        card.style.border = '1px solid rgba(255,255,255,0.25)';
        card.style.fontSize = '0.9rem';
        card.style.color = '#fff';
        card.style.background =
            type === 'success' ? 'rgba(43, 209, 156, 0.85)' :
            type === 'danger' ? 'rgba(255, 85, 99, 0.85)' :
            type === 'warning' ? 'rgba(255, 179, 71, 0.9)' :
            'rgba(124, 93, 255, 0.75)';

        host.appendChild(card);
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-6px)';
            card.style.transition = '0.35s ease';
            card.addEventListener('transitionend', () => card.remove());
        }, 2600);
    }

    function defaultPreferences() {
        return {
            embarque_desembarque: true,
            localizacao_tempo_real: true,
            veiculo_chegando: true,
            emergencia: true,
            atraso_detectado: true,
            canais: ['app']
        };
    }

    async function loadNotificationPreferences(force = false) {
        const now = Date.now();
        if (!force && notificationPreferences && (now - lastPrefsLoad) < PREFS_TTL) {
            return notificationPreferences;
        }
        const token = localStorage.getItem('authToken');
        if (!token) {
            notificationPreferences = notificationPreferences || defaultPreferences();
            lastPrefsLoad = now;
            return notificationPreferences;
        }
        try {
            const res = await fetch(`${API_BASE}/notification-preferences`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                notificationPreferences = data?.preferencias || data?.data || data || defaultPreferences();
                lastPrefsLoad = now;
                return notificationPreferences;
            }
        } catch (err) {
            console.warn('[PostAuth] Nao foi possivel carregar preferencias:', err);
        }
        notificationPreferences = notificationPreferences || defaultPreferences();
        lastPrefsLoad = now;
        return notificationPreferences;
    }

    function shouldNotify(tipo, prefs = defaultPreferences()) {
        if (!tipo) return true;
        const t = (tipo || '').toLowerCase();
        if (t.includes('embarque') || t.includes('desembarque')) return prefs.embarque_desembarque !== false;
        if (t.includes('rastreamento') || t.includes('localizacao')) return prefs.localizacao_tempo_real !== false;
        if (t.includes('chegando')) return prefs.veiculo_chegando !== false;
        if (t.includes('atraso')) return prefs.atraso_detectado !== false;
        return true;
    }

    function createTicker(container, items = [], interval = 4000) {
        if (!container || !items.length) return;
        let index = 0;
        container.innerHTML = items[0];

        setInterval(() => {
            index = (index + 1) % items.length;
            container.style.opacity = '0';
            setTimeout(() => {
                container.innerHTML = items[index];
                container.style.opacity = '1';
            }, 250);
        }, interval);
    }

    function bindTilt(elements) {
        const cards = typeof elements === 'string'
            ? document.querySelectorAll(elements)
            : elements;

        cards.forEach(card => {
            card.addEventListener('pointermove', evt => {
                const bounds = card.getBoundingClientRect();
                const x = evt.clientX - bounds.left;
                const y = evt.clientY - bounds.top;
                const centerX = bounds.width / 2;
                const centerY = bounds.height / 2;
                const rotateX = ((y - centerY) / centerY) * -4;
                const rotateY = ((x - centerX) / centerX) * 4;
                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            card.addEventListener('pointerleave', () => {
                card.style.transform = '';
            });
        });
    }

    // === Chat / Notifica├º├Áes (WS ou demo) ===
    const chatListeners = [];
    let chatTimer = null;
    let demoEventTimer = null;

    function initChat(channelId) {
        const token = localStorage.getItem('authToken');
        const useDemo = DEMO_MODE || !token || !window.RealtimeClient;
        if (useDemo) {
            startDemoChat(channelId);
            return { send: (msg) => sendDemoMessage(channelId, msg), stop: stopDemoChat };
        }
        const client = new window.RealtimeClient({ serverUrl: `${API_BASE.replace(/^http/, 'ws')}/ws` });
        client.initialize(token).catch(() => startDemoChat(channelId));
        client.on('message', (payload) => dispatchChatMessage(payload));
        return {
            send: (msg) => client.send('chat_message', { canal: channelId, mensagem: msg }),
            stop: () => client.disconnect()
        };
    }

    function onChatMessage(fn) {
        if (typeof fn === 'function') chatListeners.push(fn);
    }

    function dispatchChatMessage(payload) {
        chatListeners.forEach(fn => {
            try { fn(payload); } catch (_) {}
        });
    }

    function startDemoChat(channelId) {
        stopDemoChat();
        chatTimer = setInterval(() => {
            dispatchChatMessage({
                canal: channelId,
                origem: 'responsavel',
                mensagem: 'Mensagem autom├ítica (demo) para ilustrar o chat.',
                ts: Date.now()
            });
        }, 9000);
    }

    function sendDemoMessage(channelId, mensagem) {
        dispatchChatMessage({ canal: channelId, origem: 'motorista', mensagem, ts: Date.now() });
        setTimeout(() => {
            dispatchChatMessage({ canal: channelId, origem: 'responsavel', mensagem: 'Recebido! (demo)', ts: Date.now() });
        }, 1200);
    }

    function stopDemoChat() {
        if (chatTimer) clearInterval(chatTimer);
        chatTimer = null;
    }

    async function notifyEvent(evento) {
        const payload = { ...evento, ts: Date.now() };
        const prefs = await loadNotificationPreferences();
        if (!shouldNotify(payload.tipo, prefs)) return Promise.resolve();
        if (DEMO_MODE) {
            showToast(`Notificacao demo: ${payload.tipo || 'evento'}`, 'info');
            return Promise.resolve();
        }
        const token = localStorage.getItem('authToken');
        if (!token) return Promise.resolve();
        return fetch(`${API_BASE}/notificacoes/hub`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).catch(err => console.warn('Notificacao nao enviada:', err));
    }

    function startDemoEvents(sequence = []) {
        if (!DEMO_MODE) return;
        if (demoEventTimer) clearInterval(demoEventTimer);
        let idx = 0;
        const events = sequence.length ? sequence : [
            { tipo: 'embarque', mensagem: 'Aluno embarcado (demo)' },
            { tipo: 'rastreamento_demo', mensagem: 'Van a caminho (demo)' },
            { tipo: 'desembarque', mensagem: 'Aluno desembarcado (demo)' },
            { tipo: 'atraso', mensagem: 'Atraso de 5 min (demo)' }
        ];
        demoEventTimer = setInterval(() => {
            const ev = events[idx % events.length];
            notifyEvent(ev);
            idx += 1;
        }, 8000);
    }

    window.PostAuth = {
        ensureAuthContext,
        animateCounter,
        observe,
        showToast,
        getAppConfig,
        logout,
        createTicker,
        bindTilt,
        initChat,
        onChatMessage,
        loadNotificationPreferences,
        notifyEvent,
        startDemoEvents
    };
})();
