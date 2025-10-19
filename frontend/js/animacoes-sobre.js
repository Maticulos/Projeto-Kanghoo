// Animações da Página Sobre - Kanghoo
document.addEventListener('DOMContentLoaded', function() {
    
    // Intersection Observer para animações no scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                
                // Animação especial para estatísticas
                if (entry.target.classList.contains('stats-section')) {
                    animateCounters();
                }
                
                // Animação escalonada para cards
                if (entry.target.classList.contains('stats-grid') || 
                    entry.target.classList.contains('values-grid') ||
                    entry.target.classList.contains('team-grid') ||
                    entry.target.classList.contains('testimonials-grid')) {
                    animateCards(entry.target);
                }
                
                // Animação escalonada para timeline
                if (entry.target.classList.contains('timeline')) {
                    animateTimeline();
                }
            }
        });
    }, observerOptions);

    // Elementos para observar
    const elementsToAnimate = [
        '.section-title',
        '.story-text',
        '.story-image',
        '.stats-section',
        '.stats-grid',
        '.values-grid',
        '.team-grid',
        '.timeline',
        '.testimonials-grid'
    ];

    elementsToAnimate.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => observer.observe(el));
    });

    // Função para animar contadores das estatísticas
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        counters.forEach((counter, index) => {
            const target = counter.textContent;
            const isPercentage = target.includes('%');
            const hasPlus = target.includes('+');
            const numericValue = parseInt(target.replace(/[^\d]/g, ''));
            
            // Adiciona delay escalonado
            setTimeout(() => {
                counter.classList.add('counting');
                animateValue(counter, 0, numericValue, 2000, isPercentage, hasPlus);
            }, index * 200);
        });
    }

    // Função para animar valores numericos
    function animateValue(element, start, end, duration, isPercentage = false, hasPlus = false) {
        const startTime = performance.now();
        
        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * easeOut);
            
            let displayValue = current.toLocaleString('pt-BR');
            if (isPercentage) displayValue += '%';
            if (hasPlus && progress === 1) displayValue += '+';
            
            element.textContent = displayValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        }
        
        requestAnimationFrame(updateValue);
    }

    // Função para animar cards com delay escalonado
    function animateCards(container) {
        const cards = container.children;
        
        Array.from(cards).forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate');
            }, index * 150);
        });
    }

    // Função para animar timeline
    function animateTimeline() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        
        timelineItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('animate');
            }, index * 200);
        });
    }

    // Animação suave para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Efeito parallax sutil para imagens
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.story-image img, .member-photo img');
        
        parallaxElements.forEach(element => {
            const speed = 0.1;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });

    // Adiciona efeito de hover melhorado para cards
    const interactiveCards = document.querySelectorAll('.stat-card, .value-card, .team-member, .testimonial-card');
    
    interactiveCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
            this.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '';
        });
    });

    // Enhanced image error handling for team member photos
    document.querySelectorAll('.member-photo img').forEach(img => {
        // Loading state
        img.addEventListener('loadstart', function() {
            this.style.opacity = '0.5';
        });
        
        // Success state
        img.addEventListener('load', function() {
            this.style.opacity = '1';
            console.log('Team image loaded successfully:', this.src);
            
            // Special handling for SVG files
            if (this.src.endsWith('.svg')) {
                this.style.objectFit = 'contain';
                this.style.background = 'transparent';
            }
        });
        
        // Enhanced error handling
        img.addEventListener('error', function() {
            console.warn('Failed to load team image:', this.src);
            
            // For SVG files, try to reload once
            if (this.src.endsWith('.svg') && !this.hasAttribute('data-retry')) {
                this.setAttribute('data-retry', 'true');
                setTimeout(() => {
                    this.src = this.src + '?t=' + Date.now();
                }, 100);
                return;
            }
            
            this.style.display = 'none';
            
            // Show placeholder
            const placeholder = this.nextElementSibling;
            if (placeholder && placeholder.classList.contains('photo-placeholder')) {
                placeholder.style.display = 'flex';
            }
        });
        
        // Preload SVG images
        if (img.src.endsWith('.svg')) {
            const preloadImg = new Image();
            preloadImg.src = img.src;
        }
    });

    // Animação de entrada para o hero
    setTimeout(() => {
        document.querySelector('.about-hero')?.classList.add('animate');
    }, 100);

    console.log('🎨 Animações da página Sobre carregadas com sucesso!');
});