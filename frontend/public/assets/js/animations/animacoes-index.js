// Index Page Animations - Sistema Unificado
document.addEventListener('DOMContentLoaded', function() {
    
    // Configurações globais de animação
    const ANIMATION_CONFIG = {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px',
        sectionDelay: 300,
        elementDelay: 150
    };

    // Mapeamento de seções e seus elementos animáveis
    const SECTIONS_CONFIG = {
        '.solutions-section': {
            elements: ['.solution-card'],
            animationType: 'fadeInUp',
            stagger: true
        },
        '.events-and-search-section': {
            elements: ['.event-card', '.event-image-display'],
            animationType: 'slideInLeft',
            stagger: true
        },
        '.search-hero': {
            elements: ['.section-title', '.hero-subheadline', '.search-form', '.filters-link'],
            animationType: 'fadeInUp',
            stagger: true
        },
        '.pricing-section': {
            elements: ['.plans-header', '.plan-card'],
            animationType: 'scaleIn',
            stagger: true
        },
        '.contact-section': {
            elements: ['.section-title', '.contact-form input', '.contact-form select', '.contact-form textarea', '.contact-form button'],
            animationType: 'fadeInUp',
            stagger: true
        }
    };

    // Estilos CSS para animações (aplicados via JavaScript)
    const animationStyles = `
        .animate-section {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        
        .animate-fadeInUp {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        
        .animate-slideInLeft {
            opacity: 1 !important;
            transform: translateX(0) !important;
        }
        
        .animate-scaleIn {
            opacity: 1 !important;
            transform: scale(1) !important;
        }
        
        /* Estados iniciais */
        .animated-section {
            opacity: 0;
            transform: translateY(50px);
            transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .animated-section .solution-card,
        .animated-section .event-card,
        .animated-section .event-image-display,
        .animated-section .section-title,
        .animated-section .hero-subheadline,
        .animated-section .search-form,
        .animated-section .filters-link,
        .animated-section .plans-header,
        .animated-section .plan-card,
        .animated-section .contact-form input,
        .animated-section .contact-form select,
        .animated-section .contact-form textarea,
        .animated-section .contact-form button {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .animated-section .event-card,
        .animated-section .event-image-display {
            transform: translateX(-30px);
        }
        
        .animated-section .plan-card {
            transform: scale(0.9) translateY(30px);
        }
    `;

    // Adicionar estilos ao documento
    const styleSheet = document.createElement('style');
    styleSheet.textContent = animationStyles;
    document.head.appendChild(styleSheet);

    // Função principal de animação de seção
    function animateSection(section) {
        const sectionSelector = getSectionSelector(section);
        const config = SECTIONS_CONFIG[sectionSelector];
        
        if (!config) return;

        // Animar a seção principal
        section.classList.add('animate-section');
        
        // Animar elementos filhos com stagger
        if (config.stagger && config.elements) {
            config.elements.forEach(elementSelector => {
                const elements = section.querySelectorAll(elementSelector);
                elements.forEach((element, index) => {
                    setTimeout(() => {
                        element.classList.add(`animate-${config.animationType}`);
                    }, index * ANIMATION_CONFIG.elementDelay);
                });
            });
        }
    }

    // Função para obter o seletor da seção
    function getSectionSelector(section) {
        for (const selector of Object.keys(SECTIONS_CONFIG)) {
            if (section.matches(selector)) {
                return selector;
            }
        }
        return null;
    }

    // Intersection Observer unificado
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Delay para criar harmonia entre seções
                setTimeout(() => {
                    animateSection(entry.target);
                }, ANIMATION_CONFIG.sectionDelay);
                
                // Parar de observar após animar
                sectionObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: ANIMATION_CONFIG.threshold,
        rootMargin: ANIMATION_CONFIG.rootMargin
    });

    // Observar todas as seções animadas
    const animatedSections = document.querySelectorAll('.animated-section');
    animatedSections.forEach(section => {
        sectionObserver.observe(section);
    });

    // ===== FUNCIONALIDADES ADICIONAIS =====

    // Smooth scrolling para links de navegação
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Efeito hover suave para botões
    const buttons = document.querySelectorAll('.btn-primary, .btn-blue');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            this.style.transition = 'all 0.3s ease';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '';
        });
    });

    // Interações dos cards de eventos
    const eventCards = document.querySelectorAll('.event-card');
    const eventMainImage = document.getElementById('event-main-image');
    
    eventCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Remover classe active de outros cards
            eventCards.forEach(c => c.classList.remove('active'));
            // Adicionar classe active ao card atual
            this.classList.add('active');
            
            // Trocar imagem principal
            const newImage = this.getAttribute('data-image');
            if (newImage && eventMainImage) {
                eventMainImage.style.opacity = '0';
                setTimeout(() => {
                    eventMainImage.src = newImage;
                    eventMainImage.style.opacity = '1';
                }, 200);
            }
            
            // Efeito visual no card
            this.style.transform = 'translateX(10px) scale(1.02)';
            this.style.transition = 'all 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(0) scale(1)';
            }
        });
    });

    // Efeito parallax suave no hero
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector('.hero-image');
        
        if (heroImage) {
            const rate = scrolled * -0.3;
            heroImage.style.transform = `translateY(${rate}px)`;
        }
        
        ticking = false;
    }
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });

    // Toggle de planos (mensal/anual)
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const planCards = document.querySelectorAll('.plan-card');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover classe active de todos os botões
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            // Adicionar classe active ao botão clicado
            this.classList.add('active');
            
            // Lógica para alternar entre planos mensais e anuais
            const billingType = this.getAttribute('data-billing');
            
            planCards.forEach(card => {
                const monthlyElements = card.querySelectorAll('.monthly-price');
                const annualElements = card.querySelectorAll('.annual-option, .equivalent-price');
                
                if (billingType === 'annual') {
                    monthlyElements.forEach(el => el.style.display = 'none');
                    annualElements.forEach(el => el.style.display = 'block');
                } else {
                    monthlyElements.forEach(el => el.style.display = 'block');
                    annualElements.forEach(el => el.style.display = 'none');
                }
            });
        });
    });

    console.log('✅ Sistema de animações unificado carregado com sucesso');
});