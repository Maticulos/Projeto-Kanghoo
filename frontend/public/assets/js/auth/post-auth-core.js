(function () {
    const toastHostId = 'post-auth-toast-host';
    const AUTH_TIMEOUT_MS = 4000;

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
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            return null;
        }

        try {
            const response = await fetchWithTimeout('/api/validate-token', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Token inválido');
            const data = await response.json();
            if (!data.valid) throw new Error('Sessão expirada');
            return data.user;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('[PostAuth] Validação do token demorou demais, prosseguindo em modo offline.');
            } else {
                console.warn('[PostAuth] Falha na validação do token:', error.message);
            }
            // Mantemos o usuário na página para ambientes offline/demonstração
            return null;
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

    window.PostAuth = {
        ensureAuthContext,
        animateCounter,
        observe,
        showToast,
        createTicker,
        bindTilt
    };
})();
