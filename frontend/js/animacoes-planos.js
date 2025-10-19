// Animações para a página de planos
document.addEventListener('DOMContentLoaded', function() {
    // Configuração do Intersection Observer para animações
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                
                if (target.classList.contains('plans-grid')) {
                    // Animar os cards de planos com delay escalonado
                    const planCards = target.querySelectorAll('.plan-card');
                    planCards.forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animate');
                        }, index * 200);
                    });
                }
                
                observer.unobserve(target);
            }
        });
    }, observerOptions);

    // Observar elementos para animação
    const elementsToAnimate = document.querySelectorAll('.plans-grid');
    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });

    // Animação de entrada para o cabeçalho dos planos
    const plansHeader = document.querySelector('.plans-header');
    if (plansHeader) {
        setTimeout(() => {
            plansHeader.style.opacity = '1';
            plansHeader.style.transform = 'translateY(0)';
        }, 100);
    }

    // Adicionar efeito hover melhorado para os botões
    const planButtons = document.querySelectorAll('.plan-btn');
    planButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Animação para o toggle de cobrança
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active de todos os botões
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona active ao botão clicado
            this.classList.add('active');
            
            // Adicionar efeito visual de transição
            const planCards = document.querySelectorAll('.plan-card');
            planCards.forEach(card => {
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = 'scale(1)';
                }, 150);
            });
        });
    });
});