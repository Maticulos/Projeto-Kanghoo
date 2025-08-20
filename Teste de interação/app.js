// Executa o script quando o conteúdo da página estiver totalmente carregado
document.addEventListener('DOMContentLoaded', () => {

    /**
     * FUNÇÃO DE SCROLL SUAVE
     * Adiciona um evento de clique a todos os links de navegação que apontam
     * para uma âncora (#) na mesma página, fazendo a rolagem ser suave.
     */
    const smoothScrollLinks = document.querySelectorAll('a.nav-link[href^="#"]');
    smoothScrollLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault(); // Impede o salto imediato da página
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth', // A mágica da suavização
                    block: 'start'
                });
            }
        });
    });

    /**
     * FUNÇÃO DE ANIMAÇÃO AO SCROLLAR (FADE-IN)
     * Usa a API IntersectionObserver para detectar quando uma seção entra na
     * tela e adiciona uma classe 'visible' para ativar a animação CSS.
     */
    const animatedSections = document.querySelectorAll('.animated-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Para a observação após animar uma vez
            }
        });
    }, {
        threshold: 0.15 // A animação dispara quando 15% da seção está visível
    });
    animatedSections.forEach(section => {
        observer.observe(section);
    });

    /**
     * FUNÇÃO DE INTERATIVIDADE DOS CARDS DE EVENTOS
     * Adiciona um evento de clique a cada card de evento. Ao clicar,
     * a imagem principal é trocada com um efeito de fade.
     */
    const eventCards = document.querySelectorAll('.event-card');
    const mainEventImage = document.getElementById('event-main-image');

    if (eventCards.length > 0 && mainEventImage) {
        eventCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove a classe 'active' de todos os outros cards
                eventCards.forEach(c => c.classList.remove('active'));
                // Adiciona a classe 'active' apenas no card clicado
                card.classList.add('active');

                const newImageSrc = card.getAttribute('data-image');
                
                // Efeito de fade para a troca de imagem
                mainEventImage.style.opacity = 0;
                setTimeout(() => {
                    mainEventImage.src = newImageSrc;
                    mainEventImage.style.opacity = 1;
                }, 300); // Duração da transição
            });
        });
    }

    /**
     * FUNÇÃO DO MODAL DE CADASTRO
     * Controla a abertura e o fechamento do modal que permite ao usuário
     * escolher entre os dois tipos de cadastro.
     */
    const cadastroModal = document.getElementById('cadastroModal');
    const openModalBtn = document.getElementById('btn-cadastro-modal');
    const closeModalBtn = document.getElementById('close-modal');

    if (cadastroModal && openModalBtn && closeModalBtn) {
        // Evento para abrir o modal
        openModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cadastroModal.classList.remove('hidden');
        });

        // Evento para fechar o modal no botão 'X'
        closeModalBtn.addEventListener('click', () => {
            cadastroModal.classList.add('hidden');
        });

        // Evento para fechar o modal clicando no fundo escuro
        cadastroModal.addEventListener('click', (e) => {
            if (e.target === cadastroModal) {
                cadastroModal.classList.add('hidden');
            }
        });
    }

    /**
     * ADICIONA CLASSE AO BODY NAS PÁGINAS DE FORMULÁRIO
     * Detecta se a página atual é um formulário de cadastro e adiciona uma classe
     * ao body para aplicar os estilos de centralização corretos.
     */
    if (document.querySelector('body main form')) {
        const pageTitle = document.title.toLowerCase();
        if (pageTitle.includes('cadastro') || pageTitle.includes('login')) {
            document.body.classList.add('form-page');
            const mainContainer = document.querySelector('main');
            if(mainContainer) mainContainer.classList.add('form-container');
        }
    }
});
