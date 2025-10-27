// ===== PÁGINA DE PLANOS - FUNCIONALIDADES INTERATIVAS =====

class PlansPage {
    constructor() {
        this.currentBilling = 'monthly';
        this.plans = {
            basic: {
                monthly: 29.90,
                annual: 299.00
            },
            premium: {
                monthly: 59.90,
                annual: 599.00
            },
            enterprise: {
                monthly: 99.90,
                annual: 999.00
            }
        };
        
        this.init();
    }

    init() {
        this.setupBillingToggle();
        this.setupFAQ();
        this.setupAnimations();
        this.setupComparison();
        this.updatePricing();
        this.setupAccessibility();
    }

    // ===== ALTERNÂNCIA MENSAL/ANUAL =====
    setupBillingToggle() {
        const toggleBtns = document.querySelectorAll('.toggle-btn');
        
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const billing = e.target.dataset.billing;
                this.switchBilling(billing);
            });
        });
    }

    switchBilling(billing) {
        if (this.currentBilling === billing) return;
        
        this.currentBilling = billing;
        
        // Atualizar botões
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.billing === billing);
        });
        
        // Atualizar preços com animação
        this.updatePricing();
        
        // Anunciar mudança para leitores de tela
        this.announceChange(`Cobrança alterada para ${billing === 'monthly' ? 'mensal' : 'anual'}`);
    }

    updatePricing() {
        const planCards = document.querySelectorAll('.plan-card');
        
        planCards.forEach(card => {
            const planType = card.dataset.plan;
            if (!planType || !this.plans[planType]) return;
            
            const priceElement = card.querySelector('.plan-price');
            const equivalentElement = card.querySelector('.equivalent-price');
            const savingsElement = card.querySelector('.savings');
            
            if (priceElement) {
                const price = this.plans[planType][this.currentBilling];
                const formattedPrice = this.formatPrice(price);
                const period = this.currentBilling === 'monthly' ? '/mês' : '/ano';
                
                // Animação de fade out/in
                priceElement.style.opacity = '0';
                
                setTimeout(() => {
                    priceElement.innerHTML = `
                        <span class="currency">R$</span>
                        ${formattedPrice}
                        <span class="period">${period}</span>
                    `;
                    priceElement.style.opacity = '1';
                }, 150);
            }
            
            // Mostrar/ocultar preço equivalente e economia
            if (equivalentElement && savingsElement) {
                if (this.currentBilling === 'annual') {
                    const monthlyPrice = this.plans[planType].monthly;
                    const annualPrice = this.plans[planType].annual;
                    const monthlyEquivalent = annualPrice / 12;
                    const savings = ((monthlyPrice - monthlyEquivalent) / monthlyPrice * 100).toFixed(0);
                    
                    equivalentElement.style.display = 'block';
                    equivalentElement.innerHTML = `
                        <strong>R$ ${this.formatPrice(monthlyEquivalent)}/mês</strong>
                        <div class="savings">Economize ${savings}% pagando anualmente</div>
                    `;
                } else {
                    equivalentElement.style.display = 'none';
                }
            }
        });
    }

    formatPrice(price) {
        return price.toFixed(2).replace('.', ',');
    }

    // ===== FAQ INTERATIVO =====
    setupFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Fechar outros FAQs
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                    }
                });
                
                // Toggle do FAQ atual
                item.classList.toggle('active');
                question.setAttribute('aria-expanded', !isActive);
                
                // Anunciar para leitores de tela
                const questionText = question.textContent.trim();
                this.announceChange(`FAQ ${!isActive ? 'expandido' : 'recolhido'}: ${questionText}`);
            });
            
            // Configurar acessibilidade
            question.setAttribute('aria-expanded', 'false');
            question.setAttribute('role', 'button');
        });
    }

    // ===== ANIMAÇÕES E SCROLL =====
    setupAnimations() {
        // Intersection Observer para animações
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observar elementos para animação
        const animatedElements = document.querySelectorAll('.plans-header, .plan-card, .faq-section');
        animatedElements.forEach(el => observer.observe(el));

        // Smooth scroll para links internos
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ===== COMPARAÇÃO DE PLANOS =====
    setupComparison() {
        const comparisonBtn = document.querySelector('.comparison-btn');
        
        if (comparisonBtn) {
            comparisonBtn.addEventListener('click', () => {
                this.showComparison();
            });
        }
    }

    showComparison() {
        // Criar modal de comparação
        const modal = document.createElement('div');
        modal.className = 'comparison-modal';
        modal.innerHTML = `
            <div class="comparison-content">
                <div class="comparison-header">
                    <h3>Comparação de Planos</h3>
                    <button class="close-btn" aria-label="Fechar comparação">&times;</button>
                </div>
                <div class="comparison-table">
                    ${this.generateComparisonTable()}
                </div>
            </div>
        `;
        
        // Adicionar estilos do modal
        const style = document.createElement('style');
        style.textContent = `
            .comparison-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .comparison-modal.show {
                opacity: 1;
            }
            
            .comparison-content {
                background: white;
                border-radius: 12px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: auto;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            
            .comparison-modal.show .comparison-content {
                transform: scale(1);
            }
            
            .comparison-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
            }
            
            .comparison-table {
                padding: 20px;
                overflow-x: auto;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Mostrar modal
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Fechar modal
        const closeBtn = modal.querySelector('.close-btn');
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
                document.head.removeChild(style);
            }, 300);
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    generateComparisonTable() {
        const features = [
            'Usuários inclusos',
            'Rotas simultâneas',
            'Suporte técnico',
            'Relatórios básicos',
            'Relatórios avançados',
            'API personalizada',
            'Integração WhatsApp',
            'Backup automático',
            'Suporte prioritário',
            'Gerente dedicado'
        ];
        
        const planFeatures = {
            basic: ['5', '10', '✓', '✓', '✗', '✗', '✗', '✗', '✗', '✗'],
            premium: ['15', '50', '✓', '✓', '✓', '✓', '✓', '✓', '✗', '✗'],
            enterprise: ['Ilimitado', 'Ilimitado', '✓', '✓', '✓', '✓', '✓', '✓', '✓', '✓']
        };
        
        let table = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 12px; border-bottom: 2px solid #eee;">Recurso</th>
                        <th style="text-align: center; padding: 12px; border-bottom: 2px solid #eee;">Básico</th>
                        <th style="text-align: center; padding: 12px; border-bottom: 2px solid #eee;">Premium</th>
                        <th style="text-align: center; padding: 12px; border-bottom: 2px solid #eee;">Empresarial</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        features.forEach((feature, index) => {
            table += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${feature}</td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid #eee;">${planFeatures.basic[index]}</td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid #eee;">${planFeatures.premium[index]}</td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid #eee;">${planFeatures.enterprise[index]}</td>
                </tr>
            `;
        });
        
        table += '</tbody></table>';
        return table;
    }

    // ===== ACESSIBILIDADE =====
    setupAccessibility() {
        // Navegação por teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
        
        // Anúncios para leitores de tela
        this.createAriaLiveRegion();
    }

    createAriaLiveRegion() {
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'live-region';
        document.body.appendChild(liveRegion);
    }

    announceChange(message) {
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    // ===== UTILITÁRIOS =====
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    new PlansPage();
});

// ===== TRATAMENTO DE ERROS =====
window.addEventListener('error', (e) => {
    console.error('Erro na página de planos:', e.error);
});

// ===== PERFORMANCE =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .catch(err => console.log('Service Worker registration failed'));
    });
}