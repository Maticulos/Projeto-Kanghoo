document.addEventListener('DOMContentLoaded', function() {
    // Cache de elementos DOM
    const domCache = {
        smoothScrollLinks: document.querySelectorAll('a[href^="#"]'),
        scrollNav: document.querySelector('.scroll-nav'),
        animatedSections: document.querySelectorAll('.animated-section'),
        eventCards: document.querySelectorAll('.event-card'),
        mainEventImage: document.getElementById('event-main-image'),
        cadastroModal: document.getElementById('cadastroModal'),
        openModalBtn: document.getElementById('btn-cadastro-modal'),
        closeModalBtn: document.getElementById('close-modal'),
        progressBar: document.querySelector('.scroll-progress-bar')
    };

    // --- FUNÇÕES DE INICIALIZAÇÃO ---

    function init() {
        initSmoothScroll();
        initScrollNav();
        initScrollAnimations();
        initEventCards();
        initModals();
        initProgressBar();
        initBillingToggle();
        initImageErrorHandling();
        
    }

    /**
     * Adiciona o evento de scroll suave para links de âncora.
     * AGORA COM A CORREÇÃO PARA O BOTÃO DE SUBIR.
     */
    function initSmoothScroll() {
        domCache.smoothScrollLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');

                // Se o link for para o #header (botão de subir), rola para o topo da página
                if (targetId === '#header' || targetId === '#head') {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                    return; // Interrompe a execução aqui
                }
                
                if (targetId === '#') return;

                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    function initScrollNav() {
        if (!domCache.scrollNav) return;
        window.addEventListener('scroll', () => {
            domCache.scrollNav.classList.toggle('visible', window.scrollY > window.innerHeight / 2);
        });
    }

    function initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        domCache.animatedSections.forEach(section => observer.observe(section));
    }

    function initEventCards() {
        if (!domCache.mainEventImage) return;
        domCache.eventCards.forEach(card => {
            card.addEventListener('click', () => {
                domCache.eventCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const newImageSrc = card.getAttribute('data-image');
                domCache.mainEventImage.style.opacity = 0;
                setTimeout(() => {
                    domCache.mainEventImage.src = newImageSrc;
                    domCache.mainEventImage.style.opacity = 1;
                }, 300);
            });
        });
    }

    // Tratamento de erro para imagens
    function initImageErrorHandling() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('error', function() {
                // Fallback para imagem quebrada
                this.style.display = 'none';
                
                // Criar elemento de fallback se não existir
                if (!this.nextElementSibling || !this.nextElementSibling.classList.contains('image-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'image-fallback';
                    const span = document.createElement('span');
                    span.textContent = 'Imagem não disponível';
                    fallback.appendChild(span);
                    fallback.style.cssText = `
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #f3f4f6;
                        color: #6b7280;
                        min-height: 200px;
                        border-radius: 8px;
                        font-size: 14px;
                    `;
                    this.parentNode.insertBefore(fallback, this.nextSibling);
                }
            });
        });
    }
    
    function initModals() {
        let lastFocused = null;
        const focusableSelector = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
        const trapFocus = (modal) => {
            const focusables = Array.from(modal.querySelectorAll(focusableSelector)).filter(el => !el.hasAttribute('disabled'));
            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];
            const handleKeyDown = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl?.focus();
                    } else if (!e.shiftKey && document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl?.focus();
                    }
                } else if (e.key === 'Escape') {
                    closeModal(modal);
                }
            };
            modal.addEventListener('keydown', handleKeyDown);
            modal.__cleanupTrap = () => modal.removeEventListener('keydown', handleKeyDown);
            firstEl?.focus();
        };

        const openModal = (modal) => {
            if (modal) {
                lastFocused = document.activeElement;
                modal.classList.remove('hidden');
                document.body.classList.add('modal-open');
                trapFocus(modal);
            }
        };
        const closeModal = (modal) => {
            if (modal) {
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');
                modal.__cleanupTrap?.();
                if (lastFocused && typeof lastFocused.focus === 'function') {
                    lastFocused.focus();
                }
            }
        };

        if (domCache.cadastroModal) {
            const cadastroTriggers = [domCache.openModalBtn, document.getElementById('btn-cadastro-modal-link')].filter(Boolean);
            cadastroTriggers.forEach(trigger => trigger.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(domCache.cadastroModal)
            }));
            domCache.closeModalBtn?.addEventListener('click', () => closeModal(domCache.cadastroModal));
            domCache.cadastroModal.addEventListener('click', (e) => {
                if (e.target === domCache.cadastroModal) closeModal(domCache.cadastroModal);
            });
        }
    }

    function initProgressBar() {
        if (!domCache.progressBar) return;
        window.addEventListener('scroll', () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            domCache.progressBar.style.width = `${progress}%`;
        });
    }

    // --- Toggle de Cobrança Mensal/Anual com atualização dinâmica de preços ---
    function initBillingToggle() {
        const toggle = document.querySelector('.billing-toggle');
        const cards = document.querySelectorAll('.plan-card');
        if (!toggle || cards.length === 0) return;

        const buttons = toggle.querySelectorAll('.toggle-btn');

        // Mapeamento de preços (valores atuais conforme conteúdo das páginas)
        const prices = {
            basic: { monthly: 187.90, annualMonthly: 166.66 },
            premium: { monthly: 293.60, annualMonthly: 266.66 }
        };

        const currencyBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const setActiveButton = (mode) => {
            buttons.forEach(b => b.classList.toggle('active', b.dataset.billing === mode));
        };

        const updateMode = (mode) => {
            setActiveButton(mode);
            localStorage.setItem('billingMode', mode);
            cards.forEach(card => {
                const plan = card.getAttribute('data-plan') || card.querySelector('[data-plan]')?.getAttribute('data-plan');
                if (!plan || !prices[plan]) return;

                const nameEl = card.querySelector('.plan-name');
                const equivBox = card.querySelector('.equivalent-price');
                const equivStrong = card.querySelector('.equivalent-price strong');
                const savingsEl = card.querySelector('.equivalent-price .savings');

                const monthly = prices[plan].monthly;
                const annualMonthly = prices[plan].annualMonthly;
                const annualTotal = +(annualMonthly * 12).toFixed(2);
                const monthlyTotal = +(monthly * 12).toFixed(2);
                const savings = +(monthlyTotal - annualTotal).toFixed(2);

                if (mode === 'monthly') {
                    if (nameEl) nameEl.textContent = `${currencyBRL(monthly)}/mês`;
                    if (equivBox) equivBox.style.display = 'none';
                } else {
                    if (nameEl) nameEl.textContent = `${currencyBRL(annualTotal)}/ano`;
                    if (equivBox) {
                        equivBox.style.display = '';
                        if (equivStrong) equivStrong.textContent = `Equivalente a ${currencyBRL(annualMonthly)}/mês`;
                        if (savingsEl) savingsEl.textContent = `Economize ${currencyBRL(savings)}!`;
                    }
                }
            });
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.billing === 'annual' ? 'annual' : 'monthly';
                updateMode(mode);
            });
        });

        // Inicializa com prioridade: query param > localStorage > monthly
        const urlParams = new URLSearchParams(window.location.search);
        const paramMode = urlParams.get('billing');
        const storedMode = localStorage.getItem('billingMode');
        const initialMode = (paramMode === 'annual' || paramMode === 'monthly') ? paramMode : (storedMode || 'monthly');
        updateMode(initialMode);
    }

    // Validação client-side aprimorada
    function initFormValidation() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        const validators = {
            nome: (value) => {
                if (!value.trim()) return 'Nome é obrigatório';
                if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
                if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) return 'Nome deve conter apenas letras';
                return null;
            },
            email: (value) => {
                if (!value.trim()) return 'E-mail é obrigatório';
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return 'E-mail inválido';
                return null;
            },
            telefone: (value) => {
                if (value && !/^[\d\s\(\)\-\+]+$/.test(value)) return 'Telefone inválido';
                return null;
            },
            mensagem: (value) => {
                if (!value.trim()) return 'Mensagem é obrigatória';
                if (value.trim().length < 10) return 'Mensagem deve ter pelo menos 10 caracteres';
                return null;
            }
        };

        const showError = (fieldName, message) => {
            const errorEl = document.getElementById(`${fieldName}-error`);
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (errorEl && field) {
                errorEl.textContent = message;
                errorEl.classList.add('show');
                field.parentElement.classList.add('error');
            }
        };

        const clearError = (fieldName) => {
            const errorEl = document.getElementById(`${fieldName}-error`);
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (errorEl && field) {
                errorEl.textContent = '';
                errorEl.classList.remove('show');
                field.parentElement.classList.remove('error');
            }
        };

        const validateField = (fieldName, value) => {
            const validator = validators[fieldName];
            if (!validator) return true;
            
            const error = validator(value);
            if (error) {
                showError(fieldName, error);
                return false;
            } else {
                clearError(fieldName);
                return true;
            }
        };

        // Validação em tempo real
        Object.keys(validators).forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.addEventListener('blur', () => {
                    validateField(fieldName, field.value);
                });
                field.addEventListener('input', () => {
                    if (field.parentElement.classList.contains('error')) {
                        validateField(fieldName, field.value);
                    }
                });
            }
        });

        return { validateField, clearError };
    }

    // Interceptar envio do formulário de contato para integração com API
    function initContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;
        
        const { validateField, clearError } = initFormValidation();
        const submitBtn = form.querySelector('button[type="submit"]');
        const feedback = document.getElementById('contact-feedback');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Limpar erros anteriores
            ['nome', 'email', 'telefone', 'mensagem'].forEach(clearError);
            
            const formData = new FormData(form);
            const payload = {
                nome: formData.get('nome')?.toString().trim() || '',
                email: formData.get('email')?.toString().trim() || '',
                telefone: formData.get('telefone')?.toString().trim() || '',
                mensagem: formData.get('mensagem')?.toString().trim() || '',
                website: formData.get('website')?.toString().trim() || '' // honeypot
            };

            // Validar todos os campos
            let isValid = true;
            Object.keys(payload).forEach(fieldName => {
                if (fieldName !== 'website') {
                    if (!validateField(fieldName, payload[fieldName])) {
                        isValid = false;
                    }
                }
            });

            if (!isValid) {
                if (feedback) {
                    feedback.textContent = 'Por favor, corrija os erros acima.';
                    feedback.style.color = 'var(--cor-erro)';
                }
                return;
            }

            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            if (feedback) { 
                feedback.textContent = 'Enviando...';
                feedback.style.color = 'var(--cor-texto-geral)';
            }
            
            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    if (feedback) { 
                        feedback.textContent = 'Mensagem enviada com sucesso!';
                        feedback.style.color = 'var(--cor-sucesso)';
                    }
                    form.reset();
                } else {
                    const msg = data?.message || 'Erro ao enviar sua mensagem.';
                    if (feedback) { 
                        feedback.textContent = msg;
                        feedback.style.color = 'var(--cor-erro)';
                    }
                }
            } catch (err) {
                if (feedback) { 
                    feedback.textContent = 'Falha de rede. Tente novamente.';
                    feedback.style.color = 'var(--cor-erro)';
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        });
    }

    init();
    initContactForm();
});