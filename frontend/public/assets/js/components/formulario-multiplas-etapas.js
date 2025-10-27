class MultiStepForm {
    constructor(formId, steps) {
        this.form = document.getElementById(formId);
        this.steps = steps;
        this.currentStep = 0;
        this.totalSteps = steps.length;
        
        this.init();
    }

    // Função de sanitização para prevenir XSS
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Criar elemento de forma segura
    createSafeElement(tag, textContent = '', className = '') {
        const element = document.createElement(tag);
        if (textContent) element.textContent = textContent;
        if (className) element.className = className;
        return element;
    }
    
    init() {
        this.createProgressBar();
        this.setupSteps();
        this.setupNavigation();
        this.setupKeyboardNavigation();
        this.showStep(0);
        this.updateProgress();
    }
    
    createProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressLine = document.createElement('div');
        progressLine.className = 'progress-line';
        
        const progressLineFill = document.createElement('div');
        progressLineFill.className = 'progress-line-fill';
        progressLine.appendChild(progressLineFill);
        
        progressBar.appendChild(progressLine);
        
        // Create step indicators
        this.steps.forEach((step, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'step-indicator';
            indicator.textContent = index + 1;
            indicator.addEventListener('click', () => this.goToStep(index));
            progressBar.appendChild(indicator);
        });
        
        progressContainer.appendChild(progressBar);
        
        // Create step labels
        const stepLabels = document.createElement('div');
        stepLabels.className = 'step-labels';
        
        this.steps.forEach(step => {
            const label = document.createElement('div');
            label.className = 'step-label';
            label.textContent = step.title;
            stepLabels.appendChild(label);
        });
        
        progressContainer.appendChild(stepLabels);
        
        // Insert before form
        this.form.parentNode.insertBefore(progressContainer, this.form);
    }
    
    setupSteps() {
        this.steps.forEach((step, index) => {
            const stepElement = document.querySelector(step.selector);
            if (stepElement) {
                stepElement.classList.add('form-step');
                stepElement.setAttribute('data-step', index);
                
                // Salvar conteúdo original
                const originalContent = Array.from(stepElement.children);
                
                // Limpar elemento
                stepElement.innerHTML = '';
                
                // Criar wrapper seguro
                const stepContent = this.createSafeElement('div', '', 'step-content');
                
                // Criar título
                const title = this.createSafeElement('h2', step.title, 'step-title');
                stepContent.appendChild(title);
                
                // Criar descrição
                const description = this.createSafeElement('p', step.description, 'step-description');
                stepContent.appendChild(description);
                
                // Adicionar conteúdo original
                originalContent.forEach(child => stepContent.appendChild(child));
                
                // Criar navegação
                const navigation = this.createSafeElement('div', '', 'step-navigation');
                
                // Botão anterior
                const prevBtn = this.createSafeElement('button', '← Anterior', 'btn-step btn-prev');
                prevBtn.type = 'button';
                if (index === 0) prevBtn.style.visibility = 'hidden';
                navigation.appendChild(prevBtn);
                
                // Botão próximo
                const nextBtnText = index === this.totalSteps - 1 ? 'Finalizar' : 'Próximo →';
                const nextBtn = this.createSafeElement('button', nextBtnText, 'btn-step btn-next');
                nextBtn.type = 'button';
                navigation.appendChild(nextBtn);
                
                stepContent.appendChild(navigation);
                stepElement.appendChild(stepContent);
            }
        });
    }
    
    setupNavigation() {
        this.form.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-next')) {
                e.preventDefault();
                this.nextStep();
            } else if (e.target.classList.contains('btn-prev')) {
                e.preventDefault();
                this.prevStep();
            } else if (e.target.classList.contains('btn-submit')) {
                e.preventDefault();
                this.submitForm();
            }
        });
        
        // Adicionar listeners para atualizar progresso em tempo real
        this.form.addEventListener('input', () => {
            // Debounce para evitar muitas atualizações
            clearTimeout(this.progressUpdateTimeout);
            this.progressUpdateTimeout = setTimeout(() => {
                this.updateProgressDetails();
            }, 300);
        });
        
        this.form.addEventListener('change', () => {
            this.updateProgressDetails();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nextStep();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.prevStep();
                }
            }
        });
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard navigation if focus is within the form
            if (!this.form.contains(document.activeElement)) return;
            
            switch(e.key) {
                case 'ArrowRight':
                case 'PageDown':
                    e.preventDefault();
                    this.nextStep();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.prevStep();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.showStep(0, this.currentStep > 0 ? 'backward' : 'forward');
                    break;
                case 'End':
                    e.preventDefault();
                    const lastStep = this.totalSteps - 1;
                    this.showStep(lastStep, this.currentStep < lastStep ? 'forward' : 'backward');
                    break;
            }
        });
    }
    
    showStep(stepIndex, direction = 'forward') {
        const steps = document.querySelectorAll('.form-step');
        const currentStepElement = steps[this.currentStep];
        const nextStepElement = steps[stepIndex];
        
        // Hide current step with animation
        if (currentStepElement && this.currentStep !== stepIndex) {
            currentStepElement.classList.remove('active');
            currentStepElement.classList.add(direction === 'forward' ? 'next' : 'prev');
            
            setTimeout(() => {
                currentStepElement.style.display = 'none';
                currentStepElement.classList.remove('next', 'prev');
            }, 400);
        }
        
        // Show new step with animation
        if (nextStepElement) {
            nextStepElement.style.display = 'block';
            nextStepElement.classList.remove('next', 'prev');
            
            // Add appropriate entering animation class
            if (direction === 'forward') {
                nextStepElement.classList.add('active');
            } else {
                nextStepElement.classList.add('active', 'entering-left');
            }
            
            // Remove entering animation class after animation completes
            setTimeout(() => {
                nextStepElement.classList.remove('entering-left');
            }, 800);
        }
        
        this.currentStep = stepIndex;
        this.updateProgress();
        this.updateStepIndicators();
        this.scrollToTop();
        
        // Add subtle page vibration effect
        this.addPageTransitionEffect();
    }
    
    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps - 1) {
                this.showStep(this.currentStep + 1, 'forward');
            }
        }
    }
    
    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1, 'backward');
        }
    }
    
    goToStep(stepIndex) {
        // Only allow going to previous steps or next step if current is valid
        if (stepIndex <= this.currentStep || 
            (stepIndex === this.currentStep + 1 && this.validateCurrentStep())) {
            this.showStep(stepIndex);
        }
    }
    
    updateProgress() {
        const progressFill = document.querySelector('.progress-line-fill');
        const percentage = (this.currentStep / (this.totalSteps - 1)) * 100;
        
        // Animate progress bar with custom CSS variable
        progressFill.style.setProperty('--target-width', `${percentage}%`);
        progressFill.style.animation = 'progressFill 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        
        setTimeout(() => {
            progressFill.style.width = `${percentage}%`;
            progressFill.style.animation = '';
        }, 800);
        
        // Atualizar informações detalhadas da barra de progresso
        this.updateProgressDetails();
    }
    
    updateProgressDetails() {
        // Criar ou atualizar container de detalhes do progresso
        let progressDetails = document.querySelector('.progress-details');
        if (!progressDetails) {
            progressDetails = document.createElement('div');
            progressDetails.className = 'progress-details';
            
            const progressContainer = document.querySelector('.progress-container');
            progressContainer.appendChild(progressDetails);
        }
        
        // Calcular estatísticas
        const currentStepInfo = this.steps[this.currentStep];
        const completedSteps = this.currentStep;
        const remainingSteps = this.totalSteps - this.currentStep - 1;
        const progressPercentage = Math.round((this.currentStep / (this.totalSteps - 1)) * 100);
        
        // Validar campos do passo atual
        const currentStepElement = document.querySelector(`[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepElement ? currentStepElement.querySelectorAll('[required]') : [];
        const filledFields = Array.from(requiredFields).filter(field => {
            if (field.type === 'checkbox' || field.type === 'radio') {
                return field.checked;
            }
            return field.value.trim() !== '';
        });
        
        const fieldCompletionPercentage = requiredFields.length > 0 ? 
            Math.round((filledFields.length / requiredFields.length) * 100) : 100;
        
        // Criar HTML dos detalhes
        progressDetails.innerHTML = `
            <div class="progress-info">
                <div class="progress-main-info">
                    <div class="current-step-info">
                        <span class="step-number">${this.currentStep + 1}</span>
                        <span class="step-title">${currentStepInfo.title}</span>
                        <span class="step-percentage">${progressPercentage}%</span>
                    </div>
                    <div class="step-description">
                        ${currentStepInfo.description}
                    </div>
                </div>
                
                <div class="progress-stats">
                    <div class="stat-item">
                        <span class="stat-icon">✅</span>
                        <span class="stat-label">Concluídos</span>
                        <span class="stat-value">${completedSteps}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">📝</span>
                        <span class="stat-label">Atual</span>
                        <span class="stat-value">1</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">⏳</span>
                        <span class="stat-label">Restantes</span>
                        <span class="stat-value">${remainingSteps}</span>
                    </div>
                </div>
                
                <div class="field-completion">
                    <div class="field-completion-header">
                        <span class="field-completion-label">Campos obrigatórios</span>
                        <span class="field-completion-percentage">${filledFields.length}/${requiredFields.length} (${fieldCompletionPercentage}%)</span>
                    </div>
                    <div class="field-completion-bar">
                        <div class="field-completion-fill" style="width: ${fieldCompletionPercentage}%"></div>
                    </div>
                </div>
                
                ${this.getStepValidationStatus()}
            </div>
        `;
        
        // Adicionar animação de entrada
        progressDetails.style.opacity = '0';
        progressDetails.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            progressDetails.style.transition = 'all 0.3s ease';
            progressDetails.style.opacity = '1';
            progressDetails.style.transform = 'translateY(0)';
        }, 100);
    }
    
    getStepValidationStatus() {
        const currentStepElement = document.querySelector(`[data-step="${this.currentStep}"]`);
        if (!currentStepElement) return '';
        
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        const errors = [];
        
        requiredFields.forEach(field => {
            const isEmpty = field.type === 'checkbox' || field.type === 'radio' ? 
                !field.checked : field.value.trim() === '';
            
            if (isEmpty) {
                const label = this.getFieldLabel(field);
                errors.push(label || field.name || 'Campo obrigatório');
            }
        });
        
        if (errors.length === 0) {
            return `
                <div class="validation-status success">
                    <span class="validation-icon">✅</span>
                    <span class="validation-message">Todos os campos obrigatórios preenchidos</span>
                </div>
            `;
        } else {
            return `
                <div class="validation-status warning">
                    <span class="validation-icon">⚠️</span>
                    <span class="validation-message">Campos pendentes: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? '...' : ''}</span>
                </div>
            `;
        }
    }
    
    getFieldLabel(field) {
        // Tentar encontrar label associado
        if (field.id) {
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label) return label.textContent.replace('*', '').trim();
        }
        
        // Tentar encontrar label pai
        const parentLabel = field.closest('label');
        if (parentLabel) return parentLabel.textContent.replace('*', '').trim();
        
        // Usar placeholder ou name
        return field.placeholder || field.name || 'Campo';
    }
    
    addPageTransitionEffect() {
        // Add subtle page transition effect
        const container = document.querySelector('.multi-step-container');
        if (container) {
            container.style.transform = 'scale(0.98)';
            container.style.transition = 'transform 0.2s ease-out';
            
            setTimeout(() => {
                container.style.transform = 'scale(1)';
                setTimeout(() => {
                    container.style.transition = '';
                }, 200);
            }, 100);
        }
    }
    
    updateStepIndicators() {
        const indicators = document.querySelectorAll('.step-indicator');
        const labels = document.querySelectorAll('.step-label');
        
        indicators.forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');
            labels[index].classList.remove('active', 'completed');
            
            if (index < this.currentStep) {
                indicator.classList.add('completed');
                labels[index].classList.add('completed');
                indicator.textContent = '';
            } else if (index === this.currentStep) {
                indicator.classList.add('active');
                labels[index].classList.add('active');
                indicator.textContent = index + 1;
            } else {
                indicator.textContent = index + 1;
            }
        });
    }
    
    validateCurrentStep() {
        const currentStepElement = document.querySelector(`[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'Este campo é obrigatório');
                isValid = false;
            } else {
                this.clearFieldError(field);
                
                // Additional validations
                if (field.type === 'email' && !this.isValidEmail(field.value)) {
                    this.showFieldError(field, 'Digite um e-mail válido');
                    isValid = false;
                }
                
                if (field.name === 'confirmaSenha') {
                    const senhaField = document.getElementById('senha');
                    if (senhaField && field.value !== senhaField.value) {
                        this.showFieldError(field, 'As senhas não coincidem');
                        isValid = false;
                    }
                }
            }
        });
        
        // Check terms acceptance on last step
        if (this.currentStep === this.totalSteps - 1) {
            const termsCheckbox = document.getElementById('termosUso');
            if (termsCheckbox && !termsCheckbox.checked) {
                this.showFieldError(termsCheckbox, 'Você deve aceitar os termos de uso');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.style.borderColor = '#e74c3c';
        field.style.background = '#fdf2f2';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = `
            color: #e74c3c;
            font-size: 0.85rem;
            margin-top: 0.25rem;
            animation: fadeIn 0.3s ease;
        `;
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
        
        // Add shake animation
        field.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            field.style.animation = '';
        }, 500);
    }
    
    clearFieldError(field) {
        field.style.borderColor = '';
        field.style.background = '';
        
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    showLoading() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay active';
        
        const spinner = this.createSafeElement('div', '', 'loading-spinner');
        loadingOverlay.appendChild(spinner);
        
        document.body.appendChild(loadingOverlay);
        return loadingOverlay;
    }
    
    hideLoading(loadingOverlay) {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            setTimeout(() => {
                loadingOverlay.remove();
            }, 300);
        }
    }
    
    async submitForm() {
        if (!this.validateCurrentStep()) {
            return;
        }
        
        const loadingOverlay = this.showLoading();
        
        try {
            // Get form data - mantém FormData para suportar upload de arquivos
            const formData = new FormData(this.form);
            
            // Submit to server - sem Content-Type para permitir multipart/form-data
            const response = await fetch('/cadastrar', {
                method: 'POST',
                body: formData // Envia FormData diretamente
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Ocorreu um erro.');
            }
            
            // Success animation
            this.showSuccessMessage();
            
            setTimeout(() => {
                window.location.href = '../auth/login.html';
            }, 2000);
            
        } catch (error) {
            this.showErrorMessage(`Erro no cadastro: ${error.message}`);
        } finally {
            this.hideLoading(loadingOverlay);
        }
    }
    
    showSuccessMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 2rem 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(76, 175, 80, 0.3);
            z-index: 10000;
            text-align: center;
            font-size: 1.1rem;
            font-weight: 600;
            animation: successPulse 0.6s ease;
        `;
        message.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">✓</div>
            Cadastro realizado com sucesso!<br>
            <small style="opacity: 0.9;">Redirecionando para o login...</small>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 2000);
    }
    
    showErrorMessage(text) {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(231, 76, 60, 0.3);
            z-index: 10000;
            font-weight: 500;
            animation: slideInRight 0.4s ease;
        `;
        message.textContent = text;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => {
                message.remove();
            }, 400);
        }, 4000);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes successPulse {
        0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.05); }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);