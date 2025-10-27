// Animações para a página de planos - Sistema Unificado
document.addEventListener('DOMContentLoaded', function() {
    
    // Configuração de animações específicas para planos
    const PLANS_ANIMATION_CONFIG = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
        sectionDelay: 300,
        elementDelay: 150
    };

    // Estilos CSS para animações dos planos
    const plansAnimationStyles = `
        .plans-animate-section {
            opacity: 1;
            transform: translateY(0);
        }
        
        .plans-animate-fadeInUp {
            opacity: 1;
            transform: translateY(0);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .plans-animate-scaleIn {
            opacity: 1;
            transform: scale(1);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }

        /* Estados iniciais para elementos dos planos */
        .plans-section .plan-card,
        .plans-section .plans-header,
        .plans-section .billing-toggle {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .plans-section .plan-card {
            transform: scale(0.95);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
    `;

    // Adicionar estilos ao documento
    const styleSheet = document.createElement('style');
    styleSheet.textContent = plansAnimationStyles;
    document.head.appendChild(styleSheet);

    // Função para animar seção de planos
    function animatePlansSection(section) {
        const config = {
            '.plans-header': { animationType: 'fadeInUp', elements: ['.plans-title', '.plans-subtitle'] },
            '.billing-toggle': { animationType: 'fadeInUp', elements: ['.toggle-btn'] },
            '.plans-grid': { animationType: 'scaleIn', elements: ['.plan-card'] }
        };

        section.classList.add('plans-animate-section');

        Object.entries(config).forEach(([selector, animConfig], sectionIndex) => {
            const container = section.querySelector(selector);
            if (!container) return;

            setTimeout(() => {
                container.classList.add(`plans-animate-${animConfig.animationType}`);
                
                // Animar elementos filhos com stagger
                const elements = container.querySelectorAll(animConfig.elements.join(', '));
                elements.forEach((element, index) => {
                    setTimeout(() => {
                        element.classList.add(`plans-animate-${animConfig.animationType}`);
                    }, index * PLANS_ANIMATION_CONFIG.elementDelay);
                });
            }, sectionIndex * PLANS_ANIMATION_CONFIG.sectionDelay);
        });
    }

    // Observer específico para planos (evita conflito com app.js)
    const plansObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    animatePlansSection(entry.target);
                }, PLANS_ANIMATION_CONFIG.sectionDelay);
                
                plansObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: PLANS_ANIMATION_CONFIG.threshold,
        rootMargin: PLANS_ANIMATION_CONFIG.rootMargin
    });

    // Observar apenas seções específicas de planos
    const plansSection = document.querySelector('.plans-section, .plans-page');
    if (plansSection) {
        plansObserver.observe(plansSection);
    }

    // Animação de entrada para o cabeçalho dos planos (imediata)
    const plansHeader = document.querySelector('.plans-header');
    if (plansHeader) {
        setTimeout(() => {
            plansHeader.style.opacity = '1';
            plansHeader.style.transform = 'translateY(0)';
        }, 100);
    }

    // Efeitos hover melhorados para os botões
    const planButtons = document.querySelectorAll('.plan-btn');
    planButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Animação para o toggle de cobrança (sem conflito)
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active de todos os botões
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona active ao botão clicado
            this.classList.add('active');
            
            // Efeito visual de transição suave
            const planCards = document.querySelectorAll('.plan-card');
            planCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transform = 'scale(0.98)';
                    card.style.transition = 'transform 0.2s ease';
                    
                    setTimeout(() => {
                        card.style.transform = 'scale(1)';
                    }, 100);
                }, index * 50);
            });
        });
    });

    // Efeito parallax suave para cards de planos
    let ticking = false;
    function updatePlansParallax() {
        const planCards = document.querySelectorAll('.plan-card');
        const scrolled = window.pageYOffset;
        
        planCards.forEach((card, index) => {
            const rate = scrolled * -0.02 * (index + 1);
            card.style.transform = `translateY(${rate}px)`;
        });
        
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updatePlansParallax);
            ticking = true;
        }
    });

    // Animação de entrada escalonada para cards de destaque
    const featuredCards = document.querySelectorAll('.plan-card.featured');
    featuredCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.1)';
            card.style.transform = 'translateY(-5px)';
            card.style.transition = 'all 0.3s ease';
        }, 500 + (index * 200));
    });
});