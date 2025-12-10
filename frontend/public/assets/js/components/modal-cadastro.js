(function() {
    // HTML do Modal
    const modalHTML = `
    <div id="cadastroModal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title" style="z-index: 9999;">
        <div class="modal-content">
            <button class="close-modal-btn" id="close-modal" aria-label="Fechar modal">&times;</button>
            <h3 id="modal-title">Qual tipo de cadastro?</h3>
            <p>Escolha a opção que melhor descreve seu serviço para começar.</p>
            <div class="modal-options" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem;">
                <a href="/cadastro-usuario.html" class="btn btn-primary" style="background-color: #28a745; width: 100%; text-align: center;">Sou Passageiro</a>
                <a href="/cadastro-escolar.html" class="btn btn-primary" style="width: 100%; text-align: center;">Transporte Escolar</a>
                <a href="/cadastro-excursao.html" class="btn btn-blue" style="width: 100%; text-align: center;">Excursão e Fretamento</a>
            </div>
            <div class="modal-footer" style="margin-top: 1.5rem; font-size: 0.9rem;">
                <p>Não tem certeza? <a href="/contato.html">Fale conosco</a></p>
            </div>
        </div>
    </div>
    `;

    // Função para inicializar o modal
    function initModal() {
        // Verifica se o modal já existe
        if (!document.getElementById('cadastroModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const modal = document.getElementById('cadastroModal');
        const closeBtn = document.getElementById('close-modal');
        // Seleciona tanto por ID quanto por classe para flexibilidade
        const openBtns = document.querySelectorAll('#btn-cadastro-modal, .btn-cadastro-modal-trigger');

        // Função para abrir
        function openModal(e) {
            if(e) e.preventDefault();
            modal.classList.remove('hidden');
            modal.classList.add('modal-open');
            document.body.style.overflow = 'hidden'; // Previne scroll no body
        }

        // Função para fechar
        function closeModal() {
            modal.classList.add('hidden');
            modal.classList.remove('modal-open');
            document.body.style.overflow = '';
        }

        // Event Listeners
        openBtns.forEach(btn => {
            // Remove listeners antigos para evitar duplicação se o script rodar 2x
            btn.removeEventListener('click', openModal);
            btn.addEventListener('click', openModal);
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // Fechar ao clicar fora
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModal);
    } else {
        initModal();
    }
})();
