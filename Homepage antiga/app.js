// Modal principal de login/cadastro
const authModal = document.getElementById('authModal');
const authTitle = document.getElementById('authTitle');

// Modal administrativo (eu removi ele do HTML para simplificar, mas a lógica está aqui)
const adminContent = document.getElementById('adminContent');

// Abrir modal de login ou cadastro
function openAuthModal(tipo) {
    authTitle.textContent = tipo === 'login' ? 'Login' : 'Cadastro';
    authModal.classList.remove('hidden');
    // Adicione a classe de animação se quiser
    // authModal.classList.add('fade-in'); 
}

// Fechar modal de autenticação
function closeModal() {
    authModal.classList.add('hidden');
    // Remova a classe de animação
    // authModal.classList.remove('fade-in'); 
}

// Alternar modal administrativo
function toggleAdminModal() {
    adminContent.classList.toggle('hidden');
}

// Submodal de seleção: Transporte Escolar ou Excursão
function selectType(tipo) {
    const tipoTexto = tipo === 'escolar' ? 'Transporte Escolar' : 'Excursão';

    // Criar submodal dinâmico
    const subModal = document.createElement('div');
    subModal.classList.add('modal');
    subModal.innerHTML = `
        <div class="modal-content">
            <h3>${authTitle.textContent} - ${tipoTexto}</h3>
            <input type="email" placeholder="Email" required style="width: 100%; padding: 8px; margin: 10px 0;"/>
            <input type="password" placeholder="Senha" required style="width: 100%; padding: 8px; margin: 10px 0;"/>
            ${authTitle.textContent === 'Cadastro' ? '<input type="text" placeholder="Nome completo" style="width: 100%; padding: 8px; margin: 10px 0;"/>' : ''}
            <div style="margin-top: 15px;">
                <button onclick="fecharSubModal()" style="background: #ccc; padding: 8px 12px; margin-right: 8px; border-radius: 5px;">Voltar</button>
                <button style="background: #FACC15; color: #1E3A8A; font-weight: bold; padding: 8px 12px; border: none; border-radius: 5px;">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(subModal);
}

// Fecha submodal criado dinamicamente
function fecharSubModal() {
    const modais = document.querySelectorAll('.modal');
    if (modais.length > 1) {
        document.body.removeChild(modais[modais.length - 1]);
    }
}

// Animação de fade-in nos modais
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .fade-in {
            animation: fadeIn 0.3s ease-out forwards;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
});

// Adicionar a lógica para os eventos
document.addEventListener('DOMContentLoaded', () => {
    // ... (Seu código DOMContentLoaded anterior, se houver) ...
    
    const eventCards = document.querySelectorAll('.events-list .event-card');
    const eventMainImage = document.getElementById('event-main-image');

    eventCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove a classe 'active' de todos os cards
            eventCards.forEach(c => c.classList.remove('active'));

            // Adiciona a classe 'active' ao card clicado
            card.classList.add('active');

            // Obtém a URL da imagem do atributo data-image
            const newImageSrc = card.getAttribute('data-image');

            // Atualiza a imagem principal
            // Adiciona um fade-out e depois um fade-in para a transição
            eventMainImage.style.opacity = 0;
            setTimeout(() => {
                eventMainImage.src = newImageSrc;
                eventMainImage.style.opacity = 1;
            }, 300); // Tempo da transição
        });
    });

});

document.addEventListener('DOMContentLoaded', () => {
    // ... (Seu código DOMContentLoaded anterior) ...

    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownContent = document.querySelector('.nav-dropdown-content');

    dropdownToggle.addEventListener('click', (e) => {
        e.preventDefault(); // Impede o link de navegar

        // Alterna a classe 'visible' para mostrar/esconder o modal
        dropdownContent.classList.toggle('visible');
    });

    // Opcional: esconder o modal quando o usuário clica fora dele
    document.addEventListener('click', (e) => {
        if (!dropdownToggle.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('visible');
        }
    });
});