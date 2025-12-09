const CepService = {
    init: function() {
        const cepInputs = document.querySelectorAll('input[name="cep"], input[id="cep"], input[name="cepEmpresa"]');
        cepInputs.forEach(input => {
            input.addEventListener('blur', this.handleBlur.bind(this));
            input.addEventListener('input', this.maskCep);
        });
    },

    maskCep: function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        }
        e.target.value = value;
    },

    handleBlur: async function(e) {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            // Mostrar loading
            const loadingNotification = this.showLoading('Buscando endereço...');
            
            try {
                const form = e.target.closest('form');
                // Determine prefix (e.g. for empresa fields)
                const isEmpresa = e.target.name === 'cepEmpresa';
                
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                
                loadingNotification.remove();

                if (!data.erro) {
                    this.fillAddress(form, data, isEmpresa);
                    this.showSuccess('Endereço encontrado!');
                } else {
                    this.showError('CEP não encontrado.');
                }
            } catch (error) {
                loadingNotification.remove();
                console.error('Erro ao buscar CEP:', error);
                this.showError('Erro ao buscar CEP. Tente novamente.');
            }
        }
    },

    showLoading: function(message) {
        // Se existir ui-utils.js, usar showInfo, senão criar elemento simples
        if (typeof showInfo === 'function') {
            // Criar notificação persistente até remover
            const notification = document.createElement('div');
            notification.className = 'notification notification-info';
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-icon">⏳</span>
                    <span class="notification-message">${message}</span>
                </div>
            `;
            document.body.appendChild(notification);
            return notification;
        } else {
            // Fallback simples
            const div = document.createElement('div');
            div.style.cssText = 'position:fixed;top:20px;right:20px;background:#2196F3;color:white;padding:15px;border-radius:4px;z-index:9999;box-shadow:0 2px 5px rgba(0,0,0,0.2);';
            div.textContent = message;
            document.body.appendChild(div);
            return div;
        }
    },

    showSuccess: function(message) {
        if (typeof showSuccess === 'function') {
            showSuccess(message);
        } else {
            const div = document.createElement('div');
            div.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:15px;border-radius:4px;z-index:9999;box-shadow:0 2px 5px rgba(0,0,0,0.2);';
            div.textContent = message;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 3000);
        }
    },

    showError: function(message) {
        if (typeof showError === 'function') {
            showError(message);
        } else {
            const div = document.createElement('div');
            div.style.cssText = 'position:fixed;top:20px;right:20px;background:#F44336;color:white;padding:15px;border-radius:4px;z-index:9999;box-shadow:0 2px 5px rgba(0,0,0,0.2);';
            div.textContent = message;
            document.body.appendChild(div);
            setTimeout(() => div.remove(), 3000);
        }
    },

    fillAddress: function(form, data, isEmpresa = false) {
        const suffix = isEmpresa ? 'Empresa' : '';
        
        const mapping = {
            [`rua${suffix}`]: data.logradouro,
            [`bairro${suffix}`]: data.bairro,
            [`cidade${suffix}`]: data.localidade,
            [`estado${suffix}`]: data.uf
        };

        for (const [name, value] of Object.entries(mapping)) {
            const input = form.querySelector(`[name="${name}"], [id="${name}"]`);
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event('change'));
                input.dispatchEvent(new Event('input'));
            }
        }
        
        const numeroInput = form.querySelector(`[name="numero${suffix}"], [id="numero${suffix}"]`);
        if (numeroInput) numeroInput.focus();
    }
};

document.addEventListener('DOMContentLoaded', () => CepService.init());

// Fallback caso o DOMContentLoaded já tenha ocorrido
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    CepService.init();
}
