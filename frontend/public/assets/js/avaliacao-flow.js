/**
 * Sistema de Avaliação - Kanghoo
 * Gerencia o fluxo de avaliações pendentes e modal de feedback
 */

const AvaliacaoFlow = {
    init: async () => {
        // Injeta CSS e HTML do modal se não existir
        if (!document.getElementById('avaliacao-modal')) {
            AvaliacaoFlow.injectModal();
        }
        
        // Verifica avaliações pendentes
        await AvaliacaoFlow.checkPending();
    },

    injectModal: () => {
        const css = `
            .avaliacao-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            .avaliacao-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .avaliacao-modal {
                background: white;
                padding: 2rem;
                border-radius: 16px;
                width: 90%;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                transform: translateY(20px);
                transition: transform 0.3s ease;
            }
            .avaliacao-modal-overlay.active .avaliacao-modal {
                transform: translateY(0);
            }
            .star-rating {
                display: flex;
                justify-content: center;
                gap: 10px;
                margin: 1.5rem 0;
                flex-direction: row-reverse;
            }
            .star-rating input {
                display: none;
            }
            .star-rating label {
                font-size: 2rem;
                color: #ddd;
                cursor: pointer;
                transition: color 0.2s;
            }
            .star-rating input:checked ~ label,
            .star-rating label:hover,
            .star-rating label:hover ~ label {
                color: #FFD700;
            }
            .avaliacao-textarea {
                width: 100%;
                padding: 1rem;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin-bottom: 1rem;
                resize: vertical;
                font-family: inherit;
            }
            .avaliacao-btn {
                background: var(--primary-color, #004AAD);
                color: white;
                border: none;
                padding: 0.8rem 2rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
            }
            .avaliacao-btn:hover {
                opacity: 0.9;
            }
            .avaliacao-skip {
                margin-top: 1rem;
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                text-decoration: underline;
            }
        `;

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        const html = `
            <div id="avaliacao-modal" class="avaliacao-modal-overlay">
                <div class="avaliacao-modal">
                    <h2 style="margin-bottom: 0.5rem;">Como foi sua viagem?</h2>
                    <p id="avaliacao-subtitle" style="color: #666; margin-bottom: 1rem;">Avalie sua experiência com a excursão</p>
                    
                    <form id="avaliacao-form">
                        <input type="hidden" id="avaliacao-excursao-id">
                        <input type="hidden" id="avaliacao-motorista-id">
                        
                        <div class="star-rating">
                            <input type="radio" id="star5" name="nota" value="5"><label for="star5">★</label>
                            <input type="radio" id="star4" name="nota" value="4"><label for="star4">★</label>
                            <input type="radio" id="star3" name="nota" value="3"><label for="star3">★</label>
                            <input type="radio" id="star2" name="nota" value="2"><label for="star2">★</label>
                            <input type="radio" id="star1" name="nota" value="1"><label for="star1">★</label>
                        </div>

                        <textarea class="avaliacao-textarea" name="comentario" rows="4" placeholder="Conte mais sobre sua experiência (opcional)..."></textarea>
                        
                        <button type="submit" class="avaliacao-btn">Enviar Avaliação</button>
                        <button type="button" class="avaliacao-skip" onclick="AvaliacaoFlow.close()">Avaliar depois</button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('avaliacao-form').addEventListener('submit', AvaliacaoFlow.submit);
    },

    checkPending: async () => {
        try {
            const token = localStorage.getItem('authToken');
            // Se não tiver token, não faz a requisição e evita erro 401
            if (!token) return;

            const response = await fetch('/api/avaliacoes/pendentes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401) {
                // Token inválido ou expirado
                localStorage.removeItem('authToken');
                return;
            }

            const data = await response.json();
            
            if (data.success && data.data && data.data.length > 0) {
                // Pega a primeira pendente
                const pendente = data.data[0];
                AvaliacaoFlow.open(pendente);
            }
        } catch (error) {
            // Silenciar erros de rede ou parse para não poluir console
            // console.error('Erro ao verificar avaliações:', error);
        }
    },

    open: (excursao) => {
        const modal = document.getElementById('avaliacao-modal');
        document.getElementById('avaliacao-subtitle').textContent = `Avalie sua viagem para: ${excursao.destino}`;
        document.getElementById('avaliacao-excursao-id').value = excursao.pacote_id;
        document.getElementById('avaliacao-motorista-id').value = excursao.motorista_id;
        
        modal.classList.add('active');
    },

    close: () => {
        document.getElementById('avaliacao-modal').classList.remove('active');
    },

    submit: async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const nota = formData.get('nota');
        
        if (!nota) {
            alert('Por favor, selecione uma nota de 1 a 5 estrelas.');
            return;
        }

        const payload = {
            pacote_id: document.getElementById('avaliacao-excursao-id').value,
            avaliado_id: document.getElementById('avaliacao-motorista-id').value,
            nota: parseInt(nota),
            comentario: formData.get('comentario')
        };

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/avaliacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });            const data = await response.json();

            if (data.success) {
                alert('Obrigado pela sua avaliação!');
                AvaliacaoFlow.close();
                // Verifica se tem mais
                AvaliacaoFlow.checkPending();
            } else {
                alert(data.message || 'Erro ao enviar avaliação');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao enviar avaliação');
        }
    }
};

// Auto-init se estiver logado
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('authToken')) {
        AvaliacaoFlow.init();
    }
});
