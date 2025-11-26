document.addEventListener('DOMContentLoaded', () => {
    const planManager = {
        ui: {
            loading: document.getElementById('loading'),
            errorMessage: document.getElementById('error-message'),
            planContent: document.getElementById('plan-content'),
            currentPlanCard: document.getElementById('current-plan-card'),
            availablePlansContainer: document.getElementById('available-plans-container'),
        },

        state: {
            currentPlan: null,
            currentUsage: null,
            availablePlans: [],
        },

        init() {
            this.showLoading(true);
            this.loadData();
        },

        async loadData() {
            try {
                const token = this.getToken();
                if (!token) {
                    this.showError('Você não está autenticado. Por favor, faça o login.');
                    window.location.href = '/login.html';
                    return;
                }

                const [myPlanRes, typesRes] = await Promise.all([
                    this.fetchApi('/api/planos-assinatura/meu-plano'),
                    this.fetchApi('/api/planos-assinatura/tipos')
                ]);

                if (myPlanRes.success) {
                    this.state.currentPlan = myPlanRes.data.plano;
                    this.state.currentUsage = myPlanRes.data.uso_atual;
                } else {
                    this.showError('Não foi possível carregar seu plano atual.');
                    return;
                }

                if (typesRes.success) {
                    this.state.availablePlans = typesRes.data;
                } else {
                    this.showError('Não foi possível carregar os planos disponíveis.');
                }
                
                this.render();

            } catch (error) {
                this.showError('Ocorreu um erro ao carregar os dados do plano.');
                console.error(error);
            } finally {
                this.showLoading(false);
            }
        },

        render() {
            this.ui.planContent.style.display = 'block';
            this.renderCurrentPlan();
            this.renderAvailablePlans();
        },

        renderCurrentPlan() {
            const { plano, uso_atual } = { plano: this.state.currentPlan, uso_atual: this.state.currentUsage };
            const isUnlimitedRoutes = plano.limite_rotas === -1;
            const isUnlimitedUsers = plano.limite_usuarios === -1;

            this.ui.currentPlanCard.innerHTML = `
                <h3 class="card-title text-primary">${plano.tipo_plano.charAt(0).toUpperCase() + plano.tipo_plano.slice(1)}</h3>
                <p>Plano ativo desde: ${new Date(plano.data_inicio).toLocaleDateString()}</p>
                
                <div class="progress-bar-container">
                    <strong>Rotas:</strong> ${uso_atual.rotas_ativas} / ${isUnlimitedRoutes ? 'Ilimitado' : plano.limite_rotas}
                    ${!isUnlimitedRoutes ? this.createProgressBar(uso_atual.percentual_rotas) : ''}
                </div>
                
                <div class="progress-bar-container mt-3">
                    <strong>Crianças:</strong> ${uso_atual.total_criancas} / ${isUnlimitedUsers ? 'Ilimitado' : plano.limite_usuarios}
                     ${!isUnlimitedUsers ? this.createProgressBar(uso_atual.percentual_usuarios) : ''}
                </div>
            `;
        },

        renderAvailablePlans() {
            const hierarchy = { 'basico': 1, 'premium': 2, 'empresarial': 3 };
            const currentPlanLevel = hierarchy[this.state.currentPlan.tipo_plano];

            this.ui.availablePlansContainer.innerHTML = '';
            
            this.state.availablePlans.forEach(plan => {
                // Só mostra planos que são um upgrade
                if (hierarchy[plan.tipo] > currentPlanLevel) {
                    const card = document.createElement('div');
                    card.className = 'col-md-6';
                    card.innerHTML = `
                        <div class="plan-card">
                            <h3 class="card-title">${plan.nome}</h3>
                            <p class="price">R$ ${plan.preco_mensal.toFixed(2)}<small>/mês</small></p>
                            <p>${plan.descricao}</p>
                            <ul class="plan-features">
                                ${plan.recursos.map(feature => `<li>${feature}</li>`).join('')}
                            </ul>
                            <button class="btn btn-success btn-block" onclick="planManager.upgradePlan('${plan.tipo}')">Fazer Upgrade</button>
                        </div>
                    `;
                    this.ui.availablePlansContainer.appendChild(card);
                }
            });
        },
        
        async upgradePlan(newPlanType) {
            if (!confirm(`Tem certeza que deseja fazer o upgrade para o plano ${newPlanType}?`)) {
                return;
            }

            this.showLoading(true);
            try {
                const result = await this.fetchApi('/api/planos-assinatura/upgrade', 'PUT', { novo_tipo_plano: newPlanType });
                if (result.success) {
                    alert('Upgrade realizado com sucesso! A página será recarregada.');
                    window.location.reload();
                } else {
                    this.showError(result.message || 'Não foi possível fazer o upgrade.');
                }
            } catch (error) {
                this.showError('Ocorreu um erro ao tentar fazer o upgrade.');
                console.error(error);
            } finally {
                this.showLoading(false);
            }
        },
        
        createProgressBar(percentage) {
            let barClass = 'bg-success';
            if (percentage > 90) {
                barClass = 'bg-danger';
            } else if (percentage > 70) {
                barClass = 'bg-warning';
            }
            return `
                <div class="progress">
                    <div class="progress-bar ${barClass}" role="progressbar" style="width: ${percentage}%" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">${percentage}%</div>
                </div>
            `;
        },

        async fetchApi(endpoint, method = 'GET', body = null) {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`,
                },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(endpoint, options);
            return response.json();
        },

        getToken() {
            return localStorage.getItem('jwt_token');
        },

        showLoading(isLoading) {
            this.ui.loading.style.display = isLoading ? 'block' : 'none';
        },

        showError(message) {
            this.ui.errorMessage.textContent = message;
            this.ui.errorMessage.style.display = 'block';
            this.ui.loading.style.display = 'none';
        },
    };

    window.planManager = planManager;
    planManager.init();
});
