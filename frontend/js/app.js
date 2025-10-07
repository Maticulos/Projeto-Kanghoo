// Executa o script quando o conteúdo da página estiver totalmente carregado
document.addEventListener('DOMContentLoaded', function() {
    // Configurações globais
    const config = {
        scrollBehavior: 'smooth',
        scrollBlock: 'start',
        observerThreshold: 0.15,
        imageTransitionDuration: 300
    };

    // Cache de elementos DOM
    const domCache = {
        smoothScrollLinks: document.querySelectorAll('a.nav-link[href^="#"]'),
        animatedSections: document.querySelectorAll('.animated-section'),
        eventCards: document.querySelectorAll('.event-card'),
        mainEventImage: document.getElementById('event-main-image'),
        cadastroModal: document.getElementById('cadastroModal'),
        openModalBtn: document.getElementById('btn-cadastro-modal'),
        closeModalBtn: document.getElementById('close-modal'),
        contactForm: document.getElementById('contact-form'),
        planButtons: document.querySelectorAll('[data-plan]'),
        searchForm: document.querySelector('.search-form'),
        dropdowns: document.querySelectorAll('.nav-dropdown'),
        transportModal: document.getElementById('transportModal'),
        openTransportModal: document.getElementById('open-transport-modal'),
        closeTransportModal: document.getElementById('close-transport-modal'),
        openTransportSearch: document.getElementById('open-transport-search'),
        openTransportFilters: document.getElementById('open-transport-filters')
    };

    /**
     * FUNÇÃO DE SCROLL SUAVE (Otimizada)
     */
    function initSmoothScroll() {
        domCache.smoothScrollLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                
                if (targetId.startsWith('#')) {
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: config.scrollBehavior,
                            block: config.scrollBlock
                        });
                        
                        // Atualiza a URL sem recarregar a página
                        history.pushState(null, null, targetId);
                    }
                } else {
                    // Links externos, permite o comportamento padrão
                    return true;
                }
            });
        });
    }

    /**
     * FUNÇÃO DE ANIMAÇÃO AO SCROLLAR (FADE-IN) (Otimizada)
     */
    function initScrollAnimations() {
        const observerOptions = {
            threshold: config.observerThreshold,
            rootMargin: '0px 0px -10% 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        domCache.animatedSections.forEach(section => {
            observer.observe(section);
        });
    }

    /**
     * FUNÇÃO DE INTERATIVIDADE DOS CARDS DE EVENTOS (Otimizada)
     */
    function initEventCards() {
        if (domCache.eventCards.length > 0 && domCache.mainEventImage) {
            domCache.eventCards.forEach(card => {
                card.addEventListener('click', () => {
                    // Remove a classe 'active' de todos os outros cards
                    domCache.eventCards.forEach(c => c.classList.remove('active'));
                    
                    // Adiciona a classe 'active' apenas no card clicado
                    card.classList.add('active');

                    const newImageSrc = card.getAttribute('data-image');
                    
                    // Pré-carregar a imagem para melhor UX
                    preloadImage(newImageSrc).then(() => {
                        // Efeito de fade para a troca de imagem
                        domCache.mainEventImage.style.opacity = 0;
                        
                        setTimeout(() => {
                            domCache.mainEventImage.src = newImageSrc;
                            domCache.mainEventImage.style.opacity = 1;
                        }, config.imageTransitionDuration);
                    }).catch(() => {
                        // Fallback se o pré-carregamento falhar
                        domCache.mainEventImage.style.opacity = 0;
                        
                        setTimeout(() => {
                            domCache.mainEventImage.src = newImageSrc;
                            domCache.mainEventImage.style.opacity = 1;
                        }, config.imageTransitionDuration);
                    });
                });
            });
        }
    }

    /**
     * Pré-carrega uma imagem para evitar flickering
     */
    function preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => reject(src);
            img.src = src;
        });
    }

    /**
     * FUNÇÃO DO MODAL DE CADASTRO (Otimizada)
     */
    function initCadastroModal() {
        if (domCache.cadastroModal && domCache.openModalBtn && domCache.closeModalBtn) {
            // Evento para abrir o modal
            domCache.openModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(domCache.cadastroModal, domCache.closeModalBtn);
            });

            // Evento para fechar o modal no botão 'X'
            domCache.closeModalBtn.addEventListener('click', () => {
                closeModal(domCache.cadastroModal);
            });

            // Configurar eventos comuns para modais
            setupModalEvents(domCache.cadastroModal);
        }
    }

    /**
     * FUNÇÃO DO MODAL DE TRANSPORTE (Otimizada)
     */
    function initTransportModal() {
        if (domCache.transportModal && domCache.openTransportModal && domCache.closeTransportModal) {
            // Evento para abrir o modal
            domCache.openTransportModal.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(domCache.transportModal, domCache.closeTransportModal);
            });

            // Evento para fechar o modal no botão 'X'
            domCache.closeTransportModal.addEventListener('click', () => {
                closeModal(domCache.transportModal);
            });

            // Configurar eventos comuns para modais
            setupModalEvents(domCache.transportModal);

            // Eventos para botões adicionais que abrem o modal de transporte
            if (domCache.openTransportSearch) {
                domCache.openTransportSearch.addEventListener('click', (e) => {
                    e.preventDefault();
                    openModal(domCache.transportModal, domCache.closeTransportModal);
                });
            }

            if (domCache.openTransportFilters) {
                domCache.openTransportFilters.addEventListener('click', (e) => {
                    e.preventDefault();
                    openModal(domCache.transportModal, domCache.closeTransportModal);
                });
            }
        }
    }

    /**
     * CONFIGURA EVENTOS COMUNS PARA MODAIS
     */
    function setupModalEvents(modal) {
        // Evento para fechar o modal clicando no fundo escuro
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });

        // Fechar modal com a tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal(modal);
            }
        });

        // Fechar modal quando um link for clicado
        const modalLinks = modal.querySelectorAll('a');
        modalLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeModal(modal);
            });
        });
    }

    /**
     * ABRIR MODAL
     */
    function openModal(modal, closeButton) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (closeButton) closeButton.focus();
    }

    /**
     * FECHAR MODAL
     */
    function closeModal(modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    /**
     * ADICIONA CLASSE AO BODY NAS PÁGINAS DE FORMULÁRIO
     */
    function initFormPages() {
        if (document.querySelector('body main form')) {
            const pageTitle = document.title.toLowerCase();
            if (pageTitle.includes('cadastro') || pageTitle.includes('login')) {
                document.body.classList.add('form-page');
                const mainContainer = document.querySelector('main');
                if (mainContainer) mainContainer.classList.add('form-container');
            }
        }
    }

    /**
     * Validação de formulários
     */
    function initFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(function(form) {
            form.addEventListener('submit', function(e) {
                // Verificar se é um formulário de cadastro
                if (form.id === 'cadastroForm' || form.querySelector('input[type="file"]')) {
                    // Validação básica de campos obrigatórios
                    const requiredFields = form.querySelectorAll('[required]');
                    let isValid = true;
                    
                    requiredFields.forEach(function(field) {
                        if (!field.value.trim()) {
                            isValid = false;
                            field.style.borderColor = '#ef4444';
                            
                            // Remover o destaque após um tempo
                            setTimeout(function() {
                                field.style.borderColor = '';
                            }, 3000);
                        }
                    });
                    
                    // Verificar se as senhas coincidem (para formulários de cadastro)
                    const password = form.querySelector('#senha');
                    const confirmPassword = form.querySelector('#confirmaSenha');
                    
                    if (password && confirmPassword && password.value !== confirmPassword.value) {
                        isValid = false;
                        confirmPassword.style.borderColor = '#ef4444';
                        alert('As senhas não coincidem. Por favor, verifique.');
                        
                        setTimeout(function() {
                            confirmPassword.style.borderColor = '';
                        }, 3000);
                    }
                    
                    if (!isValid) {
                        e.preventDefault();
                        alert('Por favor, preencha todos os campos obrigatórios.');
                    }
                }
            });
        });
    }
    
    /**
     * Máscaras para campos de formulário
     */
    function initInputMasks() {
        // Máscara para telefone
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(function(input) {
            input.addEventListener('input', function() {
                let value = this.value.replace(/\D/g, '');
                
                if (value.length > 11) {
                    value = value.slice(0, 11);
                }
                
                if (value.length > 0) {
                    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                    
                    if (value.length > 10) {
                        value = value.replace(/(\d{5})(\d)/, '$1-$2');
                    } else {
                        value = value.replace(/(\d{4})(\d)/, '$1-$2');
                    }
                }
                
                this.value = value;
            });
        });
        
        // Máscara para CEP
        const cepInputs = document.querySelectorAll('input#cep');
        cepInputs.forEach(function(input) {
            input.addEventListener('input', function() {
                let value = this.value.replace(/\D/g, '');
                
                if (value.length > 8) {
                    value = value.slice(0, 8);
                }
                
                if (value.length > 5) {
                    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
                }
                
                this.value = value;
            });
        });
        
        // Máscara para placa de veículo
        const plateInputs = document.querySelectorAll('input#placa');
        plateInputs.forEach(function(input) {
            input.addEventListener('input', function() {
                let value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                
                if (value.length > 7) {
                    value = value.slice(0, 7);
                }
                
                if (value.length > 3) {
                    value = value.replace(/^([A-Z]{3})([0-9A-Z]{1,4})/, '$1-$2');
                }
                
                this.value = value;
            });
        });
    }

    /**
     * Inicialização de dropdowns de navegação
     */
    function initDropdowns() {
        domCache.dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            
            // Fechar dropdown ao clicar fora
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    const content = dropdown.querySelector('.nav-dropdown-content');
                    if (content) content.style.display = 'none';
                }
            });
            
            // Prevenir que clicks dentro do dropdown fechem ele
            dropdown.querySelector('.nav-dropdown-content')?.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    /**
     * Funções adicionais para melhorar a experiência do usuário
     */
    function initAdditionalFeatures() {
        // Lazy loading para imagens
        initLazyLoading();
        
        // Manipulador de formulário de contato
        if (domCache.contactForm) {
            domCache.contactForm.addEventListener('submit', handleContactFormSubmit);
        }
        
        // Manipulador de botões de plano
        if (domCache.planButtons.length > 0) {
            domCache.planButtons.forEach(button => {
                button.addEventListener('click', handlePlanButtonClick);
            });
        }
        
        // Manipulador de busca
        if (domCache.searchForm) {
            domCache.searchForm.addEventListener('submit', handleSearchSubmit);
        }
        
        // Inicializar tooltips (se houver)
        initTooltips();
    }

    function initLazyLoading() {
        const lazyImages = document.querySelectorAll('img.lazy');
        
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        lazyImage.src = lazyImage.dataset.src || lazyImage.src;
                        lazyImage.classList.add('lazy-loaded');
                        lazyImageObserver.unobserve(lazyImage);
                    }
                });
            });

            lazyImages.forEach(lazyImage => {
                lazyImageObserver.observe(lazyImage);
            });
        } else {
            // Fallback para navegadores sem suporte a IntersectionObserver
            lazyImages.forEach(lazyImage => {
                lazyImage.src = lazyImage.dataset.src || lazyImage.src;
                lazyImage.classList.add('lazy-loaded');
            });
        }
    }

    function handleContactFormSubmit(e) {
        e.preventDefault();
        const submitButton = this.querySelector('button[type="submit"]');
        const formData = new FormData(this);
        
        // Validação básica
        if (!this.checkValidity()) {
            this.reportValidity();
            return;
        }
        
        // Simular envio (substituir por lógica real)
        submitButton.classList.add('btn-loading');
        submitButton.disabled = true;
        
        setTimeout(() => {
            alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
            this.reset();
            submitButton.classList.remove('btn-loading');
            submitButton.disabled = false;
        }, 1500);
    }

    function handlePlanButtonClick(e) {
        const button = e.currentTarget;
        const plan = button.getAttribute('data-plan');
        
        // Simular processamento (substituir por lógica real)
        button.classList.add('btn-loading');
        button.disabled = true;
        
        setTimeout(() => {
            // Redirecionar para página de planos com parâmetro
            window.location.href = `planos.html?selected=${plan}`;
        }, 1000);
    }

    function handleSearchSubmit(e) {
        e.preventDefault();
        const searchInput = this.querySelector('input[type="search"]');
        const searchTerm = searchInput.value.trim();
        
        if (!searchTerm) {
            searchInput.focus();
            return;
        }
        
        // Redirecionar para página de resultados de busca
        window.location.href = `encontrar.html?search=${encodeURIComponent(searchTerm)}`;
    }

    function initTooltips() {
        // Implementação básica de tooltips para elementos com data-tooltip
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
        });
        
        function showTooltip(e) {
            const tooltipText = this.getAttribute('data-tooltip');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width/2 - tooltip.offsetWidth/2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
            
            this._currentTooltip = tooltip;
        }
        
        function hideTooltip() {
            if (this._currentTooltip) {
                document.body.removeChild(this._currentTooltip);
                this._currentTooltip = null;
            }
        }
    }

    /**
     * Funções específicas para a página de planos
     */
    function initPlansPage() {
        if (document.querySelector('.plano-section')) {
            // Destacar plano selecionado vindo da URL
            const urlParams = new URLSearchParams(window.location.search);
            const selectedPlan = urlParams.get('selected');
            
            if (selectedPlan) {
                const planElement = document.querySelector(`[data-plan="${selectedPlan}"]`);
                if (planElement) {
                    planElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    planElement.classList.add('highlighted');
                    
                    // Remover destaque após 3 segundos
                    setTimeout(() => {
                        planElement.classList.remove('highlighted');
                    }, 3000);
                }
            }
        }
    }

    /**
     * Funções específicas para a página de busca
     */
    function initSearchPage() {
        if (document.querySelector('.search-hero')) {
            // Preencher campo de busca com parâmetro da URL
            const urlParams = new URLSearchParams(window.location.search);
            const searchTerm = urlParams.get('search');
            
            if (searchTerm) {
                const searchInput = document.querySelector('.search-form input[type="search"]');
                if (searchInput) {
                    searchInput.value = decodeURIComponent(searchTerm);
                    // Poderia disparar uma busca automática aqui
                }
            }
            
            // Inicializar filtros (se existirem)
            initFilters();
        }
    }

    function initFilters() {
        const filterToggles = document.querySelectorAll('.filter-toggle');
        
        filterToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const filterContent = toggle.nextElementSibling;
                filterContent.classList.toggle('active');
            });
        });
    }

    /**
     * Inicialização de âncoras de página
     */
    function initPageAnchors() {
        // Verifica se há âncoras na URL
        const urlHash = window.location.hash;
        if (urlHash) {
            setTimeout(() => {
                const targetElement = document.querySelector(urlHash);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 500);
        }
    }

    /**
     * Inicialização de todas as funcionalidades
     */
    function init() {
        initSmoothScroll();
        initCadastroModal();
        initTransportModal();
        initPageAnchors(); 
        initScrollAnimations();
        initEventCards();
        initFormPages();
        initDropdowns();
        initAdditionalFeatures();
        initPlansPage();
        initSearchPage();
        initFormValidation();
        initInputMasks();
        
        // Log para debug (pode ser removido em produção)
        console.log('Kanghoo App inicializado com sucesso');
    }

    // Inicia a aplicação
    init();
});