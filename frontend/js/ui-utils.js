/**
 * Utilitários de UI para melhorar a experiência do usuário
 * Inclui loading states, notificações e feedback visual
 */

// Sistema de notificações
class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Criar container de notificações se não existir
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };

        notification.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 16px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            position: relative;
            cursor: pointer;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>${message}</span>
                <span style="margin-left: 15px; font-size: 18px; opacity: 0.8;">&times;</span>
            </div>
        `;

        this.container.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto-remover
        const removeNotification = () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };

        // Remover ao clicar
        notification.addEventListener('click', removeNotification);

        // Auto-remover após duração especificada
        if (duration > 0) {
            setTimeout(removeNotification, duration);
        }

        return notification;
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// Sistema de Loading States
class LoadingSystem {
    constructor() {
        this.activeLoaders = new Set();
    }

    // Loading para botões
    showButtonLoading(button, text = 'Carregando...') {
        if (!button) return null;

        const originalText = button.textContent;
        const originalDisabled = button.disabled;

        button.disabled = true;
        button.style.position = 'relative';
        button.style.color = 'transparent';

        const loader = document.createElement('div');
        loader.className = 'button-loader';
        loader.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            color: white;
            font-size: 14px;
        `;

        loader.innerHTML = `
            <div style="
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            "></div>
            ${text}
        `;

        // Adicionar animação de rotação se não existir
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }

        button.appendChild(loader);

        const loaderId = Date.now() + Math.random();
        this.activeLoaders.add(loaderId);

        return {
            id: loaderId,
            stop: () => {
                if (this.activeLoaders.has(loaderId)) {
                    button.textContent = originalText;
                    button.disabled = originalDisabled;
                    button.style.color = '';
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                    this.activeLoaders.delete(loaderId);
                }
            }
        };
    }

    // Loading para formulários
    showFormLoading(form) {
        if (!form) return null;

        const overlay = document.createElement('div');
        overlay.className = 'form-loading-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            border-radius: inherit;
        `;

        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 10px;
                "></div>
                <div style="color: #666; font-size: 14px;">Processando...</div>
            </div>
        `;

        form.style.position = 'relative';
        form.appendChild(overlay);

        const loaderId = Date.now() + Math.random();
        this.activeLoaders.add(loaderId);

        return {
            id: loaderId,
            stop: () => {
                if (this.activeLoaders.has(loaderId) && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                    this.activeLoaders.delete(loaderId);
                }
            }
        };
    }

    // Loading para páginas inteiras
    showPageLoading(message = 'Carregando...') {
        const overlay = document.createElement('div');
        overlay.id = 'page-loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="
                    width: 60px;
                    height: 60px;
                    border: 6px solid #f3f3f3;
                    border-top: 6px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <div style="color: #666; font-size: 16px; font-weight: 500;">${message}</div>
            </div>
        `;

        document.body.appendChild(overlay);

        return {
            stop: () => {
                const existingOverlay = document.getElementById('page-loading-overlay');
                if (existingOverlay) {
                    existingOverlay.remove();
                }
            }
        };
    }

    // Parar todos os loadings
    stopAll() {
        this.activeLoaders.forEach(loaderId => {
            // Os loaders individuais se limpam automaticamente
        });
        this.activeLoaders.clear();

        // Remover overlay de página se existir
        const pageOverlay = document.getElementById('page-loading-overlay');
        if (pageOverlay) {
            pageOverlay.remove();
        }
    }
}

// Instâncias globais
const notifications = new NotificationSystem();
const loading = new LoadingSystem();

// Funções de conveniência globais
window.showNotification = (message, type, duration) => notifications.show(message, type, duration);
window.showSuccess = (message, duration) => notifications.success(message, duration);
window.showError = (message, duration) => notifications.error(message, duration);
window.showWarning = (message, duration) => notifications.warning(message, duration);
window.showInfo = (message, duration) => notifications.info(message, duration);

window.showButtonLoading = (button, text) => loading.showButtonLoading(button, text);
window.showFormLoading = (form) => loading.showFormLoading(form);
window.showPageLoading = (message) => loading.showPageLoading(message);
window.stopAllLoading = () => loading.stopAll();

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { notifications, loading };
}