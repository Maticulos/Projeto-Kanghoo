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
        transportModal: document.getElementById('transportModal'),
        openTransportModal: document.getElementById('open-transport-modal'),
        closeTransportModal: document.getElementById('close-transport-modal'),
        openTransportSearch: document.getElementById('open-transport-modal-search'),
        openTransportFilters: document.getElementById('open-transport-filters'),
        openTransportModalHero: document.getElementById('open-transport-modal-hero'),
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
        console.log('Kanghoo App inicializado com sucesso');
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
    
    function initModals() {
        const openModal = (modal) => {
            if (modal) {
                modal.classList.remove('hidden');
                document.body.classList.add('modal-open');
            }
        };
        const closeModal = (modal) => {
            if (modal) {
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');
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
        
        if (domCache.transportModal) {
            const transportTriggers = [
                domCache.openTransportModal, 
                domCache.openTransportSearch, 
                domCache.openTransportFilters,
                domCache.openTransportModalHero
            ].filter(Boolean);
            transportTriggers.forEach(trigger => trigger.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(domCache.transportModal)
            }));
            domCache.closeTransportModal?.addEventListener('click', () => closeModal(domCache.transportModal));
            domCache.transportModal.addEventListener('click', (e) => {
                if (e.target === domCache.transportModal) closeModal(domCache.transportModal);
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

    init();
});