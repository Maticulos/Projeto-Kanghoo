/**
 * Utilitários de Interface do Usuário
 * Funções para feedback visual, loading states e notificações
 */

/**
 * Mostra estado de loading em um botão
 * @param {HTMLElement} button - O botão para mostrar loading
 * @param {string} loadingText - Texto a ser exibido durante o loading
 * @returns {Object} Objeto com método stop() para parar o loading
 */
function showButtonLoading(button, loadingText = 'Carregando...') {
    if (!button) return { stop: () => {} };
    
    const originalText = button.textContent;
    const originalDisabled = button.disabled;
    
    button.textContent = loadingText;
    button.disabled = true;
    button.classList.add('loading');
    
    return {
        stop: () => {
            button.textContent = originalText;
            button.disabled = originalDisabled;
            button.classList.remove('loading');
        }
    };
}

/**
 * Mostra notificação de sucesso
 * @param {string} message - Mensagem de sucesso
 * @param {number} duration - Duração em milissegundos (padrão: 3000)
 */
function showSuccess(message, duration = 3000) {
    showNotification(message, 'success', duration);
}

/**
 * Mostra notificação de erro
 * @param {string} message - Mensagem de erro
 * @param {number} duration - Duração em milissegundos (padrão: 5000)
 */
function showError(message, duration = 5000) {
    showNotification(message, 'error', duration);
}

/**
 * Mostra notificação de informação
 * @param {string} message - Mensagem informativa
 * @param {number} duration - Duração em milissegundos (padrão: 3000)
 */
function showInfo(message, duration = 3000) {
    showNotification(message, 'info', duration);
}

/**
 * Mostra notificação de aviso
 * @param {string} message - Mensagem de aviso
 * @param {number} duration - Duração em milissegundos (padrão: 4000)
 */
function showWarning(message, duration = 4000) {
    showNotification(message, 'warning', duration);
}

/**
 * Função base para mostrar notificações
 * @param {string} message - Mensagem da notificação
 * @param {string} type - Tipo da notificação (success, error, info, warning)
 * @param {number} duration - Duração em milissegundos
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Cria o elemento da notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Adiciona estilos inline se não existirem
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 500px;
                padding: 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: slideInRight 0.3s ease-out;
            }
            
            .notification-success {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            
            .notification-error {
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }
            
            .notification-info {
                background-color: #d1ecf1;
                border: 1px solid #bee5eb;
                color: #0c5460;
            }
            
            .notification-warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .notification-icon {
                font-size: 18px;
                font-weight: bold;
            }
            
            .notification-message {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Adiciona ao DOM
    document.body.appendChild(notification);
    
    // Remove automaticamente após a duração especificada
    if (duration > 0) {
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
}

/**
 * Retorna o ícone apropriado para cada tipo de notificação
 * @param {string} type - Tipo da notificação
 * @returns {string} Ícone em formato de emoji ou símbolo
 */
function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return '✓';
        case 'error':
            return '✕';
        case 'warning':
            return '⚠';
        case 'info':
        default:
            return 'ℹ';
    }
}

/**
 * Utilitário para validação de formulários
 * @param {HTMLFormElement} form - Formulário a ser validado
 * @returns {boolean} True se válido, false caso contrário
 */
function validateForm(form) {
    if (!form) return false;
    
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });
    
    return isValid;
}

/**
 * Utilitário para limpar formulários
 * @param {HTMLFormElement} form - Formulário a ser limpo
 */
function clearForm(form) {
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type !== 'submit' && input.type !== 'button') {
            input.value = '';
            input.classList.remove('error');
        }
    });
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
    window.showButtonLoading = showButtonLoading;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showInfo = showInfo;
    window.showWarning = showWarning;
    window.showNotification = showNotification;
    window.validateForm = validateForm;
    window.clearForm = clearForm;
}