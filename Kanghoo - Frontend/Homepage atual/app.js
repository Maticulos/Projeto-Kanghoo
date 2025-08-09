document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica do Dropdown de Navegação ---
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownContent = document.querySelector('.nav-dropdown-content');

    dropdownToggle.addEventListener('click', (e) => {
        e.preventDefault();
        dropdownContent.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownToggle.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('visible');
        }
    });

    // --- Lógica da Seção de Eventos ---
    const eventCards = document.querySelectorAll('.event-card');
    const mainImage = document.getElementById('event-main-image');

    eventCards.forEach(card => {
        card.addEventListener('click', () => {
            eventCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const newImageSrc = card.getAttribute('data-image');
            mainImage.src = newImageSrc;
        });
    });

    // --- Lógica dos Modais de Autenticação (Corrigida e Simplificada) ---
    const authModal = document.getElementById('authModal');
    const authTitle = document.getElementById('authTitle');
    const selectionScreen = document.getElementById('selectionScreen');
    const formScreen = document.getElementById('formScreen');
    const formTitle = document.getElementById('formTitle');
    const formName = document.getElementById('formName');

    // Abre o modal de autenticação
    window.openAuthModal = function(tipo) {
        authModal.classList.remove('hidden');
        authTitle.textContent = tipo === 'login' ? 'Login' : 'Cadastro';
        selectionScreen.classList.remove('hidden');
        formScreen.classList.add('hidden');
    };

    // Fecha o modal de autenticação
    window.closeModal = function() {
        authModal.classList.add('hidden');
    };

    // Abre a tela de formulário
    window.openForm = function(tipo) {
        const acaoTexto = authTitle.textContent;
        const tipoTexto = tipo === 'escolar' ? 'Transporte Escolar' : 'Excursão';
        
        formTitle.textContent = `${acaoTexto} - ${tipoTexto}`;
        
        // Exibe ou esconde o campo de nome no cadastro
        if (acaoTexto === 'Cadastro') {
            formName.style.display = 'block';
        } else {
            formName.style.display = 'none';
        }
        
        selectionScreen.classList.add('hidden');
        formScreen.classList.remove('hidden');
    };

    // Volta para a tela de seleção
    window.backToSelection = function() {
        formScreen.classList.add('hidden');
        selectionScreen.classList.remove('hidden');
    };
});